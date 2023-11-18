import {BaseInterface, get, route} from "../http/InterfaceManager";
import {Tag, TagState} from "./models/Tag";
import {RootResults} from "./TagManager";

@route("/tag")
export class TagInterface extends BaseInterface {

  @get("/tags")
  async tags() {
    return await Tag.findAll({
      where: {state: TagState.Active}
    });
  }

  @get("/scanResult")
  async scanResult() {
    return { rootResults: RootResults }
  }
}
