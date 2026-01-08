import { useLocalStorage, type RemovableRef } from '@vueuse/core'

interface GlobalConfigStorage {
  [key: string]: unknown
}

interface UserConfigStorage {
  [key: string]: unknown
}

/** 全局配置存储 - 用户退出不清空 */
export const globalConfigStorage: RemovableRef<GlobalConfigStorage> =
  useLocalStorage<GlobalConfigStorage>('globalConfig', {})

/** 用户配置存储 - 用户退出清空 */
export const userConfigStorage: RemovableRef<UserConfigStorage> =
  useLocalStorage<UserConfigStorage>('userConfig', {})

/** 重置用户配置 */
export const resetUserConfig = (): void => {
  userConfigStorage.value = {}
}

/** 重置所有配置（包括全局配置） */
export const resetAllConfig = (): void => {
  globalConfigStorage.value = {}
  userConfigStorage.value = {}
}
