import {OAuthRelation} from "../OAuthRelation";
import {AllowNull, Table} from "sequelize-typescript";
import {model} from "../../../sequelize/SequelizeManager";
import {JSONColumn} from "../../../sequelize/BaseModel";
import {RelationState} from "../Relation";

export type ClientToken = {
  refresh_token?: string;
  access_token?: string;
  token_type?: string;
  expires_at?: Date;
  scope?: string;
}

@model
@Table({
  timestamps: true,
  freezeTableName: true,
  modelName: "Twitter"
})
export default class Twitter extends OAuthRelation {

  @AllowNull(true)
  @JSONColumn<ClientToken>("long",
    res => ({
      ...res, expires_at: new Date(res?.expires_at)
    }))
  clientToken: ClientToken;

  toJSON() {
    const res = super.toJSON();

    delete res["clientToken"];

    return res;
  }
}
