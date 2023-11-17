import {BaseInterface, body, custom, del, get, post, put, query, route} from "../http/InterfaceManager";
import {RelationBindParams, RelationType} from "./models/Relation";
import {auth, AuthType, Payload} from "./AuthManager";
import {userMgr} from "./UserManager";
import {relationRegister} from "./processors/RelationProcessor";
import {TwitterProcessor} from "./processors/TwitterProcessor";

@route("/oauth")
export class UserInterface extends BaseInterface {

  @get("/twitter/connect")
  @auth(AuthType.Normal)
  async connectTwitter(@query("redirect", true) redirect: string,
                       @custom("auth") _auth: Payload) {
    const processor = relationRegister.getProcessor(RelationType.Twitter) as TwitterProcessor;
    const redirectURL = processor.getRequestURL(_auth.user.id, redirect);
    return { redirectURL };
  }
}
