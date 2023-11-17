import JWT, {JwtPayload} from "jsonwebtoken";
import fs from "fs";
import {makeMiddle} from "../http/InterfaceManager";
import {BaseError} from "../http/utils/ResponseUtils";
import {config, env} from "../../config/ConfigManager";
import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {ethereum} from "../web3/ethereum/EthereumManager";
import {RelationType} from "./models/Relation";
import {User} from "./models/User";
import {userMgr} from "./UserManager";
import UserConfig from "./configs/UserConfig";

export interface Payload extends JwtPayload {
	type: RelationType
	id: string
	params?: {timestamp: number} & any
	user?: User
	count?: number // 调用次数
}

const JWTExpireTime = 60 * 60 * 24 * 3;
//const CertKey = fs.readFileSync(".ssh/certKey");

export enum AuthType {
	Normal, Super
}

export function auth(type: AuthType = AuthType.Normal,
										 getUser = true, throw_ = true) {
	return (obj, key, desc) => {
		makeMiddle(obj, key, desc, "auth", async (req, _) => {
			let res: Payload
			try {
				const token = req.header('Authorization');

				if (type == AuthType.Super)
					return authMgr().verifySuperAdmin(token);

				res = authMgr().processKey(token);

				if (getUser)
					res.user = (await userMgr().getUserByRelation(
						res.type, res.id, false)).user;
			} catch (e) {
				if (throw_) throw e;
				else console.error("Auth error: ", e);
			}
			return res;
		});
	}
}

export async function banProd(obj, key, desc) {
	makeMiddle(obj, key, desc, async () => {
		if (env() == "prod")
			throw new BaseError(403, "invalid request");
	});
}

export function authMgr() {
	return getManager(AuthManager);
}

@manager
class AuthManager extends BaseManager {
	private certKey: string;

	onStart() {
		super.onStart();
		this.certKey = UserConfig().certKey ||= "contriNB";
	}

	/**
	 * Key签发
	 */
	public generateKey(payload: Payload) {
		// TODO: 可以在这里离做自定义实现
		return JWT.sign(payload, this.certKey, {expiresIn: JWTExpireTime});
	}

	/**
	 * Key校验
	 */
	public verifyKey(key) {
		// TODO: 可以在这里离做自定义实现
		let res: {
			success: boolean, errMsg?: string, payload?: Payload
		};
		JWT.verify(key, this.certKey, (err, decoded) => {
			res = err ?
				{success: false, errMsg: err.message} :
				{success: true, payload: decoded};
			if (!err) {
				delete decoded.iat;
				delete decoded.exp;
			}
		})
		return res;
	}

	public processKey(key) {
		let res = this.verifyKey(key);
		// JWT异常
		if (!res.success) throw new BaseError(403, "Key Verify Error", res);
		return res.payload;
	}

	public async verifySuperAdmin(adminKey) {
		const secretKey = UserConfig().superAdminSecret;
		if (secretKey !== adminKey)
			throw new BaseError(403, "Admin Key Verify Error");
	}

}
