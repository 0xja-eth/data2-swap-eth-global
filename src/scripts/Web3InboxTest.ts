// Import Push SDK & Ethers
import { PushAPI } from '@pushprotocol/restapi';
import { ethers } from 'ethers';

import dotenv from 'dotenv';
import {app} from "../app/App";
import {PushNotification} from "../modules/walletConnect/WalletConnect";

dotenv.config();

async function doScript() {
  await PushNotification({
    title: "Hello world",
    body: "I'm your Data2.Cash",
    icon: "https://data2.cash/favicon.png",
    url: "https://data2.cash"
  }, [
    "eip155:1:0xCAEbD06d75b5F8C77A73DF27AB56964CCc64f793",
    "eip155:1:0xb15115A15d5992A756D003AE74C0b832918fAb75",
    "eip155:1:0x10fa00823D930bD4aB3592CdeD68D830da652D22",
  ])
}

app().start()
  .then(doScript)
  .then(() => console.log("done"))
// .catch(e => console.error("error", e));
