import {BaseModel, JSONColumn} from "../../sequelize/BaseModel";
import {model} from "../../sequelize/SequelizeManager";
import {snowflakeModel} from "../../sequelize/snowflake/Snowflake";
import {Column, DataType, ForeignKey, PrimaryKey, Table} from "sequelize-typescript";
import {BenefitApp} from "./BenefitApp";

export type RewardType = "fixed" | "tag-dp-rate" | "all-dp-rate"
export type Reward = number | // $
  {
    type: RewardType
    value: number
  }

@model
@snowflakeModel
@Table({
  freezeTableName: true,
  timestamps: true,
  modelName: "BenefitEmailTemplate"
})
export class BenefitEmailTemplate extends BaseModel {

  @PrimaryKey
  @Column(DataType.BIGINT)
  id!: string;

  @ForeignKey(() => BenefitApp)
  @Column(DataType.BIGINT)
  appId!: string;

  // @ForeignKey(() => Credential)
  // @Column(DataType.BIGINT)
  @JSONColumn
  credentialIds?: string[];

  @Column(DataType.STRING(256))
  title!: string;

  @Column(DataType.TEXT("long"))
  content!: string;

  @Column(DataType.STRING(64))
  action!: string;

  @JSONColumn
  deliveredReward?: Reward;

  @JSONColumn
  openReward?: Reward

  @JSONColumn
  clickReward?: Reward

}
