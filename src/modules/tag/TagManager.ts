import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {cacheable} from "../cache/Cacheable";
import {Tag} from "./models/Tag";
import {bucketMgr} from "../aws/bucket/Bucket";

export const LongCacheSecond = 3 * 24 * 60 * 60
export const MiddleCacheSecond = 60 * 60
export const ShortCacheSecond = 30

export function tagMgr() {
  return getManager(TagManager)
}

@manager
export class TagManager extends BaseManager {

  // region Addresses Storage

  public async getAddresses(tag: Tag) {
    return JSON.parse(await this.getAddressesByRoot(tag.addressesRoot))
  }
  public getAddressesUrl(tag: Tag) {
    if (!tag.addressesRoot) return null;
    const path = `addressRoots/${tag.addressesRoot}.json`
    return bucketMgr().getBucketUrl(path)
  }
  @cacheable(LongCacheSecond, String)
  private async getAddressesByRoot(root: string) {
    const path = `addressRoots/${root}.json`
    try {
      const file = await bucketMgr().getFile(path)
      return file.Body.toString()
    } catch (e) {
      return null
    }
  }

  // endregion
}
