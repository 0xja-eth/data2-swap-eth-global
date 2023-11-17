import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {ContractOf, Contracts, getContract} from "../web3/ethereum/core/ContractFactory";
import {Op} from "sequelize";
import {User} from "../user/models/User";
import {BigNumber} from "ethers";
import {BenefitApp} from "../benefit/models/BenefitApp";
import {BenefitEmailTemplate} from "../benefit/models/BenefitEmailTemplate";
import {benefitMgr} from "../benefit/BenefitManager";

import TestData from "./test-data.json"
import {Event, onEvent} from "./EventManager";

export function d2sMgr() {
  return getManager(D2SManager)
}

@manager
export class D2SManager extends BaseManager {
  public dataSwap: ContractOf<"DataSwap">

  public onReady() {
    super.onReady();

    this.dataSwap = getContract("DataSwap")
  }

  @onEvent("Buy")
  private async _onBuy(e: Event<Contracts["DataSwap"], "Buy">) {
    await d2sMgr().onBuy(e)
  }
  private async onBuy(e: Event<Contracts["DataSwap"], "Buy">) {
    const {_buyer, _cid, _count} = e;
    if (Number(_count) < 0) return

    await BenefitApp.findOrCreate({
      where: { name: `dataSwap User: ${_buyer}` }
    })
  }

  @onEvent("Send")
  private async _onSend(e: Event<Contracts["DataSwap"], "Send">) {
    await d2sMgr().onSend(e)
  }
  private async onSend(e: Event<Contracts["DataSwap"], "Send">) {
    const {_sender, _cid, _title, _content} = e;
    await this.send(_sender, _cid.toString(), _title, _content)
  }

  public async send(sender: string, cid: string, title: string, content: string) {
    const app = await BenefitApp.findOne({
      where: { name: `dataSwap User: ${sender}` }
    })

    let data: {[K: string]: string[]} = TestData // TODO: 获取实际数据

    const addresses = data[cid];

    const price = await this.dataSwap.methods.tagPrices(cid).call()
    const benefit = BigNumber.from(price).div(addresses.length)

    const ethPrice = "2100" // ETH Price
    const benefitInUSD = Number(benefit.mul(ethPrice).toString()) / 10e18

    const template = await BenefitEmailTemplate.create({
      appId: app.id, credentialIds: [cid], title, content,
      deliveredReward: benefitInUSD,
    })

    // Release benefit
    await this.dataSwap.methods.release({
      _cid: cid, _addresses: addresses
    }).quickSend()

    const users = await User.findAll({where: {mintAddress: {[Op.in]: addresses}}})
    const res = await benefitMgr().sendBenefitEmails(template.id, users)

    console.log("sendBenefitEmails", res)

    // Send email & push notification
  }
}
