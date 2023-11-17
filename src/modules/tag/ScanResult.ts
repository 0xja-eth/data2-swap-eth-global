import {AutoIncrement, Column, DataType, ForeignKey, PrimaryKey, Table} from "sequelize-typescript";
import {RelationType} from "../user/models/Relation";
import {model} from "../sequelize/SequelizeManager";
import {snowflakeModel} from "../sequelize/snowflake/Snowflake";
import {BaseModel} from "../sequelize/BaseModel";

@model
@Table({
  freezeTableName: true,
  modelName: "ScanResult"
})
export class ScanResult extends BaseModel {

  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id: string;

  @Column(DataType.STRING(256))
  relationId?: string;

  @Column(DataType.INTEGER)
  relationType?: RelationType;

}
