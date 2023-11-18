import {get} from "../http/NetworkManager";
import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {errorCatcher} from "../../utils/ErrorUtils";
import {Relation, RelationBindParams, RelationType} from "./models/Relation";
import {BaseRelationProcessor, relationRegister} from "./processors/RelationProcessor";
import {signMgr} from "./SignManager";
import {User} from "./models/User";
import {ExistError} from "../http/utils/ResponseUtils";
import {Address} from "./models/Address";
import Twitter from "./models/oauth/Twitter";
import Discord from "./models/oauth/Discord";
import Github from "./models/oauth/Github";
import {Column, DataType, Table} from "sequelize-typescript";
import {model} from "../sequelize/SequelizeManager";
import {StringUtils} from "../../utils/StringUtils";
import {removeDuplicates} from "../../utils/ArrayUtils";

export type Web3BioLinkType = "twitter" | "github" | "discord" | "telegram"
export type Web3BioLink = {
  "link": string,
  "handle": string
}
export type Web3BioProfile = {
  "address": string,
  "identity": string,
  "platform": string,
  "displayName": string,
  "avatar": string,
  "email": string,
  "description": string,
  "location": string,
  "header": string,
  "links": { [K in Web3BioLinkType]: Web3BioLink }
}

const Web3BioHost = "https://api.web3.bio"
export const Web3BioGet = get<{address: string}, Web3BioProfile[]>(Web3BioHost, "/profile/:address")

@model
@Table({
  timestamps: true,
  freezeTableName: true,
  modelName: "Web3BioRelation"
})
export class Web3BioRelation extends Relation {

  @Column(DataType.STRING(100))
  platform: Web3BioLinkType

  @Column(DataType.STRING(100))
  link!: string;

  get type() {
    return RelationType[StringUtils.capitalize(this.platform)] || RelationType.Web3Bio
  }
}

class Web3BioProcessor<T extends RelationType> extends BaseRelationProcessor<T> {

  private readonly _type: T

  public constructor(type: T) {
    super();
    this._type = type
  }

  public get type() { return this._type; }

  public async setRel(userId: string, params: {
    link: Web3BioLink, platform: Web3BioLinkType
  }): Promise<Web3BioRelation> {
    const [res] = await this.clazz.findOrCreate({
      where: {id: `${params.platform}-${params.link.handle}`},
      defaults: {
        userId,
        name: params.link.handle,
        link: params.link.link,
        platform: params.platform
      }
    });
    return res as Web3BioRelation;
  }
}

relationRegister.add(RelationType.Twitter, {
  clazz: Web3BioRelation, processor: new Web3BioProcessor(RelationType.Twitter)
})
relationRegister.add(RelationType.Github, {
  clazz: Web3BioRelation, processor: new Web3BioProcessor(RelationType.Github)
})
relationRegister.add(RelationType.Discord, {
  clazz: Web3BioRelation, processor: new Web3BioProcessor(RelationType.Discord)
})
relationRegister.add(RelationType.Web3Bio, {
  clazz: Web3BioRelation, processor: new Web3BioProcessor(RelationType.Web3Bio)
})

export function web3BioMgr() {
  return getManager(Web3BioManager)
}

@manager
export class Web3BioManager extends BaseManager {

  @errorCatcher("syncWeb3Bios")
  public async syncWeb3Bios(userId: string, address: string) {
    const web3Bios = await Web3BioGet({address})
    if (!web3Bios || !web3Bios.length) return

    const res: Web3BioRelation[] = []
    for (const web3Bio of web3Bios)
      res.push(...await this.syncWeb3Bio(userId, web3Bio))

    return removeDuplicates(res);
  }
  private async syncWeb3Bio(userId: string, web3Bio: Web3BioProfile) {
    return await Promise.all(
      Object.keys(web3Bio.links).map((key) => {
        const link = web3Bio.links[key as Web3BioLinkType]
        if (!link) return null

        const type = RelationType[StringUtils.capitalize(key)] || RelationType.Web3Bio
        const processor = relationRegister.getProcessor(type) as Web3BioProcessor<any>
        return processor?.setRel(userId, {
          link, platform: key as Web3BioLinkType
        });
      }).filter((v) => !!v)
    )
  }
}

