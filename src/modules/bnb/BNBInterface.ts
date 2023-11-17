import {BaseInterface, body, post, route} from "../http/InterfaceManager";
import {getContract} from "../web3/ethereum/core/ContractFactory";

@route("/bnb")
export class BNBInterface extends BaseInterface {

  @post("/buy")
  async buy(@body("address") address: string,
            @body("cid") cid: string) {
    const contract = getContract("DataSwap")
    const count = await contract.methods.buyRecords(address, cid).call()

  }

  @post("/send")
  async send() {

  }
}
