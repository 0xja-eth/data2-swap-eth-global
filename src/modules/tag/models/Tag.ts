import {BaseModel, DateTimeColumn, EnumColumn, JSONColumn} from "../../sequelize/BaseModel";
import {model} from "../../sequelize/SequelizeManager";
import {snowflakeModel} from "../../sequelize/snowflake/Snowflake";
import {AllowNull, Column, DataType, Default, PrimaryKey, Table} from "sequelize-typescript";
import { Rule } from "../data/ScanWorks";
import {bucketMgr} from "../../aws/bucket/Bucket";
import {scanMgr} from "../ScanManager";

export enum CredentialState {
  Active = "Active",
  Hidden = "Hidden"
}
export enum CredentialPriority {
  RealTime, Normal, Lazy
}

@model
@snowflakeModel
@Table({
  freezeTableName: true,
  modelName: "Credential"
})
export class Credential extends BaseModel {

  @PrimaryKey
  @Column(DataType.BIGINT)
  id!: string;

  @Column(DataType.STRING(256))
  name!: string;

  @Column(DataType.STRING(256))
  curator!: string;

  @Default(10)
  @Column(DataType.INTEGER)
  dataPower!: number;

  @Default(0)
  @Column(DataType.INTEGER)
  expiredTime: number // Address过期时间（毫秒），0表示静态

  @DateTimeColumn
  lastScanTime: number // 上次扫描时间

  @AllowNull
  @JSONColumn("long")
  rules: Rule[]; // Null => Registered address

  @Column(DataType.STRING(256))
  addressesRoot: string;

  // @JSONColumn("long")
  // public get addresses() {
  //   return JSON.parse(bucketMgr().getFile(this.id))
  // };
  // public set addresses(val: string[]) {
  //
  // };

  @Default(CredentialPriority.Normal)
  @Column(DataType.INTEGER)
  priority: CredentialPriority

  @AllowNull(false)
  @Default(CredentialState.Active)
  @EnumColumn(CredentialState)
  state: CredentialState

  public toJSON(toFrontend = true) {
    const res = super.toJSON();
    if (toFrontend) {
      const rules = res.rules.map(rule => scanMgr().rule2Frontend(rule));
      return { ...res, rules }
    }
    return res;
  }
}
