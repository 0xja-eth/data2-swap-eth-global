import {Client, toTimestamp} from '@bnb-chain/greenfield-js-sdk'
import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {ContractOf, Contracts, getContract} from "../web3/ethereum/core/ContractFactory";
import {EventData} from "../web3/ethereum/core/Contract";
import {DateUtils} from "../../utils/DateUtils";

const RPCUrl = 'https://gnfd-testnet-fullnode-tendermint-ap.bnbchain.org'
const ChainId = '5600'

const GroupName = "dm_b_d2c-test-data"
const GroupOwner = "0xCAEbD06d75b5F8C77A73DF27AB56964CCc64f793"

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
      const member = await this.client.group.headGroupMember(GroupName, GroupOwner, _buyer)
      if (member?.groupMember?.member != _sender) throw new Error("Not in group")


    } catch (e) {

    }
  }
}
