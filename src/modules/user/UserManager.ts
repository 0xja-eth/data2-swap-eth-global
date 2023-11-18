import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {Relation, RelationBindParams, RelationType} from "./models/Relation";
import {relationRegister} from "./processors/RelationProcessor";
import {User} from "./models/User";
import {BaseError, ExistError, NotFoundError} from "../http/utils/ResponseUtils";

import {MathUtils} from "../../utils/MathUtils";
import {cacheMgr} from "../cache/CacheManager";
import {EmailType} from "../email/EmailConfig";
import UserConfig from "./configs/UserConfig";
import {resendMgr} from "../email/resend/ResendManager";
import {benefitMgr} from "../benefit/BenefitManager";
import {StringUtils} from "../../utils/StringUtils";
import {get} from "../http/NetworkManager";
import {commitmentMgr} from "./CommitmentManager";

export enum CodeType {
  Bind = "bind"
}
const EmailCodeKey = "email-code"
const DefaultCodeExpiredSeconds = 5 * 60
const DataPowerCashFactor = 0.01

export function userMgr() {
  return getManager(UserManager)
}

@manager
export class UserManager extends BaseManager {

  // region MintAddress

  /**
   * 根据关系登陆
   */
  public async loginByMintAddress(address: string): Promise<{
    user: User, relations?: Relation[]
  }> {
    return await this.findUserByMintAddress(address) ||
      await this.createUserByMintAddress(address)
  }

  /**
   * 根据关系创建用户
   */
  public async createUserByMintAddress(address: string) {
    return { user: await User.create({ mintAddress: address }) }
  }

  /**
   * 根据关系获取用户
   */
  public async findUserByMintAddress(address, withRelation = true) {
    const user = await User.findOne({where: {mintAddress: address}});
    if (!user) return null;

    if (!withRelation) return {user};
    return {user, relations: await this.getUserRelations(user.id)};
  }

  // endregion

  // region Relation

  /**
   * 根据关系获取用户
   */
  public getRelation(type: RelationType, id: string) {
    const processor = relationRegister.getProcessor(type);
    return processor.getRelById(id);
  }

  /**
   * 根据关系登陆
   */
  public async loginByRelation(type: RelationType, id: string) {
    return await this.findUserByRelation(type, id) ||
      await this.createUserByRelation(type, id)
  }

  /**
   * 根据关系创建用户
   */
  public async createUserByRelation(type: RelationType, id: string) {
    // if (type == RelationType.Address)
    //   await this.addRegisteredCredentials(id); // 给地址添加 RegisteredCredentials

    const clazz = relationRegister.getClazz(type);

    const user = await User.create();
    console.log("createUserByRelation", RelationType[type], id, user.id);
    const rel = await clazz.create({id, userId: user.id});

    return {user, relations: [rel]};
  }

  /**
   * 根据关系获取用户
   */
  public async getUserByRelation(
    type: RelationType, id: string, withRelation = true) {
    const res = await this.findUserByRelation(type, id, withRelation);
    if (!res) throw new NotFoundError("User");

    return res;
  }

  /**
   * 根据关系获取用户
   */
  public async findUserByRelation(
    type: RelationType, id: string, withRelation = true) {
    const processor = relationRegister.getProcessor(type);
    const rel = await processor.getRelById(id, false);
    const user = rel && await User.findByPk(rel.userId);
    if (!user) return null;

    if (!withRelation) return {user};

    return {user, relations: await this.getUserRelations(user.id)};
  }

  /**
   * 获取用户的关系列表
   * @param userId
   */
  public async getUserRelations(userId: string) {
    const relEntries = Array.from(relationRegister.values());
    return (await Promise.all(
      relEntries.map(re => re.processor.findAllRel(userId))
    )).flat();
  }

  /**
   * 绑定关系
   * @param userId
   * @param type
   * @param params
   */
  public async bindRelation<T extends RelationType = RelationType>(
    userId: string, type: T, params: RelationBindParams[T]) {
    return relationRegister.getProcessor(type)?.setRel(userId, params)
  }

  /**
   * 解绑关系
   * @param userId
   * @param type
   * @param id
   */
  public async unbindRelation(userId: string, type: RelationType, id?: string) {
    return relationRegister.getProcessor(type)?.deleteRel(userId, id)
  }

  // endregion

  // region SecretInfo

  public async registerCommitment(relation: Relation, commitment: string) {
    if (relation.commitment == commitment) return;

    const pushRes = await commitmentMgr().push(relation.id, commitment)

    relation.commitment = commitment;
    relation.commitmentReceipt = pushRes.commitmentReceipt;

    await relation.save();
  }

  // endregion

  // Validations

  public async isNewRelation(id: string, type: RelationType, throw_ = false) {
    if (throw_ && !id) throw new BaseError(600, "Id not correct")
    if (!id) return false;

    if (type == RelationType.Address) {
      const user = await User.findOne({where: {mintAddress: id}})
      if (throw_ && user) throw new ExistError("Mint Address");
      if (user) return false
    }

    const clazz = relationRegister.getClazz(type);
    const relation = await clazz.findOne({ where: {id} })

    if (throw_ && relation) throw new ExistError("Relation");
    return !relation
  }
  public async isNewEmail(email: string, throw_ = false) {
    if (!StringUtils.validateEmail(email)) {
      if (throw_) throw new BaseError(600, "Email not correct")
      return false;
    }
    const user = await User.findOne({where: {email}})
    if (throw_ && user) throw new ExistError("User");
    return !user
  }

  // endregion

  // region Code

  public async sendCode(type: CodeType, email: string,
                        seconds = UserConfig().codeExpiredSeconds || DefaultCodeExpiredSeconds) {
    const code = MathUtils.randomString(6, "0123456789");
    await cacheMgr().setKV(`${type}:${EmailCodeKey}:${email}`, code, seconds);

    await resendMgr().sendEmail(EmailType.Code, email, { code })
  }

  public async verifyCode(type: CodeType, email: string, code: string) {
    const key = `${type}:${EmailCodeKey}:${email}`;
    const cachedCode = await cacheMgr().getKV(key);
    const res = cachedCode != code;
    if (res) await cacheMgr().deleteKV(key);
    return res
  }

  // endregion

}

