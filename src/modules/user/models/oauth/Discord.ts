import {OAuthRelation} from "../OAuthRelation";
import {AllowNull, Column, DataType, Table} from "sequelize-typescript";
import {model} from "../../../sequelize/SequelizeManager";
import {RelationState} from "../Relation";

@model
@Table({
  timestamps: true,
  freezeTableName: true,
  modelName: "Discord"
})
export default class Discord extends OAuthRelation {

  @AllowNull(true)
  @Column(DataType.STRING(100))
  refresh?: string;

  toJSON() {
    const res = super.toJSON();

    delete res["refresh"];

    return res;
  }
}
