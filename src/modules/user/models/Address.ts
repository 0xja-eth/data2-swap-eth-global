import {BaseModel} from "../../sequelize/BaseModel";
import {model} from "../../sequelize/SequelizeManager";
import {snowflakeModel} from "../../sequelize/snowflake/Snowflake";
import {Column, DataType, PrimaryKey, Table} from "sequelize-typescript";
import {Relation} from "./Relation";

@model
@snowflakeModel
@Table({
  freezeTableName: true,
  modelName: "Address"
})
export class Address extends Relation {

  public get address() { return this.id; }

}
