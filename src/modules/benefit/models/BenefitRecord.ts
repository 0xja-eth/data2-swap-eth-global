import {BaseModel, JSONColumn} from "../../sequelize/BaseModel";
import {model} from "../../sequelize/SequelizeManager";
import {snowflakeModel} from "../../sequelize/snowflake/Snowflake";
import {Column, DataType, ForeignKey, PrimaryKey, Table} from "sequelize-typescript";

export type BenefitType = "delivered" | "open" | "click" | "airdrop"

@model
@snowflakeModel
@Table({
  freezeTableName: true,
  timestamps: true,
  modelName: "BenefitRecord"
})
export class BenefitRecord extends BaseModel {

  @PrimaryKey
  @Column(DataType.BIGINT)
  id!: string;

  @ForeignKey(() => User)
  @Column(DataType.BIGINT)
  userId!: string;

  @JSONColumn
  credentialIds?: string[];

  /**
   * @deprecated
   */
  @ForeignKey(() => Credential)
  @Column(DataType.BIGINT)
  credentialId!: string;

  @Column({
    type: DataType.DECIMAL(32, 6),
    get() { return Number(this.getDataValue("value")) }
  })
  value!: number; // $

  @Column(DataType.STRING(64))
  app!: string;

  @Column(DataType.STRING(256))
  link!: string;

  @Column(DataType.STRING(64))
  action!: string;

  @Column(DataType.STRING(12))
  type!: BenefitType;

  @Column(DataType.STRING(256))
  txHash: string;

  toJSON() {
    const json = super.toJSON();
    return { ...json, createdAt: Date.parse(this.createdAt) || Date.now() };
  }
}

import {User} from "../../user/models/User";
import {Credential} from "../../scan/models/Credential";
