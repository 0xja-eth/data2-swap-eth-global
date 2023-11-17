import {ModelCtor} from "sequelize-typescript/dist/model/model/model";
import {BaseError, ExistError, NotFoundError} from "../../http/utils/ResponseUtils";
import {BaseRegister} from "../../../app/BaseRegister";
import {RelationState, Relation, RelationBindParams, RelationType} from "../models/Relation";

class RelationRegister extends BaseRegister<RelationType, {
  clazz: ModelCtor<Relation>
  processor: BaseRelationProcessor<RelationType>
}> {
  public getClazz<T extends ModelCtor<Relation>
    = ModelCtor<Relation>>(type: RelationType) {
    return this.get(type)?.clazz as T
  }
  public getProcessor<T extends BaseRelationProcessor<RelationType>
    = BaseRelationProcessor<RelationType>>(type: RelationType) {
    return this.get(type)?.processor as T
  }

  public getByClazz<T extends ModelCtor<Relation>>(data?: T) {
    for (const entry of this.map.entries())
      if (entry[1].clazz == data) return entry[0];
    return this.defaultType;
  }
}
export const relationRegister = new RelationRegister();

export class RelationMissingError<T extends RelationType> extends BaseError {
  constructor(type: T, payload?) {
    super(800, `${RelationType[type]} Missing Error`, {type, ...payload});
  }
}

export abstract class BaseRelationProcessor<T extends RelationType> {

  public abstract get type(): T

  public get typeName() {
    return RelationType[this.type]
  }

  public get clazz() {
    return relationRegister.getClazz(this.type) as ModelCtor<Relation>;
  }

  // region 业务操作

  /**
   * 设置关系
   */
  public abstract setRel(userId: string, params: RelationBindParams[T] | any): Promise<Relation>;

  /**
   * 获取关系，如果没有找到，抛出800错误
   */
  public async getRel(userId: string,
                      includeExpired = false) {
    const res = await this.findRel(userId, includeExpired)
    if (!res) throw new RelationMissingError(this.type);
    return res;
  }

  // /**
  //  * 获取关系，如果没有找到，抛出800错误
  //  */
  // public abstract findRelByParams(userId: string, params: RelationBindParams[T] | any): Promise<Relation>;

  /**
   * 获取关系
   */
  public async findRel(userId: string,
                       includeExpired = false) {
    return await this.clazz.findOne({
      where: includeExpired ? {userId} : {userId, state: RelationState.Normal}
    })
  }

  /**
   * 获取关系
   */
  public async findAllRel(userId: string,
                          includeExpired = false) {
    return await this.clazz.findAll({
      where: includeExpired ? {userId} : {userId, state: RelationState.Normal}
    })
  }

  /**
   * 通过ID获取关系
   */
  public async getRelById(id: string, throw_ = true) {
    const res = await this.clazz.findByPk(id);
    if (!res && throw_) throw new NotFoundError(this.typeName);
    return res;
  }

  /**
   * 删除关系
   */
  public async deleteRel(userId: string, id?: string) {
    if (!id) {
      const rel = await this.getRel(userId);
      await rel.destroy();
    } else {
      const rel = await this.getRelById(id);
      if (rel.userId != userId) throw new NotFoundError(this.typeName);
      await rel.destroy();
    }
  }

  /**
   * 删除关系
   */
  public async deleteAllRel(userId: string) {
    await this.clazz.destroy({ where: {userId} })
  }

  // endregion
}
