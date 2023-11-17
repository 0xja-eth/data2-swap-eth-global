import dotenv from "dotenv"
dotenv.config();

process.env["SCRIPT"] = "true";

import {Client, toTimestamp} from '@bnb-chain/greenfield-js-sdk'

const AccountAddress = process.env.ACCOUNT_ADDRESS
const AccountPrivateKey = process.env.ACCOUNT_PRIVATE_KEY

const client = Client.create(
  'https://gnfd-testnet-fullnode-tendermint-us.bnbchain.org', '5600');

async function doScript() {
  const GroupName = 'dm_b_d2c-test-data'
  const MemberAddress = "0xA12bEA54Ca8bBcbDba917936DBBFb669B9f0108E"

  const msg = {
    operator: AccountAddress,
    groupOwner: AccountAddress,
    groupName: GroupName,
    membersToAdd: [
      {
        expirationTime: toTimestamp(new Date('2023-11-12')),
        member: MemberAddress,
      },
    ],
    membersToDelete: [],
  }
  const tx = await client.group.updateGroupMember(msg);
  console.log('tx', tx, msg);

  const info = await tx.simulate({
    denom: 'BNB',
  });

  console.log('info', info);

  const txRes = await tx.broadcast({
    denom: 'BNB',
    gasLimit: Number(info?.gasLimit),
    gasPrice: info?.gasPrice || '5000000000',
    granter: '',
    payer: AccountAddress,
    privateKey: AccountPrivateKey,
  })

  console.log('txRes', txRes);
}

doScript()
  .then(() => console.log("done"))
  // .catch(e => console.error("error", e));

// app().start()
//   .then(() => doScript())
//   .then(() => process.exit(0));

import {sequelizeMgr} from "../modules/sequelize/SequelizeManager";
