// Import Push SDK & Ethers
import { PushAPI } from '@pushprotocol/restapi';
import { ethers } from 'ethers';

import dotenv from 'dotenv';
dotenv.config();

async function doScript() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL)
  const signer = new ethers.Wallet(process.env.ACCOUNT_PRIVATE_KEY, provider)
  // Using random signer from a wallet, ideally this is the wallet you will connect
  // const signer = ethers.Wallet.createRandom();

  // Initialize wallet user, pass 'prod' instead of 'staging' for mainnet apps
  const userAlice = await PushAPI.initialize(signer, { env: "prod" as any });

  // // Push channel address
  // const pushChannelAddress = "0xB88460Bb2696CAb9D66013A05dFF29a28330689D";
  //
  // // Subscribe to push channel
  // await userAlice.notification.subscribe(
  //   `eip155:5:${pushChannelAddress}`, // channel address in CAIP format
  // );

  // const createRes = await userAlice.channel.create({
  //   name: "Test Channel",
  //   description: "Test Description",
  //   icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAz0lEQVR4AcXBsU0EQQyG0e+saWJ7oACiKYDMEZVs6GgSpC2BIhzRwAS0sgk9HKn3gpFOAv3v3V4/3+4U4Z1q5KTy42Ql940qvFONnFSGmCFmiN2+fj7uCBlihpgh1ngwcvKfwjuVIWaIGWKNB+GdauSk8uNkJfeNKryzYogZYoZY40m5b/wlQ8wQM8TayMlKeKcaOVkJ71QjJyuGmCFmiDUe+HFy4VyEd57hx0mV+0ZliBlihlgL71w4FyMnVXhnZeSkiu93qheuDDFDzBD7BcCyMAOfy204AAAAAElFTkSuQmCC",
  //   url: "https://push.org",
  // });

  // @ts-ignore
  // let channelAddress = userAlice.channel.account
  //
  // const subRes = await userAlice.notification.subscribe(
  //   `eip155:1:${channelAddress}`,
  // );

  // List inbox notifications
  let inboxNotifications = await userAlice.notification.list("INBOX");

  // List spam notifications
  let spamNotifications = await userAlice.notification.list("SPAM");

  // Send notification, provided userAlice has a channel
  const sendResponse = await userAlice.channel.send(
    ["0x10fa00823D930bD4aB3592CdeD68D830da652D22"], {
    notification: {
      title: "Hi son",
      body: "from your amazing protocol",
    },
  });

  // To listen to real time notifications
  // userAlice.stream.on("STREAM.NOTIF", (data) => {
  //   console.log(data);
  // });

  // List inbox notifications
  inboxNotifications = await userAlice.notification.list("INBOX");

  // List spam notifications
  spamNotifications = await userAlice.notification.list("SPAM");

}

doScript()
  .then(() => console.log("done"))
// .catch(e => console.error("error", e));
