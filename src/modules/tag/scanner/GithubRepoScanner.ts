import {BaseScanner, scanner} from "./BaseScanner";
import {Relation, RelationType, RID} from "../../user/models/Relation";
import {ModelCtor} from "sequelize-typescript/dist/model/model/model";
import {Address} from "../../user/models/Address";
import Twitter from "../../user/models/oauth/Twitter";
import Github from "../../user/models/oauth/Github";
import Discord from "../../user/models/oauth/Discord";
import {Web3BioRelation} from "../../user/Web3BioManager";
import {splitArray} from "../../../utils/ArrayUtils";
import {githubMgr, GithubRepo} from "../../github/Github";
import {addrInclude} from "../../../utils/AddressUtils";

const ChunkSize = 3

export abstract class GithubRepoScanner extends BaseScanner {

  get relationTypes(): RelationType[] { return [RelationType.Github]; }

  abstract get languages(): string[]

  scanForRelations = async (relations: Github[]) => {
    const relationGroups = splitArray(relations, ChunkSize)

    const userRepos: {relation: Relation, repos: GithubRepo[]}[] = []
    for (const relations of relationGroups)
      userRepos.push(...await Promise.all(relations.map(
        async r => ({ relation: r, repos: await githubMgr().getRepos(r.name) })
      )))

    return userRepos.map(({relation, repos}) => [
      relation.toRID(),
      repos.filter(r => addrInclude(this.languages, r.language)).length
    ] as [RID, number]).filter(([_, count]) => count > 0)
  }
}

@scanner("SolidityDev")
export class SolidityDev extends GithubRepoScanner {
  get languages(): string[] { return ["solidity"] }
}

@scanner("MoveDev")
export class MoveDev extends GithubRepoScanner {
  get languages(): string[] { return ["move"] }
}

@scanner("Web3Dev")
export class Web3Dev extends GithubRepoScanner {
  get languages(): string[] { return ["solidity", "move"] }
}

@scanner("PythonDev")
export class PythonDev extends GithubRepoScanner {
  get languages(): string[] { return ["python"] }
}

@scanner("GoDev")
export class GoDev extends GithubRepoScanner {
  get languages(): string[] { return ["go"] }
}

@scanner("JavaDev")
export class JavaDev extends GithubRepoScanner {
  get languages(): string[] { return ["java"] }
}

@scanner("JSOrTsDev")
export class JSOrTsDev extends GithubRepoScanner {
  get languages(): string[] { return ["javascript", "typescript", "js", "ts"] }
}

@scanner("RustDev")
export class RustDev extends GithubRepoScanner {
  get languages(): string[] { return ["rust"] }
}
