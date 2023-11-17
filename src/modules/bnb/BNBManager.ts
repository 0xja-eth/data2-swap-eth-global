import {Client} from '@bnb-chain/greenfield-js-sdk'

const { ACCOUNT_ADDRESS, ACCOUNT_PRIVATEKEY } = require('./env');

const client = Client.create('https://gnfd-testnet-fullnode-tendermint-ap.bnbchain.org', '5600');

