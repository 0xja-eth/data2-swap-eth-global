import {BaseModel} from "../../sequelize/BaseModel";
import {model} from "../../sequelize/SequelizeManager";
import {Column, DataType, ForeignKey, PrimaryKey, Table} from "sequelize-typescript";
import {User} from "../../user/models/User";
import {BenefitRecord} from "./BenefitRecord";
import {BenefitEmailTemplate} from "./BenefitEmailTemplate";

@model
@Table({
  freezeTableName: true,
  timestamps: true,
  modelName: "BenefitEmail"
})
export class BenefitEmail extends BaseModel {

  @PrimaryKey
  @Column(DataType.STRING(128))
  id!: string; // send id

  @Column(DataType.STRING(256))
  to!: string;

  @ForeignKey(() => User)
  @Column(DataType.BIGINT)
  userId!: string;

  @ForeignKey(() => BenefitEmailTemplate)
  @Column(DataType.BIGINT)
  templateId!: string;

  @ForeignKey(() => BenefitRecord)
  @Column(DataType.BIGINT)
  deliveredBenefitId?: string

  @ForeignKey(() => BenefitRecord)
  @Column(DataType.BIGINT)
  openBenefitId?: string

  @ForeignKey(() => BenefitRecord)
  @Column(DataType.BIGINT)
  clickBenefitId?: string
}
