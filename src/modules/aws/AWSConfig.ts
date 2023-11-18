import {config} from "../../config/ConfigManager";

export interface AWSConfig {
  region: string
  accessKeyId: string
  secretAccessKey: string
}

declare module "../../config/ConfigType" {
  interface MainConfig {
    aws?: AWSConfig
  }
}

export default function() { return config()?.aws }
