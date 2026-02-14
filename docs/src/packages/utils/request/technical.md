---
title: request
outline: [2, 3]
---

# @breeze/utils/request

## 设计目标

- **封装通用请求拦截器**
- **封装通用响应拦截器**
- **业务侧零配置**：只需传 `actionName + content` 和少量开关，底层协议对业务层完全透明
- **可组合增强器**：loading、提示、缓存、重试等能力以增强器形式提供，通过开关按需组合
- **UI 框架无关**：增强器通过 `EnhancerContext` 注入 UI 能力，不依赖具体 UI 库

## 架构概览

<script setup>
import drawioXml from './request-architecture.drawio?raw'
</script>

<ClientOnly>
  <DrawioViewer :data="drawioXml" />
</ClientOnly>

## 目录结构

```
packages/utils/src/request/
├── index.ts                         # 统一导出
├── constants.ts                     # 常量/枚举定义
├── interceptors.ts                  # 请求/响应拦截器
├── types/
│   ├── index.ts                     # 类型统一导出
│   ├── common.ts                    # 通用类型
│   └── enhancer.ts                  # 增强器相关类型
└── enhancers/
    ├── index.ts                     # 增强器统一导出
    ├── compose.ts                   # 增强器组合器
    ├── withLoading.ts               # Loading
    ├── withCache.ts                 # 缓存（多策略）
    ├── withErrorMessage.ts          # 失败提示
    ├── withSuccessMessage.ts        # 成功提示
    ├── withRetry.ts                 # 重试
    ├── withRawResponse.ts           # 数据提取（默认提取 data 字段）
    └── cacheStrategies/             # 缓存策略
        ├── index.ts                 # 策略统一导出
        ├── CacheStrategy.ts         # 策略接口定义
        ├── MemoryCacheStrategy.ts   # 内存缓存
        ├── LRUCacheStrategy.ts      # LRU 缓存
        ├── ForceRefreshStrategy.ts  # 强制刷新（跳过缓存，更新已有条目）
        ├── resolveStrategy.ts       # 策略解析（配置 → 策略实例）
        └── utils.ts                 # 缓存键生成、缓存清理
```

## Axios 拦截器实现

### createRequestInterceptor - 请求协议适配

**核心行为**：

```typescript [packages/utils/src/request/interceptors.ts]
/** 请求拦截器配置选项 */
interface RequestInterceptorOptions {
  getAuthToken: () => string // 获取 Token（必需）
  systemCode?: string // 系统码（可选，默认 'oms_crm'）
  getIsGray?: () => boolean // 灰度判定（可选）
  grayDir?: string // 灰度目录前缀（可选，默认 '/new'）
}

/** 创建请求拦截器 */
export const createRequestInterceptor = (
  options: RequestInterceptorOptions,
) => {
  return (config: InternalAxiosRequestConfig) => {
    const token = options.getAuthToken()
    const isGray = options.getIsGray?.() ?? defaultIsGray
    const grayDir = options.grayDir ?? defaultGrayDir
    const data = (config.data ?? {}) as RequestData

    // 1. 注入 token 到请求头
    config.headers.set('crm-token', token) // [!code highlight]

    // 2. 改写 URL：${grayDir}${url}?_name=${actionName}
    config.url = `${grayDir}${config.url}?_name=${data.actionName}` // [!code highlight]

    // 3. 改写请求体
    config.data = {
      clientIsGray: isGray ? 1 : 0, // 灰度标识
      token,
      systemCode: options.systemCode ?? 'oms_crm',
      content: {}, // 默认补齐
      ...data,
    }

    return config
  }
}
```

:::info 设计决策
| 决策 | 原因 |
| -------------------------- | -------------------------------- |
| token 同时放请求头和请求体 | 兼容后端双重校验机制 |
:::

### createResponseInterceptor - 响应业务语义收敛

响应结构：

```typescript [packages/utils/src/request/types/common.ts]
interface ApiResponse<T = unknown> {
  status: number // 业务状态码
  msg: string | null // 响应消息
  data: T // 响应数据
}
```

**核心行为**：

