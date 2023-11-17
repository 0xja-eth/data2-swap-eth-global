import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {ABI, EventData, EventNames, EventValues} from "../web3/ethereum/core/Contract";
import {get, Itf, post} from "../http/NetworkManager";

import {EventRecorder, EventRecorderId} from "./EventRecorder";
import {schedule} from "../../utils/CronUtils";

export const GID = "45027"
export const GSlug = "data2-cash-scroll"
export const GVersion = "v0.0.1"

const ScanCorn = "*/5 * * * * *"

const Host = "https://api.studio.thegraph.com/query"

export type Event<T extends ABI = any, Name extends EventNames<T> = any> = {
  id: string
  blockNumber: string
  blockTimestamp: string
  transactionHash: string
} & EventValues<T, Name>

export function subGraphStudioQuery<O>(id, slug, version): Itf<string, O> {
  return query => post<{query: string}, O>(Host, `/${id}/${slug}/${version}`)({query})
}

export function onEvent(name: string) {
  return (obj, key, desc) => {
    eventMgr().registerCallback(name, desc.value)
  }
}

export function eventMgr() {
  return getManager(EventManager)
}

@manager
export class EventManager extends BaseManager {

  public gid: string = GID
  public gSlug: string = GSlug
  public gVersion: string = GVersion

  private callbacks: {[key in EventRecorderId]?: (e: Event) => any} = {}

  public registerCallback(eName: string, callback: (e: Event) => any) {
    const id = EventRecorder.makeId(this.gid, this.gSlug, this.gVersion, eName)
    this.callbacks[id] = callback
  }

  @schedule(ScanCorn)
  private async _scanEvents() {
    await eventMgr().scanEvents()
  }

  public async scanEvents() {
    const recorders = await EventRecorder.findAll({ where: {enabled: true} })
    recorders.map(recorder => this.scanEvent(recorder))
  }
  public async scanEvent(recorder: EventRecorder) {
    console.log("[scanEvent] recorder", recorder.id, recorder)

    if (!this.callbacks[recorder.id]) return

    const {gid, gSlug, gVersion, eName, fields, scannedBlockNumber} = recorder
    const query = `${eName.toLowerCase()}s(
  where: {blockNumber_gt: "${scannedBlockNumber}"}
) {
  id
  blockNumber
  blockTimestamp
  transactionHash
  ${fields.map(f => f).join("\n")}
}`
    console.log("[scanEvent] query", query)

    const queryFunc = subGraphStudioQuery(gid, gSlug, gVersion)
    const queryRes = await queryFunc(query)
    const events = queryRes?.[`${eName.toLowerCase()}s`] as Event[]

    if (events.length <= 0) return console.log("[scanEvent] no events")

    console.log("[scanEvent] events", events.length, events)

    let blockNumber = scannedBlockNumber
    let processedIds = recorder.processedIds?.slice() || []
    try {
      await Promise.all(events.map(async e => {
        if (processedIds.includes(e.id)) return

        await this.callbacks[recorder.id](e)
        processedIds.push(e.id)

        blockNumber = Math.max(blockNumber, Number(e.blockNumber))
      }))
    } catch (e) {
      console.error("[scanEvent] error", e)
      blockNumber = scannedBlockNumber; // 中途失败，重置区块号
    }

    // 如果当前区块全部处理完毕，则更新区块号
    if (blockNumber > scannedBlockNumber) {
      recorder.scannedBlockNumber = blockNumber
      recorder.processedIds = [] // 重置已处理的事件（因为当前区块号已经处理完了）
    } else
      recorder.processedIds = processedIds

    await recorder.save()
  }
}
