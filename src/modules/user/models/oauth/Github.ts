import {model} from "../../../sequelize/SequelizeManager";
import {AllowNull, Column, DataType, Table} from "sequelize-typescript";
import {OAuthRelation} from "../OAuthRelation";

@model
@Table({
    timestamps: true,
    freezeTableName: true,
    modelName: "Github"
})
export default class Github extends OAuthRelation {}
