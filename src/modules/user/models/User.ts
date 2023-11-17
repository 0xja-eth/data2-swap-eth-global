import {BaseModel, DateTimeColumn} from "../../sequelize/BaseModel";
import {model} from "../../sequelize/SequelizeManager";
import {snowflakeModel} from "../../sequelize/snowflake/Snowflake";
import {Column, DataType, ForeignKey, PrimaryKey, Table} from "sequelize-typescript";
import {BenefitRecord} from "../../benefit/models/BenefitRecord";

@model
@snowflakeModel
@Table({
  freezeTableName: true,
  modelName: "User"
})
export class User extends BaseModel {

  @PrimaryKey
  @Column(DataType.BIGINT)
  id: string;

  @Column(DataType.STRING(512))
  avatar?: string;

  @Column(DataType.STRING(256))
  name?: string;

  @Column(DataType.STRING(256))
  email?: string;

  @Column(DataType.BIGINT)
  sbtId?: string;

  @Column(DataType.STRING(256))
  mintAddress?: string;

  @DateTimeColumn
  mintTime?: number

  @DateTimeColumn
  welcomeTime?: number

  @ForeignKey(() => BenefitRecord)
  @Column(DataType.BIGINT)
  welcomeBenefitId?: string
}
