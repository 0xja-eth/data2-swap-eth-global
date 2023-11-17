import {BaseInterface, body, get, post, query, route} from "../http/InterfaceManager";
import {signMgr, SignType} from "./SignManager";

@route("/sign")
export class SignInterface extends BaseInterface {

  @get("/")
  async getDataToSign(
    @query("address") address: string,
    @query("type") type: SignType) {
    return {
      data: signMgr().getData2Sign(address, type)
    }
  }

  @post("/verify")
  async verifySign(
    @body("address") address: string,
    @body("type") type: SignType,
    @body("params") params: {timestamp: string} & any,
    @body("signature") signature: string) {

    return signMgr().verifySign({address, type, signature, params})
  }
}
