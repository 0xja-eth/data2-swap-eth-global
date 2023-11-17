import {BaseModel, JSONColumn} from "../sequelize/BaseModel";
import {model} from "../sequelize/SequelizeManager";
import {Column, DataType, Default, PrimaryKey, Table} from "sequelize-typescript";

export type EventRecorderId = `${number}-${string}-${string}-${string}`

@model
@Table({
  timestamps: true,
  freezeTableName: true,
  modelName: "EventRecorder"
})
export class EventRecorder extends BaseModel {

  @PrimaryKey
  @Column(DataType.STRING(256))
  id: EventRecorderId

  @JSONColumn
  fields: string[]

  @Default(0)
  @Column(DataType.INTEGER)
  scannedBlockNumber?: number;

  @JSONColumn
  processedIds: string[]

  @Default(true)
  @Column(DataType.BOOLEAN)
  enabled?: boolean;

  public get gid() { return this.id.split("-")[0] }
  public get gSlug() { return this.id.split("-")[1] }
  public get gVersion() { return this.id.split("-")[2] }
  public get eName() { return this.id.split("-")[3] }

  public static makeId(gid: number | string, gSlug: string, gVersion: string, eName: string) {
    return `${gid}-${gSlug}-${gVersion}-${eName}` as EventRecorderId
  }
}
