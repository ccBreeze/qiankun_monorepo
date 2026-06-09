# Electron 自助点餐机：开机自启动 × 管理员权限冲突的解决方案

> 适用项目：JRG-KFC-SOK（肯德基香港门店自助点餐机 Electron 客户端，Windows，`--ia32` 32 位包）
> 本文严格按本仓库实际代码编写：`build/installer.nsh`、`src/main/index.js`、`electron-builder-config.js`。

## 一、问题背景

自助点餐机是无人值守终端，必须同时满足两点：

1. **开机自启**：门店来电 / 重启后，Windows 自动登录 → 应用静默拉起，无需店员手动点图标。
2. **管理员权限运行**：要读写八达通等外设、写固定安装目录、写系统注册表（关闭触摸边缘手势、调无响应超时等），所以 `electron-builder-config.js` 里设了 `win.requestedExecutionLevel: 'highestAvailable'`。

这两点**直接冲突**：

- Electron 的 `app.setLoginItemSettings({ openAtLogin: true })` 在 Windows 上实际是往 `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run` 写一条启动项（用户级）。
- 但 Windows **不会在登录时自动拉起一个需要 UAC 提权的程序**——那需要弹 UAC 确认框，登录阶段不弹框，于是这条用户级自启项被系统静默跳过。
- 现象：不提权时自启正常；一旦打成「管理员权限」的正式包，开机就不自启了。

## 二、本项目的解决方案

不依赖 `app.setLoginItemSettings`，而是**在 NSIS 安装阶段把自启项直接写进 HKLM（机器级）的 Run 键**。

为什么机器级 Run 键能解决：

- `HKEY_LOCAL_MACHINE\...\CurrentVersion\Run` 是机器级自启项，系统启动时会以合适权限拉起其中程序，**能正常启动需要管理员权限的程序**，不走「登录时弹 UAC」那条会被跳过的路径。
- 机器级对所有用户生效，不依赖当前登录用户是否有提权能力。
- 本项目是 `--ia32` 打的 **32 位程序**：32 位进程访问 `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run` 会被系统重定向到 `HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run`，所以**直接写 `WOW6432Node` 节点**最稳；并在 64 / 32 两个 RegView 各写一遍兜底。

## 三、实际实现

### 1. `build/installer.nsh` —— 安装时写注册表（核心方案）

electron-builder 约定：若存在 `build/installer.nsh`，其中的宏会被自动并入安装脚本。本项目在 `preInit` 宏（安装器初始化阶段执行，静默批量安装 `/S` 也覆盖）里一次性写入：

```nsis
!macro preInit
    SetRegView 64
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\jrgkfc\app"
    WriteRegDWORD     HKLM "SOFTWARE\Policies\Microsoft\Windows\EdgeUI" "AllowEdgeSwipe" 0x00000000
    WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\jrgkfc\app"
    WriteRegDWORD     HKCU "SOFTWARE\Policies\Microsoft\Windows\EdgeUI" "AllowEdgeSwipe" 0x00000000
    WriteRegExpandStr HKCU "Control Panel\Desktop" "HungAppTimeout" "300000"
    WriteRegExpandStr HKLM "SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run" "KFCSOK" "C:\jrgkfc\app\KFCSOK.exe"

    SetRegView 32
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\jrgkfc\app"
    WriteRegDWORD     HKLM "SOFTWARE\Policies\Microsoft\Windows\EdgeUI" "AllowEdgeSwipe" 0x00000000
    WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "C:\jrgkfc\app"
    WriteRegDWORD     HKCU "SOFTWARE\Policies\Microsoft\Windows\EdgeUI" "AllowEdgeSwipe" 0x00000000
    WriteRegExpandStr HKCU "Control Panel\Desktop" "HungAppTimeout" "300000"
    WriteRegExpandStr HKLM "SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Run" "KFCSOK" "C:\jrgkfc\app\KFCSOK.exe"
!macroend
```

