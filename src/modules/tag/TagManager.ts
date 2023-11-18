import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {Tag, TagState} from "./models/Tag";
import {Relation, RelationType, RID} from "../user/models/Relation";
import {BaseScanner} from "./scanner/BaseScanner";
import {getIntersection, groupBy} from "../../utils/ArrayUtils";
import {BigNumber, BigNumberish, ethers} from "ethers";
import {KVMerkleTree} from "@sismo-core/kv-merkle-tree";
import {getPoseidon} from "../user/PoseidonUtils";
import {schedule} from "../../utils/CronUtils";
import {cacheMgr} from "../cache/CacheManager";
import {EddsaAccount} from "@sismo-core/crypto";
import {cacheable} from "../cache/Cacheable";

export const AddressTreeHeight = 20;
export const RegistryTreeHeight = 20;

export const LongCacheSecond = 3 * 24 * 60 * 60
export const MiddleCacheSecond = 60 * 60
export const ShortCacheSecond = 30

export const ScanResultKey = "ScanResult"
export const RootResultKey = "RootResult"

export function tagMgr() {
  return getManager(TagManager)
}

@manager
export class TagManager extends BaseManager {

  private poseidon: (inputs: BigNumberish[]) => BigNumber

  public scanResults: {[K: string]: [RID, number][]} = {}
  public rootResults: {[K: string]: string[]} = {}

  async onStart() {
    super.onStart();
    await this.loadFromCache();
    this.poseidon = await getPoseidon();
  }

  // region Addresses Storage (For Hackathon)

  @cacheable(ShortCacheSecond, String)
  public async getRegistryRoot() {
    // await Credential.findAll({
    //   where: {state: CredentialState.Active}
    // });
    const tags = await this.updateTags();

    const registryData = tags.reduce(
      (res, c) => ({...res, [c.addressesRoot]: 1}), {}
    );
    const registryTree = new KVMerkleTree(
      registryData, this.poseidon, RegistryTreeHeight);

    return registryTree.getRoot().toHexString();
  }

  // endregion

  public async scanForAll() {
    const scanners = BaseScanner.scanners.filter(s => s.scanForAll);
    for (const scanner of scanners) {
      console.log(`[Scan] Start ${scanner.name}`);
      this.scanResults[scanner.name] = await scanner.scanForAll();
      console.log(`[Scan] Done ${scanner.name}`, this.scanResults[scanner.name].length);
    }
  }

  public async scanForRelations(relations: Relation[]) {
    const relationGroup: {[K in RelationType]?: Relation[]} = groupBy(relations, "type")

    for (const [type, relations] of Object.entries(relationGroup)) {
      const scanners = BaseScanner.scanners.filter(s => {
        if (!s.scanForRelations) return false;
        if (!s.relationTypes) return true;
        return s.relationTypes.includes(Number(type))
      });

      for (const scanner of scanners) {
        console.log(`[Scan] Start ${scanner.name} For ${relations.map(r => r.toRID()).join(', ')}`);
        const results = await scanner.scanForRelations(relations)
        console.log(`[Scan] Done ${scanner.name}`, results.length, 'Appending');

        const lastScanResult = this.scanResults[scanner.name]; // 上次扫描结果
        console.log(`[Scan] Last result`, lastScanResult.length);

        const lastScanRids = lastScanResult.map(([rid, _]) => rid); // 上次扫描结果的rid
        const newScanRids = results.map(([rid, _]) => rid); // 本次扫描结果的rid
        const intersection = getIntersection([lastScanRids, newScanRids]); // 重合的rid
        console.log(`[Scan] Intersection`, intersection.length);

        const lastResult = lastScanResult.filter(([rid, _]) => !intersection.includes(rid)) // 上次扫描结果中不重合的rid

        // 合并上次扫描结果和本次扫描结果
        this.scanResults[scanner.name] = [...lastResult, ...results]
      }
    }
  }

  public async updateTags() {
    const tags = await Tag.findAll({
      where: { state: TagState.Active }
    });
    return Promise.all(tags.map(tag => this.updateTag(tag)));
  }
  public async updateTag(tag: Tag) {
    console.log(`[Update] ${tag.id} ${tag.name}`, tag.rules);

    const ridGroup = tag.rules.map(rule => {
      const result = this.scanResults[rule.groupName]

      // 更新Tag
      return result.filter(([, val]) => {
        switch (rule.compare) {
          case 'eq': return val === rule.value;
          case 'ne': return val !== rule.value;
          case 'gt': return val > rule.value;
          case 'lt': return val < rule.value;
          case 'gte': return val >= rule.value;
          case 'lte': return val <= rule.value;
          case 'in': return (rule.value as number[]).includes(val);
          case 'notin': return !(rule.value as number[]).includes(val);
          default: return false;
        }
      }).map(([rid]) => rid);
    })
    const rids = getIntersection(ridGroup)
    tag.addressesRoot = this.calcAddressRoot(rids);

    console.log(`[Update] ${tag.id} ${tag.name}`,
      ridGroup.map(a => a.length), rids.length, tag.addressesRoot);

    this.rootResults[tag.addressesRoot] = rids;

    return tag.save();
  }
  public calcAddressRoot(rids: string[]) {
    console.log("[CalcAddressRoot] Start", rids.length)
    rids = rids.map(rid => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(rid)));

    const ridsTreeData = {}
    for (const rid of rids) ridsTreeData[rid] = 1;

    const ridsTree = new KVMerkleTree(
      ridsTreeData, this.poseidon, AddressTreeHeight);
    console.log("[CalcAddressRoot] Generated");

    const res = ridsTree.getRoot().toHexString();
    console.log("[CalcAddressRoot] Finished", rids.length, res)

    return res
  }

  @schedule("0 * * * * *")
  public async saveToCache() {
    await cacheMgr().setKV(ScanResultKey, this.scanResults)
    await cacheMgr().setKV(RootResultKey, this.rootResults)
  }

  public async loadFromCache() {
    this.scanResults = await cacheMgr().getKV(ScanResultKey, Object) as {[K: string]: [RID, number][]} || {}
    this.rootResults = await cacheMgr().getKV(RootResultKey, Object) as {[K: string]: string[]} || {}
  }

  // // region Addresses Storage
  //
  // public async getAddresses(tag: Tag) {
  //   return JSON.parse(await this.getAddressesByRoot(tag.addressesRoot))
  // }
  // public getAddressesUrl(tag: Tag) {
  //   if (!tag.addressesRoot) return null;
  //   const path = `addressRoots/${tag.addressesRoot}.json`
  //   return bucketMgr().getBucketUrl(path)
  // }
  // @cacheable(LongCacheSecond, String)
  // private async getAddressesByRoot(root: string) {
  //   const path = `addressRoots/${root}.json`
  //   try {
  //     const file = await bucketMgr().getFile(path)
  //     return file.Body.toString()
  //   } catch (e) {
  //     return null
  //   }
  // }
  //
  // // endregion
}
