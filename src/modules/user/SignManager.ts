import {StringUtils} from "../../utils/StringUtils";
import {ethereum} from "../web3/ethereum/EthereumManager";
import {authMgr} from "./AuthManager";
import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {BaseError} from "../http/utils/ResponseUtils";
import {RelationType} from "./models/Relation";

export type SignType = "login" | "bind" | "scan" | "zkproof" | "mint"
export type SignInfo = { address: string, type: SignType, params: {timestamp: string} & any, signature: string };

export function signMgr() {
	return getManager(SignManager);
}

@manager
class SignManager extends BaseManager {

	public getData2Sign(address: string, type: SignType) {
		switch (type) {
			// case "login":
			case "bind":
			case "zkproof":
				return `You (${address}) are requesting to ${type}, timestamp is {timestamp}, secret commitment: {commitment}`;
			default:
				return `You (${address}) are requesting to ${type}, timestamp is {timestamp}`;
		}
	}
	public verifySign({address, params, type, signature}: SignInfo, key = true) {
		let data = this.getData2Sign(address, type);
		data = StringUtils.fillData2Str(data, params, false);

		const recAddress = ethereum().web3.eth.accounts.recover(data, signature);
		if (recAddress != address) throw new BaseError(403, "Signature error!");

		// if (type == "scan") // Demo
		// 	userMgr().addRegisteredCredentials(address)
		// 		.then(() => console.log("addRegisteredCredentials success", address))
		// 		.catch(e => console.error("addRegisteredCredentials error", address, e));

		return key && {
			key: authMgr().generateKey({
				type: RelationType.Address,
				id: address, params
			})
		};
	}
}
