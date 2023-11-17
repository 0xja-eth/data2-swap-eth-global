import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {relationRegister} from "./processors/RelationProcessor";
import {RelationType} from "./models/Relation";
import {TwitterProcessor} from "./processors/TwitterProcessor";

export function oauthMgr() {
  return getManager(OAuthManager)
}

@manager
export class OAuthManager extends BaseManager {

}
