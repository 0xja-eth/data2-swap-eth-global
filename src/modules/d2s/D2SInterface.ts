import {BaseInterface, body, custom, get, params, post, route} from "../http/InterfaceManager";
import {d2sMgr} from "./D2SManager";

@route("/swap")
export class D2SInterface extends BaseInterface {

  @get("/buyKeys/:address")
  async getBuyKeys(@params("address") address: string) {
    const d2s = d2sMgr().data2Swap;
    const keys: string[] = [];
    while (true) {
      try { keys[keys.length] = await d2s.methods.buyKeys(address, keys.length).call() }
      catch (e) { console.log(`getBuyKeys ${address}, ${keys.length} break:`, e); break }
    }
    const counts = await Promise.all(keys.map(key => d2s.methods.buyRecords(address, key).call()))
    const tagIdses = await Promise.all(keys.map(key => d2sMgr().getTagIds(key)))
    const keyCounts = keys.map((key, i) => ({ key, tagIds: tagIdses[i], count: counts[i] }))

    return { keyCounts }
  }

}
