import {Address} from "../../modules/user/models/Address";
import Twitter from "../../modules/user/models/oauth/Twitter";
import Github from "../../modules/user/models/oauth/Github";
import {Relation, RID} from "../../modules/user/models/Relation";
import {ScannerEnvironment} from "../ScannerEnvironment";
import Discord from "../../modules/user/models/oauth/Discord";
import {ModelStatic} from "sequelize-typescript";
import {ModelCtor} from "sequelize-typescript/dist/model/model/model";
import {User} from "../../modules/user/models/User";
import {Web3BioRelation} from "../../modules/user/Web3BioManager";
import {githubMgr, GithubRepo} from "../../modules/github/Github";
import {splitArray} from "../../utils/ArrayUtils";
import {Op} from "sequelize";

const ChunkSize = 3

export const append = true
export default async function(se: ScannerEnvironment): Promise<[RID, number][]> {
  const lastScanTime = se.lastScanTime

  const githubs = await Github.findAll({
    where: { createdAt: { [Op.gt]: lastScanTime } }
  });
  const web3BioGithubs = await Web3BioRelation.findAll({
    where: { platform: "github", createdAt: { [Op.gt]: lastScanTime } }
  });
  // const names = githubs.map(g => g.name).concat(web3BioGithubs.map(g => g.name));
  const relations = [...githubs, ...web3BioGithubs]

  const relationGroups = splitArray(relations, ChunkSize)

  const userRepos: {relation: Relation, repos: GithubRepo[]}[] = []
  for (const relations of relationGroups)
    userRepos.push(...await Promise.all(relations.map(
      async r => ({ relation: r, repos: await githubMgr().getRepos(r.name) })
    )))

  return userRepos.map(({relation, repos}) => [
    relation.toRID(),
    repos.filter(r => r.language.toLowerCase() == "python").length
  ] as [RID, number]).filter(([_, count]) => count > 0)
}
