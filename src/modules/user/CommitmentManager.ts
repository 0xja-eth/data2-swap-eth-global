import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {ethereum} from "../web3/ethereum/EthereumManager";
import {BigNumber} from "ethers";
import {poseidon} from "./PoseidonUtils";

import {EddsaAccount} from "@sismo-core/crypto";
import {cacheMgr} from "../cache/CacheManager";

export const CommitmentKey = "commitments";

export function commitmentMgr() {
  return getManager(CommitmentManager)
}

@manager
export class CommitmentManager extends BaseManager {

  private eddsaAccount: EddsaAccount;

  public async getEddsaAccount() {
    if (!this.eddsaAccount) {
      const privateKey = ethereum().account.privateKey;
      this.eddsaAccount ||= await EddsaAccount.generateFromSeed(BigNumber.from(privateKey))
    }
    return this.eddsaAccount
  }

  public async push(address: string, commitment: string) {
    await this.add(address, commitment);
    console.log("[Push Commitment]", address, commitment)

    const account = await this.getEddsaAccount();
    console.log("[Push Commitment] account:", account)

    const message = await poseidon([address, commitment]);
    console.log("[Push Commitment] message:", message)

    const commitmentReceipt = account.sign(message);
    console.log("[Push Commitment] commitmentReceipt:", commitmentReceipt)

    // convert bigNumber receipt to HexString
    const commitmentReceiptHex = commitmentReceipt.map((receipt: BigNumber) =>
      receipt.toHexString()
    );
    const pubKeyHex = account.getPubKey()
      .map((coord: BigNumber) => coord.toHexString());

    return {
      commitmentMapperPubKey: pubKeyHex,
      commitmentReceipt: commitmentReceiptHex,
    };
  }

  public async add(address: string, commitment: string) {
    return cacheMgr().set(CommitmentKey, address, commitment);
  }

  public async get(address: string) {
    return cacheMgr().get(CommitmentKey, address);
  }

}
