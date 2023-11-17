import {config} from "../../../config/ConfigManager";

export type AppInfo = {
  name: string,
  link: string,

  twitter: string,
  discord: string
}

// User配置
export type UserConfig = {
  superAdminSecret: string,
  certKey: string,

  codeExpiredSeconds?: number
  sendWelcome?: boolean

  app?: AppInfo
}

declare module "../../../config/ConfigType" {
  interface MainConfig {
    user?: UserConfig
  }
}

export default function() { return config().user }
