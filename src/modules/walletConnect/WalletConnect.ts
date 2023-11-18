import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {PushAPI} from "@pushprotocol/restapi";
import {ethers} from "ethers";
import {config} from "../../config/ConfigManager";
import {post} from "../http/NetworkManager";

export interface WCConfig {
  projectId: string
  apiSecret: string
  notificationType: string
}

declare module "../../config/ConfigType" {
  interface MainConfig {
    wc?: WCConfig
  }
}

export function WCConfig() { return config().wc }

const Host = "https://notify.walletconnect.com"

export type Notification = {
  type: string
  title: string
  body: string
  icon: string
  url: string
}

export const PushNotification = (notification: Partial<Notification>, accounts: string[]) => {
  return post<{
    projectId: string,
    notification: Notification, accounts: string[]
  }>(Host, "/:projectId/notify")({
    projectId: WCConfig().projectId,
    notification: {
      type: WCConfig().notificationType,
      ...notification
    } as Notification, accounts
  }, {
    Authorization: `Bearer ${WCConfig().apiSecret}`
  })
}
