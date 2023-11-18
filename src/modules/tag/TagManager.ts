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
import {Event, onEvent} from "../theGraph/EventManager";
import {ContractOf, Contracts, getContract} from "../web3/ethereum/core/ContractFactory";
import {UserTag, UserTagState} from "./models/UserTag";
import {User} from "../user/models/User";
import {BaseError} from "../http/utils/ResponseUtils";
import {addrEq, addrInclude} from "../../utils/AddressUtils";
import {Op} from "sequelize";
import {ethereum} from "../web3/ethereum/EthereumManager";
import {TransactionReceipt} from "web3-core";

type InputPoseidon<T> = string;

type InputCredentialId = string;
type InputSourceSecret = string;
type InputSourceSecretHash = InputPoseidon<[InputSourceSecret, 1]> // Commitment

type InputDestinationIdentifier = string;
type InputCommitmentMapperPubKey = [string, string];
type InputExternalNullifier = InputCredentialId;
type InputNullifier = InputPoseidon<
  [InputSourceSecretHash, InputExternalNullifier]
  >;

export type SnarkProof = {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  // input: string[];
  input: [
    InputDestinationIdentifier,
    ...InputCommitmentMapperPubKey,
    InputExternalNullifier,
    InputNullifier
  ]
}

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

  public scanResults: {[K: string]: [RID, number][]}
  public rootResults: {[K: string]: string[]}

  public zkProfile: ContractOf<"ZKProfile">

  async onStart() {
    super.onStart();
    this.poseidon = await getPoseidon();
    this.zkProfile = getContract("ZKProfile")
  }

  async onReady() {
    super.onReady();
    await this.loadFromCache();
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
        if (!lastScanResult) this.scanResults[scanner.name] = results;
        else {
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
    await this.updateTags()
  }

  public async updateTags() {
    const tags = await Tag.findAll({
      where: { zkEnable: true, state: TagState.Active }
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

  public async getTags(rids: RID[]) {
    const tags = await Tag.findAll({where: {state: TagState.Active}})
    return rids.map(rid => ({
      rid, roots: Object.keys(this.rootResults)
        .filter(key => addrInclude(this.rootResults[key], rid))
    })).map(({rid, roots}) => ({
      rid, tags: roots
        .map(root => tags.find(tag => tag.addressesRoot === root))
        .filter(tag => !!tag)
    }))
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
    await this.clearUnusedRoots()
    if (tagMgr().scanResults) await cacheMgr().setKV(ScanResultKey, tagMgr().scanResults)
    if (tagMgr().rootResults) await cacheMgr().setKV(RootResultKey, tagMgr().rootResults)
  }

  private async clearUnusedRoots() {
    const tags = await Tag.findAll()
    const roots = Object.keys(this.rootResults);
    const unusedRoots = roots.filter(root => !tags.find(tag => addrEq(tag.addressesRoot, root)))
    for (const root of unusedRoots) delete this.rootResults[root];
  }

  public async loadFromCache() {
    this.scanResults = await cacheMgr().getKV(ScanResultKey, Object) as {[K: string]: [RID, number][]} || {}
    this.rootResults = await cacheMgr().getKV(RootResultKey, Object) as {[K: string]: string[]} || {}
  }

  public async mintSBT(mintAddress: string,
                       user: User,
                       snarkProofs: SnarkProof[],
                       nonZKTagIds: string[]) {
    if (addrEq(user.mintAddress, mintAddress))
      throw new BaseError(403, "Mint Address Not Match");

    const zkTagIds = snarkProofs.map(p => p.input[3]);
    const tagIds = [...zkTagIds, ...nonZKTagIds];

    // 检查用户是否已经拥有该标签
    const userTags = await UserTag.findAll({
      where: { userId: user.id, tagId: {[Op.in]: tagIds} }
    });

    if (nonZKTagIds.length > 0) {
      const nonZKTags = (await Tag.findAll({
        where: { id: {[Op.in]: nonZKTagIds}, zkEnable: false }
      }))
        // 过滤掉已经拥有的标签
        .filter(tag => !userTags.find(ut => ut.tagId === tag.id));
      if (nonZKTags.length > 0)
        await UserTag.bulkCreate(nonZKTags.map(tag => ({
          userId: user.id, tagId: tag.id, nullifiers: []
        })))
    }

    const pushSnarkProofs = snarkProofs.filter(p => {
      let destination = p.input[0], nullifier = p.input[4];

      const destHex = BigNumber.from(destination).toHexString();
      const destAddress = destHex.slice(0, destHex.length - 20);
      if (!addrEq(destAddress, user.mintAddress))
        throw new BaseError(403, "Address not match in snarkProof", {destAddress});

      // 检查nullifier是否已经被使用
      return userTags.every(ut => !ut.nullifiers.includes(nullifier));
    });

    console.log("[Mint SBT] pushSnarkProofs", pushSnarkProofs.length, "snarkProofs", snarkProofs.length)

    let tx: TransactionReceipt, txHash = "";
    if (pushSnarkProofs.length > 0) {
      try {
        tx = await this.zkProfile.methods.pushZKProofs({
          _a: pushSnarkProofs.map(p => p.a),
          _b: pushSnarkProofs.map(p => p.b),
          _c: pushSnarkProofs.map(p => p.c),
          _input: pushSnarkProofs.map(p => p.input)
        }).quickSend();

        txHash = tx.transactionHash;
      } catch (e) {
        console.error("[Mint SBT failed]", e, pushSnarkProofs)
        throw e;
      }
    }

    const tokenIdStr = await this.zkProfile.methods
      .getTokenIdByAddress({_owner: user.mintAddress}).call();
    const tokenIdHex = BigNumber.from(tokenIdStr).toHexString().slice(2).toLowerCase();

    if (tokenIdHex == "ffffffffffffffffffff") {
      console.error("[Mint SBT failed] No TokenId", user.id, txHash)
      return { tokenId: 0, txHash }
    }
    user.sbtId = tokenIdStr
    user.mintTime = Date.now()

    await user.save()
    return { tokenId: tokenIdStr, txHash }
  }

  @onEvent("ZKProof")
  private async _onPushZKProof(e) {
    await tagMgr().onPushZKProof(e)
  }
  private async onPushZKProof(e: Event<Contracts["ZKProfile"], "ZKProof">) {
    const { _to, _tagId, _nullifier } = e;
    const user = await User.findOne({ where: { mintAddress: _to } });

    const userTag = await UserTag.findOne({
      where: { tagId: _tagId, userId: user.id }
    })
    if (!userTag)
      await UserTag.create({
        tagId: _tagId.toString(), userId: user.id, state: UserTagState.Normal,
        nullifiers: [_nullifier.toString()]
      })
    else {
      userTag.state = UserTagState.Normal;
      userTag.nullifiers = [...(userTag.nullifiers || []), _nullifier.toString()];
      await userTag.save();
    }
  }
}