逐项作用（64 / 32 两个 RegView 各写一遍，下面按职责说明）：

| 注册表写入                                                          | 作用                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `HKLM/HKCU ${INSTALL_REGISTRY_KEY} InstallLocation = C:\jrgkfc\app` | 固定安装路径，门店运维脚本、自启路径、热更新覆盖路径都依赖这个固定位置                                  |
| `HKLM/HKCU ...\EdgeUI AllowEdgeSwipe = 0`                           | 禁用触摸屏边缘滑动手势，防止顾客从屏幕边缘划出系统 UI、逃逸 kiosk                                       |
| `HKCU Control Panel\Desktop HungAppTimeout = 300000`                | 把「程序无响应」判定超时拉长到 5 分钟，避免打印 / 读卡 / 大餐单加载时主线程短暂阻塞被系统弹「未响应」框 |
| `HKLM ...\WOW6432Node\...\Run KFCSOK = C:\jrgkfc\app\KFCSOK.exe`    | **本文核心**：机器级开机自启项，绕开提权后用户级登录项失效的问题                                        |

> 注意：自启项的值是写死的绝对路径 `C:\jrgkfc\app\KFCSOK.exe`，与 `InstallLocation` 写死的安装目录一致——所以「固定安装路径」是「机器级自启」的前提，两者必须配套。

### 2. `src/main/index.js` —— 仍保留的 `setLoginItemSettings`（提权场景下基本无效）

应用 `app.whenReady()` 里，production 模式仍调用：

```js
electronApp.setAppUserModelId('com.electron') // line 134
// ...
if (import.meta.env.MODE === 'production') {
  // line 144
  app.setLoginItemSettings({
    openAtLogin: true, // 设置为 true 使应用程序开机启动
    openAsHidden: true, // 启动时隐藏主窗口（主要对 macOS 生效）
  })
}
```

实际效果：因为 `requestedExecutionLevel: 'highestAvailable'`，这条写 HKCU 的登录项在正式（提权）包里**写了也不会被开机拉起**，真正生效的是上面 `installer.nsh` 的 HKLM 机器级项。这段当前是冗余/历史代码，可作为后续清理项。

### 3. `electron-builder-config.js` —— 提权配置（冲突的根因）

```js
win: {
  requestedExecutionLevel: 'highestAvailable'
}
```

正因为这一行让应用以最高可用权限运行，才导致标准登录项失效，从而需要走 `installer.nsh` 的机器级注册表方案。

## 四、当前代码状态

- ✅ `build/installer.nsh`：安装期写 HKLM\WOW6432Node\...\Run 自启项 + 固定安装路径 + EdgeUI + HungAppTimeout —— **当前真正生效的自启与 kiosk 化方案**。
- ⚠️ `src/main/index.js`：仍保留 `app.setLoginItemSettings({...})`（production 分支），在提权场景下不生效，属冗余。
- ❌ 本项目**未实现**「运行时用 `REG ADD` 写注册表自愈」「`app.requestSingleInstanceLock()` 单实例锁」——这些只在相关技术调研中讨论过，当前 `src/` 代码里不存在，不要据此描述本项目。

## 五、面试可展开的追问点

- 为什么 `setLoginItemSettings` 在提权后失效？（写 HKCU Run + 登录时不弹 UAC → 被系统跳过）
- 为什么写 `WOW6432Node` 节点而不是直接 `...\CurrentVersion\Run`？（32 位进程的注册表重定向）
- HKLM 机器级 vs HKCU 用户级 Run 的取舍？（机器级能拉起需提权程序、对所有用户生效，但写 HKLM 需安装时有管理员权限）
- 为什么自启项要配合「固定安装路径」？（自启值是写死的绝对路径，路径不固定则自启失效）
- `installer.nsh` 放在 `preInit` 宏的意义？（安装器早期执行，静默批量安装也覆盖）
