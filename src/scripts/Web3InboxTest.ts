// Import Push SDK & Ethers
import { PushAPI } from '@pushprotocol/restapi';
import { ethers } from 'ethers';

import dotenv from 'dotenv';
import {app} from "../app/App";
import {PushNotification} from "../modules/walletConnect/WalletConnect";
import {StringUtils} from "../utils/StringUtils";
import {Tag} from "../modules/tag/models/Tag";
import {MathUtils} from "../utils/MathUtils";

dotenv.config();

async function doScript() {
  const tags = await Tag.findAll()

  await PushNotification({
    title: StringUtils.displayAddress("0xCAEbD06d75b5F8C77A73DF27AB56964CCc64f793"),
    body: JSON.stringify({
      tag: MathUtils.randomPickMany(tags, 2).map(t => t.name).join(" & "),
      action: "Buy", reward: 0.5
    }),
    icon: "https://tag-trove.vercel.app/logo-short.png",
    url: "https://tag-trove.vercel.app/"
  }, [
    "eip155:1:0xDFcD0c10A967c2D347c427E50Dd18FE5b15D46e6",
    "eip155:1:0xb15115A15d5992A756D003AE74C0b832918fAb75",
  ])
  // await PushNotification({
  //   title: "Hello world 222333",
  //   body: "I'm your Data2.Cash",
  //   icon: "https://data2.cash/favicon.png",
  //   url: "https://data2.cash"
  // }, [
  //   // "eip155:1:0xCAEbD06d75b5F8C77A73DF27AB56964CCc64f793",
  //   "eip155:1:0xDFcD0c10A967c2D347c427E50Dd18FE5b15D46e6",
  //   "eip155:1:0xb15115A15d5992A756D003AE74C0b832918fAb75",
  //   // "eip155:1:0x10fa00823D930bD4aB3592CdeD68D830da652D22",
  // ])
}

app().start()
  .then(doScript)
  .then(() => process.exit(0));
// .catch(e => console.error("error", e));
