import {Client, toTimestamp} from '@bnb-chain/greenfield-js-sdk'
import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {ContractOf, Contracts, getContract} from "../web3/ethereum/core/ContractFactory";
import {EventData} from "../web3/ethereum/core/Contract";
import {DateUtils} from "../../utils/DateUtils";
import {get} from "../http/NetworkManager";
import {MathUtils} from "../../utils/MathUtils";
import {Op} from "sequelize";
import {User} from "../user/models/User";
import {resendMgr} from "../email/resend/ResendManager";
import {BigNumber} from "ethers";
import {BenefitApp} from "../benefit/models/BenefitApp";
import {BenefitEmailTemplate} from "../benefit/models/BenefitEmailTemplate";
import {benefitMgr} from "../benefit/BenefitManager";

import TestData from "./test-data.json"

const RPCUrl = 'https://gnfd-testnet-fullnode-tendermint-ap.bnbchain.org'
const ChainId = '5600'

const BucketName = "d2c-test-data"
const ObjectName = "test-data2.json"
const GroupName = "dm_b_d2c-test-data"
const GroupOwner = "0xCAEbD06d75b5F8C77A73DF27AB56964CCc64f793"

// const Host = "https://gnfd-testnet-sp1.nodereal.io"
const GetData = get<{url: string}, any>("", ":url")

const ExpirationDuration = 7 * DateUtils.Day

export function bnbMgr() {
  return getManager(BNBManager)
}

@manager
export class BNBManager extends BaseManager {
  public client = Client.create(RPCUrl, ChainId);

  public dataSwap: ContractOf<"DataSwap">

  public get privateKey() {
    return this.dataSwap.ethInstance.account.privateKey
  }
  public get mainAddress() {
    return this.dataSwap.ethInstance.account.address
  }

  public onReady() {
    super.onReady();

    this.dataSwap = getContract("DataSwap")

    this.registerEventListener();
  }
  private registerEventListener() {
    this.dataSwap.events.Buy(
      {}, async (err, event) => {
        if (!event) return console.error(err);
        console.log("onBuy", event)
        await this.onBuy(event);
      })
    this.dataSwap.events.Send(
      {}, async (err, event) => {
        if (!event) return console.error(err);
        console.log("onSend", event)
        await this.onSend(event);
      })
  }

  private async onBuy(e: EventData<Contracts["DataSwap"], "Buy">) {
    const {_buyer, _cid, _count} = e.returnValues;
    if (Number(_count) < 0) return

    const expDate = new Date(Date.now() + ExpirationDuration)

    try {
      const member = await this.client.group.headGroupMember(GroupName, GroupOwner, _buyer)
      if (member?.groupMember?.member != _buyer) throw new Error("Not in group")
    } catch (e) {
      console.error("headGroupMember error", e)
      try {
        // Mint an ERC1155 by update group member
        const tx = await this.client.group.updateGroupMember({
          operator: GroupOwner,
          groupOwner: GroupOwner,
          groupName: GroupName,
          membersToAdd: [
            {
              expirationTime: toTimestamp(expDate),
              member: _buyer,
            },
          ],
          membersToDelete: [],
        })

        const info = await tx.simulate({
          denom: 'BNB',
        });

        console.log('info', info);

        const txRes = await tx.broadcast({
          denom: 'BNB',
          gasLimit: Number(info?.gasLimit),
          gasPrice: info?.gasPrice || '5000000000',
          granter: '',
          payer: this.mainAddress,
          privateKey: this.privateKey,
        })

        console.log('txRes', txRes);
      } catch (e) {
        console.error("updateGroupMember error", e)
      }
    }
    await BenefitApp.findOrCreate({
      where: { name: `dataSwap User: ${_buyer}` }
    })
  }
  private async onSend(e: EventData<Contracts["DataSwap"], "Send">) {
    const {_sender, _cid, _title, _content} = e.returnValues;

    try {
      const member = await this.client.group.headGroupMember(GroupName, GroupOwner, _sender)
      if (member?.groupMember?.member != _sender) throw new Error("Not in group")

      await this.send(_sender, _cid.toString(), _title, _content)
    } catch (e) {
      // For test
      await this.send(_sender, _cid.toString(), _title, _content)
    }
  }

  public async send(sender: string, cid: string, title: string, content: string) {
    const expDate = new Date(Date.now() + DateUtils.Minute)

    const app = await BenefitApp.findOne({
      where: { name: `dataSwap User: ${sender}` }
    })

    let data: {[K: string]: string[]}
    try {
      const url = await this.client.object.getObjectPreviewUrl(
        {
          bucketName: BucketName,
          objectName: ObjectName,
          queryMap: {
            view: '1',
            'X-Gnfd-User-Address': sender,
            'X-Gnfd-App-Domain': window.location.origin,
            'X-Gnfd-Expiry-Timestamp': expDate.toISOString(),
          },
        },
        {
          type: 'EDDSA',
          address: sender,
          domain: window.location.origin,
          seed: `0x${MathUtils.randomString(130, "0123456789abcedf")}`
        },
      )
      data = await GetData({url})
    } catch (e) {
      data = TestData
    }
    const addresses = data[cid];

    const price = await this.dataSwap.methods.tagPrices(cid).call()
    const benefit = BigNumber.from(price).div(addresses.length)

    const bnbPrice = "246" // BNB Price
    const benefitInUSD = Number(benefit.mul(bnbPrice).toString()) / 10e18

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
