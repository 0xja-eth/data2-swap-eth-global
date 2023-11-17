import {get} from "../http/NetworkManager";
import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {errorCatcher} from "../../utils/ErrorUtils";
import {RelationBindParams, RelationType} from "./models/Relation";
import {BaseRelationProcessor, relationRegister} from "./processors/RelationProcessor";
import {signMgr} from "./SignManager";
import {User} from "./models/User";
import {ExistError} from "../http/utils/ResponseUtils";
import {Address} from "./models/Address";
import Twitter from "./models/oauth/Twitter";
import Discord from "./models/oauth/Discord";
import Github from "./models/oauth/Github";

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

class Web3BioProcessor<T extends RelationType> extends BaseRelationProcessor<T> {

  private _type: T

  public constructor(type: T) {
    super();
    this._type = type
  }

  public get type() { return this._type; }

  public async setRel(userId: string, params: Web3BioLink) {
    const [res] =  await this.clazz.findOrCreate({
      where: {userId, id: params.link, name: params.handle},
    });
    return res;
  }
}

relationRegister.add(RelationType.Twitter, {
  clazz: Twitter, processor: new Web3BioProcessor(RelationType.Twitter)
})
relationRegister.add(RelationType.Github, {
  clazz: Github, processor: new Web3BioProcessor(RelationType.Github)
})
relationRegister.add(RelationType.Discord, {
  clazz: Discord, processor: new Web3BioProcessor(RelationType.Discord)
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

    const res = []
    for (const web3Bio of web3Bios)
      res.push(...await this.syncWeb3Bio(userId, web3Bio))

    return res;
  }
  private async syncWeb3Bio(userId: string, web3Bio: Web3BioProfile) {
    return await Promise.all(
      Object.keys(web3Bio.links).map((key) => {
        const link = web3Bio.links[key as Web3BioLinkType]
        if (!link) return null

        const type = RelationType[key.toUpperCase() as keyof typeof RelationType]
        const processor = relationRegister.getProcessor(type)
        return processor?.setRel(userId, link);
      }).filter((v) => !!v)
    )
  }
}

