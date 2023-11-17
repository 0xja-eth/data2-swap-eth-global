import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {PushAPI} from "@pushprotocol/restapi";
import {ethers} from "ethers";
import {config} from "../../config/ConfigManager";

export interface PushConfig {
  rpcUrl: string
  privateKey: string
}

declare module "../../config/ConfigType" {
  interface MainConfig {
    push?: PushConfig
  }
}

export function PushConfig() { return config().push }

export function pushMgr() {
  return getManager(PushManager);
}

@manager
export class PushManager extends BaseManager {

  public client: PushAPI

  async onReady() {
    super.onReady()

    const provider = new ethers.providers.JsonRpcProvider(PushConfig().rpcUrl)
    const signer = new ethers.Wallet(PushConfig().privateKey, provider)

    this.client = await PushAPI.initialize(signer, { env: "prod" as any })
  }

  public send(title: string, body: string,
              recipients: string[] = ["*"]) {
    return this.client.channel.send(recipients, {
      notification: { title, body },
    });
  }
}
