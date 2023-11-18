import {BaseScanner, scanner} from "./BaseScanner";
import {Relation, RID} from "../../user/models/Relation";
import {ModelCtor} from "sequelize-typescript/dist/model/model/model";
import {Address} from "../../user/models/Address";
import Twitter from "../../user/models/oauth/Twitter";
import Github from "../../user/models/oauth/Github";
import Discord from "../../user/models/oauth/Discord";
import {Web3BioRelation} from "../../user/Web3BioManager";

@scanner("EarlyAdopter")
export class EarlyAdopter extends BaseScanner {

  scanForAll = async () => {
    const rClasses: ModelCtor<Relation>[] = [Address, Twitter, Github, Discord, Web3BioRelation]
    const relations = await Promise.all(rClasses.map(clazz => clazz.findAll()))
    return relations.flat().map(r => [r.toRID(), 1] as [RID, number])
  }

  scanForRelations = async (relations: Relation[]) => {
    return relations.map(r => [r.toRID(), 1] as [RID, number])
  }
}
