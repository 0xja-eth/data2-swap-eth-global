import {BaseModel, DateTimeColumn, EnumColumn, JSONColumn} from "../../sequelize/BaseModel";
import {model} from "../../sequelize/SequelizeManager";
import {snowflakeModel} from "../../sequelize/snowflake/Snowflake";
import {AllowNull, Column, DataType, Default, ForeignKey, PrimaryKey, Table} from "sequelize-typescript";
import {User} from "../../user/models/User";
import {Tag} from "./Tag";

export enum UserTagState {
  Normal = "Normal", Hidden = "Hidden"
}

@model
@snowflakeModel
@Table({
  freezeTableName: true,
  modelName: "UserTag"
})
export class UserTag extends BaseModel {

  @PrimaryKey
  @Column(DataType.BIGINT)
  id!: string;

  @ForeignKey(() => User)
  @Column(DataType.BIGINT)
  userId!: string;

  @ForeignKey(() => Tag)
  @Column(DataType.BIGINT)
  tagId!: string;

  @AllowNull(false)
  @Default(UserTagState.Normal)
  @EnumColumn(UserTagState)
  state: UserTagState
}