```typescript [packages/utils/src/request/interceptors.ts]
/** 响应拦截器配置选项 */
interface ResponseInterceptorOptions {
  onLoginExpired?: (data: ApiResponse) => void // 登录失效回调
  successStatus?: number // 成功状态码（默认 1）
}

export const createResponseInterceptor = (
  options: ResponseInterceptorOptions = {},
) => {
  // 拦截器会将 AxiosResponse 转换为 ApiResponse，类型断言在此处理
  // 业务层无需再进行类型断言
  const interceptor = (response: AxiosResponse) => {
    // 1. 非 JSON 响应直接透传（文件下载、文本流等场景）
    // responseType 为 undefined 或 'json' 时才按业务协议解析
    const { responseType } = response.config // [!code highlight]
    if (responseType && responseType !== 'json') return response // [!code highlight]

    const data = response.data as ApiResponse
    const successStatus = options.successStatus ?? RES_STATUS.SUCCESS

    // 2. 登录失效检测
    if (
      data.status === RES_STATUS.NO_LOGIN || // [!code highlight]
      data.status === RES_STATUS.LOGIN_EXPIRED // [!code highlight]
    ) {
      options.onLoginExpired?.(data) // [!code highlight]
      return Promise.reject(data) // [!code highlight]
    }

    // 3. 业务失败检测
    if (data.status !== successStatus) {
      return Promise.reject(data)
    }

    // 4. 业务成功
    return data
  }

  return interceptor
}
```

:::info 设计决策
| 决策 | 原因 |
| --------------------- | ----------------------------------------------------------------- |
| 非 JSON 响应直接透传 | 只有 `responseType` 为 `'json'` 或未设置时 `data` 才是 JSON 对象，其他类型（blob、arraybuffer、text 等）强行按业务协议解析会误判为错误 |
| 业务失败转 reject | 让调用方用 catch 处理，增强器可统一捕获 |
| 登录失效单独处理 | 提供 hook 让应用统一处理登录失效（如跳转登录页） |
:::

### 业务状态码枚举

```typescript [packages/utils/src/request/constants.ts]
const enum RES_STATUS {
  SUCCESS = 1, // 成功
  NO_PERMISSION = 2, // 暂无权限
  NO_LOGIN = 4, // 没有登入
  LOGIN_EXPIRED = 9, // 登入过期
  GRAY = 1001, // 灰度切换
}
```

## Enhancers 增强器体系

### 增强器类型

```typescript [packages/utils/src/request/types/enhancer.ts]
/** 请求函数签名 */
type ApiFn<T> = () => Promise<T>

/** 重试配置选项 */
interface RetryConfig {
  count?: number // 最大重试次数（默认 3）
  delay?: number // 重试延迟时间（毫秒，默认 1000）
  exponential?: boolean // 是否使用指数退避（默认 false）
}

/** 请求配置选项（用于增强器） */
interface RequestEnhancerConfig {
  showLoading?: boolean // 显示 loading
  showSuccessMessage?: boolean // 显示成功提示
  showErrorMessage?: boolean // 显示错误提示（默认 true，设为 false 可禁用）
  /**
   * 缓存策略
   * - `true`: 内存缓存（Map），页面刷新时重置
   * - `CACHE_STRATEGY.MEMORY`: 同 `true`
   * - `CACHE_STRATEGY.LRU`: LRU 缓存，支持最大数量限制和 TTL 过期
   * - `CACHE_STRATEGY.FORCE_REFRESH`: 强制刷新现有缓存
   */
  useCache?: boolean | CACHE_STRATEGY
  rawResponse?: boolean // 自动提取响应的 data 字段（默认 true，设为 false 返回完整响应）
  /**
   * 请求失败重试配置
   * - `true`: 使用默认配置（重试 3 次，间隔 1 秒）
   * - `RetryConfig`: 自定义重试配置
   */
  retry?: boolean | RetryConfig
}

/** 消息提示函数类型 */
type MessageFn = (res: ApiResponse | null) => void

/** 加载控制器接口 */
interface LoadingController {
  show: (options?: { delay?: number }) => void
  hide: () => void
}

/** 增强器上下文配置 */
interface EnhancerContext {
  onError?: MessageFn // 错误消息处理器
  onSuccess?: MessageFn // 成功消息处理器
  loadingController?: LoadingController // Loading 控制器
  loadingDelay?: number // Loading 延迟时间（毫秒）
}

/** 增强器入参 */
interface EnhancerArgs<T> {
  api: ApiFn<T> // 原始请求函数
  config: RequestConfig // 完整请求配置
  context: EnhancerContext // 增强器能力注入
}
```

### createEnhanceRequest

增强器组合器，将多个增强器按顺序组合为一个请求处理管线。

增强器是**高阶函数**，把 `api: () => Promise<T>` 包装成新的 `api`。

每个增强器**内部自行判断**是否应该生效（检查 config 开关和 context 能力注入），不需要外部条件映射。

