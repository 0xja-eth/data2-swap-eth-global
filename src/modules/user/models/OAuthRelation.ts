import {DateTimeColumn} from "../../sequelize/BaseModel";
import {AllowNull, Column, DataType} from "sequelize-typescript";
import {Relation} from "./Relation";

export abstract class OAuthRelation extends Relation {

  // @Unique
  @AllowNull(false)
  @Column(DataType.STRING(100))
  token!: string;

  @DateTimeColumn
  expireTime?: number;

  toJSON() {
    const res = super.toJSON();

    delete res["token"];
    delete res["expireTime"];
    delete res["state"];

    return res;
  }
}
