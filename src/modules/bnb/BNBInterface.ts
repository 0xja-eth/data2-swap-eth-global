import {BaseInterface, post, route} from "../http/InterfaceManager";

@route("/bnb")
export class BNBInterface extends BaseInterface {

  @post("/buy")
  async buy() {

  }

  @post("/send")
  async send() {

  }
}
