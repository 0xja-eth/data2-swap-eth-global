import {BaseModel} from "../../sequelize/BaseModel";
import {model} from "../../sequelize/SequelizeManager";
import {snowflakeModel} from "../../sequelize/snowflake/Snowflake";
import {Column, DataType, HasMany, PrimaryKey, Table, Unique} from "sequelize-typescript";
import {BenefitEmailTemplate} from "./BenefitEmailTemplate";

@model
@snowflakeModel
@Table({
  freezeTableName: true,
  timestamps: true,
  modelName: "BenefitApp"
})
export class BenefitApp extends BaseModel {

  @PrimaryKey
  @Column(DataType.BIGINT)
  id!: string;

  @Unique
  @Column(DataType.STRING(64))
  name!: string;

  @Column(DataType.STRING(256))
  link!: string;

  @HasMany(() => BenefitEmailTemplate)
  templates?: Partial<BenefitEmailTemplate>[];
}
