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

const RPCUrl = 'https://gnfd-testnet-fullnode-tendermint-ap.bnbchain.org'
const ChainId = '5600'

const BucketName = "d2c-test-data"
const ObjectName = "test-data.json"
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

  public onReady() {
    super.onReady();

    this.dataSwap = getContract("DataSwap")

    this.registerEventListener();
  }
  private registerEventListener() {
    this.dataSwap.events.Buy(
      {}, async (err, event) => {
        if (!event) return console.error(err);
        await this.onBuy(event);
      })
    this.dataSwap.events.Send(
      {}, async (err, event) => {
        if (!event) return console.error(err);
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
      // Mint an ERC1155 by update group member
      await this.client.group.updateGroupMember({
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
    }
  }
  private async onSend(e: EventData<Contracts["DataSwap"], "Send">) {
    const {_sender, _cid, _title, _content} = e.returnValues;

    try {
      const member = await this.client.group.headGroupMember(GroupName, GroupOwner, _sender)
      if (member?.groupMember?.member != _sender) throw new Error("Not in group")

      await this.send(_sender, _cid.toString(), _title, _content)
    } catch (e) {

    }
  }

  public async send(sender: string, cid: string, title: string, content: string) {
    const expDate = new Date(Date.now() + DateUtils.Minute)

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
    const data: {[K: string]: string[]} = await GetData({url})
    const addresses = data[cid];

    const users = await User.findAll({where: {mintAddress: {[Op.in]: addresses}}})
    const emails = users.map(u => u.email);

    // Send email & push notification
  }
}
