import {BaseModel, EnumColumn, JSONColumn} from "../../sequelize/BaseModel";
import {AllowNull, Column, DataType, Default, ForeignKey, PrimaryKey} from "sequelize-typescript";
import {ModelCtor} from "sequelize-typescript/dist/model/model/model";
import {SignInfo} from "../SignManager";

export enum RelationType {
  Address, Twitter, Discord, Github, Lens, Solana
}

export type RelationBindParams = {
  [RelationType.Address]: SignInfo // Address
  [RelationType.Twitter]: { code: string } // Twitter
  [RelationType.Discord]: { code: string, redirect?: string } // Discord
  [RelationType.Github]: { code: string } // Github
  [RelationType.Lens]: { code: string } // Lens
  [RelationType.Solana]: {
    signature: string // Hex
    message: string // Hex
    publicKey: string // Base58
  } // Solana
}

export enum RelationState {
  Normal = "Normal",
  Expired = "Expired"
}

export interface IRelation {
  id: string,
  type: RelationType,
  userId?: string
}

export abstract class Relation extends BaseModel implements IRelation {

  @PrimaryKey
  @Column(DataType.STRING(256))
  id!: string;

  @AllowNull(false)
  @Column
  name!: string;

  @ForeignKey(() => User)
  @Column(DataType.BIGINT)
  userId!: string;

  @Column(DataType.STRING(256))
  commitment?: string;

  @JSONColumn
  commitmentReceipt?: string[];

  @AllowNull(false)
  @Default(RelationState.Normal)
  @EnumColumn(RelationState)
    // @Column(DataType.ENUM(SMState.Normal, SMState.Expired))
  state: RelationState // SMState.Expired 表示需要重新授权

  get type() {
    return relationRegister.getByClazz(this.constructor as ModelCtor<Relation>);
  }

  public toRID() { return `${this.type}:${this.id}`; }

  public toJSON() {
    const res = super.toJSON<this & {type: RelationType}>();
    res.type = this.type;
    return res;
  }
}

import {relationRegister} from "../processors/RelationProcessor";
import {User} from "./User";
