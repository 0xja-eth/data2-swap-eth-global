import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {ContractOf, Contracts, getContract} from "../web3/ethereum/core/ContractFactory";
import {Op} from "sequelize";
import {User} from "../user/models/User";
import {BigNumber} from "ethers";
import {BenefitApp} from "../benefit/models/BenefitApp";
import {BenefitEmailTemplate} from "../benefit/models/BenefitEmailTemplate";
import {benefitMgr} from "../benefit/BenefitManager";

import {Event, onEvent} from "../theGraph/EventManager";
import {UserTag, UserTagState} from "../tag/models/UserTag";
import {getIntersection, groupBy} from "../../utils/ArrayUtils";
import {cacheable} from "../cache/Cacheable";
import {Tag} from "../tag/models/Tag";
import {PushNotification} from "../walletConnect/WalletConnect";
import {StringUtils} from "../../utils/StringUtils";
import {pushMgr} from "../push/Push";

export function d2sMgr() {
  return getManager(D2SManager)
}

@manager
export class D2SManager extends BaseManager {
  public data2Swap: ContractOf<"Data2Swap">

  public onReady() {
    super.onReady();

    this.data2Swap = getContract("Data2Swap")
  }

  // @onEvent("Buy")
  // private async _onBuy(e: Event<Contracts["Data2Swap"], "Buy">) {
  //   await d2sMgr().onBuy(e)
  // }
  // private async onBuy(e: Event<Contracts["Data2Swap"], "Buy">) {
  //   const {_buyer, _count} = e;
  //   if (Number(_count) < 0) return
  //
  //   await BenefitApp.findOrCreate({
  //     where: { name: `dataSwap User: ${_buyer}` }
  //   })
  // }

  @cacheable(Array)
  public async getTagIds(key: string) {
    const res: string[] = [];
    while (true) {
      try { res[res.length] = await this.data2Swap.methods.keyTagIds(key, res.length).call() }
      catch (e) { console.log(`getTagIds ${key}, ${res.length} break:`, e); break }
    }
    return res
  }

  @onEvent("Send")
  private async _onSend(e: Event<Contracts["Data2Swap"], "Send">) {
    await d2sMgr().onSend(e)
  }
  private async onSend(e: Event<Contracts["Data2Swap"], "Send">) {
    const {_sender, _key, _title, _content} = e;
    await this.send(_sender, _key, _title, _content)
  }

  public async send(sender: string, key: string, title: string, content: string) {
    // const [app] = await BenefitApp.findOrCreate({
    //   where: { name: `dataSwap User: ${sender}` }
    // })

    const tagIds = await this.getTagIds(key)
    const userTags = await UserTag.findAll({
      where: {tagId: {[Op.in]: tagIds}, state: UserTagState.Normal}
    });
    const userTagGroup = groupBy(userTags, "tagId")
    const userIdsGroup = Object.values(userTagGroup)
      .map(uts => uts.map(ut => ut.userId))
    const userIds = getIntersection(userIdsGroup)
    // const userIds = userTags.map(t => t.userId)
    const users = await User.findAll({
      where: { id: {[Op.in]: userIds}, mintAddress: {[Op.not]: null}}
    })
    if (users.length === 0) return

    const addresses = users.map(u => u.mintAddress)

    const price = await this.data2Swap.methods.getPrice(key).call()
    const benefit = BigNumber.from(price).div(addresses.length)

    const ethPrice = "2100" // ETH Price
    const benefitInUSD = Number(benefit.mul(ethPrice).toString()) / 10e18

    // const template = await BenefitEmailTemplate.create({
    //   appId: app.id, credentialIds: tagIds, title, content,
    //   deliveredReward: benefitInUSD,
    // })

    // Release benefit
    await this.data2Swap.methods.release({
      _key: key, _addresses: addresses
    }).quickSend()

    // const res = await benefitMgr().sendBenefitEmails(template.id, users)
    // console.log("sendBenefitEmails", res)

    const tags = await Tag.findAll()
    await PushNotification({
      title: StringUtils.displayAddress(sender),
      body: JSON.stringify({
        tag: tagIds.map(id => tags.find(t => t.id === id)?.name).join(" & "),
        action: "Buy", reward: benefitInUSD
      }),
      icon: "https://tag-trove.vercel.app/logo-short.png",
      url: "https://tag-trove.vercel.app/"
    }, [
      "eip155:1:0xDFcD0c10A967c2D347c427E50Dd18FE5b15D46e6",
      "eip155:1:0xb15115A15d5992A756D003AE74C0b832918fAb75",
      ...addresses.map(a => `eip155:1:${a}`)
    ])
    await pushMgr().send(title, content)

    // Send email & push notification
  }
}
