import {Address} from "../../modules/user/models/Address";
import Twitter from "../../modules/user/models/oauth/Twitter";
import Github from "../../modules/user/models/oauth/Github";
import {Relation, RID} from "../../modules/user/models/Relation";
import {ScannerEnvironment} from "../ScannerEnvironment";
import Discord from "../../modules/user/models/oauth/Discord";
import {ModelStatic} from "sequelize-typescript";
import {ModelCtor} from "sequelize-typescript/dist/model/model/model";
import {User} from "../../modules/user/models/User";

export default async function(se: ScannerEnvironment): Promise<[RID, number][]> {
  const users = await User.findAll({
    order: [['createdAt', 'ASC']] // 按创建时间升序排列
  })
  const rClasses: ModelCtor<Relation>[] = [Address, Twitter, Github, Discord]

  const relations = await Promise.all(rClasses.map(clazz => clazz.findAll()))
  return relations.flat().map(
    r => [r.toRID(), users.findIndex(u => u.id = r.userId) + 1]
  )
}
