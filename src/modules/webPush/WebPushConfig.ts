import {config} from "../../config/ConfigManager";

export type WebPushConfig = {
    email: string
    publicKey: string
    privateKey: string
}

declare module "../../config/ConfigType" {
    interface MainConfig {
        webPush?: WebPushConfig
    }
}

export default function() { return config().webPush }
