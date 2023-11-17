import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import WebPushConfig from "./WebPushConfig";
import webpush from 'web-push';
import {cacheMgr} from "../cache/CacheManager";

export interface PushSubscription {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/PushSubscription/endpoint) */
  readonly endpoint: string;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/PushSubscription/expirationTime) */
  readonly expirationTime: EpochTimeStamp | null;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/PushSubscription/options) */
  readonly options: PushSubscriptionOptions;
}

export interface NotificationOptions {
  actions?: NotificationAction[];
  badge?: string;
  body?: string;
  data?: any;
  dir?: NotificationDirection;
  icon?: string;
  image?: string;
  lang?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  timestamp?: EpochTimeStamp;
  vibrate?: VibratePattern;
}

const CacheKey = "subscription"

export function webPushMgr() {
  return getManager(WebPushManager)
}

@manager
export class WebPushManager extends BaseManager {

  onStart() {
    super.onStart();

    webpush.setVapidDetails(
      WebPushConfig().email,
      WebPushConfig().publicKey,
      WebPushConfig().privateKey
    );
  }

  public async registerSubscription(userId: string, subscription: PushSubscription) {
    return await cacheMgr().setKV(`${CacheKey}:${userId}`, subscription)
  }
  public async cancelSubscription(userId: string) {
    return await cacheMgr().deleteKV(`${CacheKey}:${userId}`)
  }
  public async getSubscription(userId: string) {
    return await cacheMgr().getKV(`${CacheKey}:${userId}`, Object) as PushSubscription
  }

  // TODO: 添加回调拓展
  public async sendNotification(userId: string, data: string, option?: NotificationOptions) {
    const sub = await this.getSubscription(userId);
    if (!sub) return;

    return await webpush.sendNotification(
      sub, option ? JSON.stringify({ data, option }) : data
    )
  }
}