```typescript [packages/utils/src/request/enhancers/compose.ts]
const enhancers: EnhancerFn[] = [
  withLoading,
  withSuccessMessage,
  withErrorMessage,
  withCache,
  withRetry,
  withRawResponse,
]

export const createEnhanceRequest = (context: EnhancerContext) => {
  return <T>(api: ApiFn<T>, config: RequestConfig): Promise<T> => {
    // 依次应用所有增强器
    // 每个增强器内部自行判断是否应该生效，并管理自己的默认值
    // [!code focus]
    const enhanced = enhancers.reduce(
      // [!code focus]
      (acc, enhancer) => enhancer({ api: acc, config, context }), // [!code focus]
      api, // [!code focus]
    ) // [!code focus]
    return enhanced()
  } // [!code focus]
}
```

### withRawResponse

默认提取 `ApiResponse.data` 直接返回业务数据。

:::tip 为什么放在最外层
放在增强器链最外层（最后执行），确保其他增强器（成功/失败提示）能访问 `ApiResponse.msg`，如果提前提取 `data` 则失去上下文。
:::

| `rawResponse`            | 返回值                       |
| ------------------------ | ---------------------------- |
| 未设置或 `false`（默认） | `T`（只有 data）             |
| `true`                   | `ApiResponse<T>`（完整响应） |

