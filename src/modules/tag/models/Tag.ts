import {BaseModel, DateTimeColumn, EnumColumn, JSONColumn} from "../../sequelize/BaseModel";
import {model} from "../../sequelize/SequelizeManager";
import {snowflakeModel} from "../../sequelize/snowflake/Snowflake";
import {AllowNull, Column, DataType, Default, PrimaryKey, Table} from "sequelize-typescript";

export enum TagState {
  Active = "Active",
  Hidden = "Hidden"
}

@model
@snowflakeModel
@Table({
  freezeTableName: true,
  modelName: "Tag"
})
export class Tag extends BaseModel {

  @PrimaryKey
  @Column(DataType.BIGINT)
  id!: string;

  @Column(DataType.STRING(256))
  name!: string;

  @Column(DataType.STRING(256))
  curator!: string;

  @Column(DataType.STRING(256))
  description!: string;

  @Default(10)
  @Column(DataType.INTEGER)
  dataPower!: number;

  @AllowNull
  @JSONColumn("long")
  rules: Rule[]; // Null => Registered address

  @Column(DataType.STRING(256))
  addressesRoot: string;

  @AllowNull(false)
  @Default(TagState.Active)
  @EnumColumn(TagState)
  state: TagState
}

export type ValueCompare = "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "notin"

/**
 * 提交字段
 **/
export type Rule = {
  groupName: string

  // timestamp?: number
  value?: number | number[]
  compare?: ValueCompare
};