[Source](https://github.com/ccBreeze/qiankun_monorepo/blob/func_qiankun/packages/utils/src/request/enhancers/withRawResponse.ts)

**Usage**：

```typescript
/** --- api --- */

// 默认行为直接返回 data 字段，业务层无需关心外层 ApiResponse 结构
export const loginApi = (content: LoginParams) => {
  return postDC<LoginResult>({
    actionName: 'candao.account.login',
    content,
  })
}

// 需要完整响应时，设置 rawResponse: false
export const checkOrderStatusApi = (content: checkOrderStatusParams) => {
  return postDC<ApiResponse<OrderStatusResult>>(
    {
      actionName: 'candao.order.checkStatus',
      content,
    },
    {
      rawResponse: false, // [!code highlight]
    },
  )
}

/** --- 业务调用 --- */

// loginApi 返回的就是 LoginResult
const { token, userInfo } = await loginApi({
  username: 'foo',
  password: 'bar',
})

// checkOrderStatusApi 返回完整的 ApiResponse
const res = await checkOrderStatusApi('123')
console.log(res.status) // 业务状态码
console.log(res.msg) // 响应消息
console.log(res.data) // 实际数据 OrderStatusResult
```

### withLoading

Loading 增强器，默认 `false`。不负责 UI 实现，只调用注入的函数

| 特性     | 实现方式               | 原因                                                                        |
| -------- | ---------------------- | --------------------------------------------------------------------------- |
| 引用计数 | 共享 `LoadingManager`  | 并发请求只显示一个 loading                                                  |
| 延迟显示 | 通过 controller 传递   | 延迟显示避免快速请求闪烁                                                    |
| 全局单例 | `globalLoadingManager` | 首次注入 `loadingController` 后全局共享，重复注册不同 controller 会发出警告 |

```typescript
// 并发多个请求时，loading 会正确显示（引用计数机制）
await Promise.all([
  postDC(data1, { showLoading: true }), // [!code highlight]
  postDC(data2, { showLoading: true }), // [!code highlight]
  postDC(data3, { showLoading: true }), // [!code highlight]
])
// → 第一个请求开始时显示 loading
// → 最后一个请求完成时隐藏 loading
// → 中间不会闪烁
```

[Source](https://github.com/ccBreeze/qiankun_monorepo/blob/func_qiankun/packages/utils/src/request/enhancers/withLoading.ts)

### withErrorMessage

错误提示增强器，默认 `true`。请求失败时调用注入的 `onError` 显示错误信息。
不负责 UI 实现，只调用注入的函数

:::tip 禁用场景

- 错误由页面自行处理的场景
- 轮询请求
- 心跳检测
  :::

[Source](https://github.com/ccBreeze/qiankun_monorepo/blob/func_qiankun/packages/utils/src/request/enhancers/withErrorMessage.ts)

### withSuccessMessage

成功提示增强器，默认 `false`。请求成功时调用注入的 `onSuccess` 显示成功信息。
不负责 UI 实现，只调用注入的函数

:::warning 注意
成功提示依赖后端返回的 `msg` 字段，如果后端不返回或返回空值，建议在封装时做兜底处理。
:::

[Source](https://github.com/ccBreeze/qiankun_monorepo/blob/func_qiankun/packages/utils/src/request/enhancers/withSuccessMessage.ts)

### withRetry

请求重试增强器，默认禁用。请求失败时自动重试，支持固定延迟和指数退避策略。

| 配置项        | 类型      | 默认值  | 说明                                         |
| ------------- | --------- | ------- | -------------------------------------------- |
| `retry`       | `boolean` | `false` | 设为 `true` 使用默认配置                     |
| `count`       | `number`  | `3`     | 最大重试次数                                 |
| `delay`       | `number`  | `1000`  | 重试延迟时间（毫秒）                         |
| `exponential` | `boolean` | `false` | 是否使用指数退避（delay \* 2^(attempt - 1)） |

[Source](https://github.com/ccBreeze/qiankun_monorepo/blob/func_qiankun/packages/utils/src/request/enhancers/withRetry.ts)

### withCache - 缓存策略体系

缓存系统采用**策略模式**，通过 `CacheStrategy` 接口统一不同缓存实现。

**策略接口**：

```typescript [packages/utils/src/request/enhancers/cacheStrategies/CacheStrategy.ts]
interface CacheStrategy {
  get(key: string): unknown
  set(key: string, value: unknown): void
  has(key: string): boolean
  delete(key: string): void
  clear(): void
}

/** 缓存策略枚举 */
enum CACHE_STRATEGY {
  MEMORY, // 内存缓存
  LRU, // LRU 缓存
  FORCE_REFRESH, // 强制刷新
}
```

**策略实现**：

| 策略                   | 实现             | 特性                       |
| ---------------------- | ---------------- | -------------------------- |
| `MemoryCacheStrategy`  | `new Map()`      | 页面刷新时重置             |
| `LRUCacheStrategy`     | `new LRUCache()` | 最大 100 条，30 分钟过期   |
| `ForceRefreshStrategy` | 自定义类         | 强制重新请求，更新已有缓存 |

:::warning ForceRefreshStrategy 的特殊行为
`FORCE_REFRESH` 的典型用法：某个请求之前使用 `MEMORY` 或 `LRU` 策略缓存过，现在需要强制刷新数据并更新对应缓存。它不会创建新缓存条目，只更新已有的。
:::

```typescript [packages/utils/src/request/enhancers/cacheStrategies/ForceRefreshStrategy.ts]
class ForceRefreshStrategy implements CacheStrategy {
  // 始终返回 undefined，强制重新请求
  get(): undefined {
    // [!code highlight]
    return undefined // [!code highlight]
  } // [!code highlight]

  // 智能更新：只更新之前已经存在的缓存
  set(key: string, value: object): void {
    // [!code highlight]
    if (lruCacheStrategy.has(key)) {
      // [!code highlight]
      lruCacheStrategy.set(key, value) // [!code highlight]
    } else if (memoryCacheStrategy.has(key)) {
      // [!code highlight]
      memoryCacheStrategy.set(key, value) // [!code highlight]
    } // [!code highlight]
    // 如果都没有缓存过，不做任何操作
  }
}
```

**设计决策**：

| 特性     | 实现方式                      | 原因                          |
| -------- | ----------------------------- | ----------------------------- |
| 策略模式 | `CacheStrategy` 接口          | 统一接口，便于扩展新策略      |
| 缓存键   | `MD5(JSON.stringify(config))` | 简单稳定，配置相同则 key 相同 |
| 全局单例 | 每种策略一个实例              | 跨请求共享缓存，避免重复创建  |

:::warning 缓存键注意事项
`config` 中所有字段都会参与缓存键计算（`MD5(JSON.stringify(config))`）。如果 `content` 中包含时间戳、随机数等变化字段，缓存将永远不会命中。
:::

:::tip 缓存策略选择

- `MEMORY`：字典数据、业务配置信息
- `LRU`：需要自动过期的数据
- `FORCE_REFRESH`：用户手动刷新、需要更新已缓存数据的场景
  :::

## 应用层集成示例

完整的集成步骤：[Source](https://github.com/ccBreeze/qiankun_monorepo/blob/func_qiankun/apps/main-app/src/utils/request.ts)

```typescript [apps/main-app/src/utils/request.ts]
import axios from 'axios'
import { message } from 'ant-design-vue'
import {
  createRequestInterceptor,
  createResponseInterceptor,
  createEnhanceRequest,
  type RequestData,
  type RequestConfig,
} from '@breeze/utils'
import { useAuthStore } from '@/stores/auth'
import { requestLoadingDelay } from '@/constant'
import loading from '@/components/LoadingFullscreen'

type PostConfig = Omit<RequestConfig, 'method' | 'url' | 'data'>

// 1. 创建 axios 实例 // [!code focus]
const instance = axios.create() // [!code focus]

// 2. 请求拦截器（协议适配） // [!code focus]
instance.interceptors.request.use(
  // [!code focus]
  createRequestInterceptor({
    // [!code focus]
    getAuthToken: () => useAuthStore().accessToken ?? '', // [!code focus]
  }), // [!code focus]
)

// 3. 响应拦截器（业务语义收敛） // [!code focus]
instance.interceptors.response.use(
  // [!code focus]
  createResponseInterceptor({
    // [!code focus]
    onLoginExpired: (data) => {
      const msg = data.msg ?? '登录已失效' // [!code focus]
      useAuthStore().showLogoutModal(msg) // [!code focus]
    }, // [!code focus]
  }), // [!code focus]
)

// 4. 创建增强器（注入 UI 能力） // [!code focus]
// [!code focus]
const enhanceRequest = createEnhanceRequest({
  // [!code focus]
  onError: (error) => {
    const msg = error?.msg || '未知错误'
    message.error(msg)
  }, // [!code focus]
  // [!code focus]
  onSuccess: (data) => {
    message.success(data?.msg)
  }, // [!code focus]
  // [!code focus]
  loadingController: {
    show: (options) => loading(options),
    hide: () => loading.close(),
  }, // [!code focus]
  loadingDelay: requestLoadingDelay, // [!code focus]
}) // [!code focus]

// 5. 创建通用请求（应用增强器） // [!code focus]
// [!code focus]
export const handleRequest = <T = unknown>(
  config: RequestConfig,
): Promise<T> => {
  return enhanceRequest(() => instance.request<T, T>(config), config) // [!code focus]
} // [!code focus]

/** POST 请求 */
export const post = <T = unknown>(
  url: string,
  data: RequestData,
  config: PostConfig = {},
) => {
  return handleRequest<T>({ method: 'post', url, data, ...config })
}

/** 创建绑定 URL 的 POST 请求函数 */
const createBoundPost =
  (url: string) =>
  <T = unknown>(data: RequestData, config: PostConfig = {}) =>
    post<T>(url, data, config)

export const postDC = createBoundPost('/ManageAction')
export const postAction = createBoundPost('/Action')
```

### 业务层调用示例

业务侧发请求时，只需关心 `actionName` 和 `content`

```typescript [apps/main-app/src/api/auth.ts]
/** --- api 封装 --- */

/** 登录请求参数 */
interface LoginParams {
  username: string
  password: string
}

/** 登录响应数据 */
interface LoginResult {
  aid: string
  accountName: string
  userName: string
  roleName: string
  token: string
}

export const loginApi = (content: LoginParams) => {
  return postDC<LoginResult>(
    {
      actionName: 'candao.account.login', // [!code highlight]
      content, // [!code highlight]
    },
    {
      showSuccessMessage: true,
    },
  )
}

/** --- 业务调用 --- */

// loginApi 返回的就是 LoginResult
const { token, userInfo } = await loginApi({
  username: 'foo',
  password: 'bar',
})
```

## 常见问题

:::details Q: 为什么分离 RequestData 和 RequestConfig？

- `RequestData` 业务传入的请求参数，不需要关心请求配置
- `RequestConfig` 继承自 `AxiosRequestConfig`，包含完整的请求配置和增强器开关
- 分离后业务侧可以只关心 `actionName + content`
  :::

:::details Q: 为什么增强器 EnhancerContext 采用能力注入模式？

- 增强器不依赖具体 UI 框架（Ant Design、Element Plus 等）
- 应用侧在创建 `enhanceRequest` 时注入具体实现
- 便于测试和替换
  :::

:::details Q: 为什么增强器顺序是固定的？
增强器顺序影响执行语义。

- `withRawResponse` 必须放最外层（最后执行），否则其他增强器无法访问 `ApiResponse.msg`。
- 固定顺序可以保证行为可预测。
  :::

:::details Q: 缓存 key 为什么用 MD5？
缓存键需要由 `RequestConfig` 对象（含 `url`、`data`、增强器开关等）生成唯一标识。直接用 `JSON.stringify` 作为 key 会导致字符串过长，而 MD5 具备以下优势：

- **输出固定 32 字符**：无论配置对象多大，key 长度恒定
- **计算快**：适合高频请求场景
- **碰撞概率极低**：不同配置产生相同 key 的可能性可忽略
  :::

:::details Q: ForceRefreshStrategy 适用于什么场景？
当你有一个已缓存的请求（使用 `MEMORY` 或 `LRU`），需要强制刷新数据并更新缓存时使用。

- 不会创建新缓存条目，只更新已有的。
- 典型场景：需要每隔多少分钟重新请求接口获取最新配置。
  :::
