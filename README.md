# Tag Trove

## Getting Started

### Create Config File

Copy from `example.env.json` to `env.default.json`.

```bash
cp example.env.json env.default.json
```

Write some configurations in `env.default.json`. For example Sequelize database params。

#### Configurations

Configurations of Tag Trove:

| Configuration | Note |
| --- | --- |
| `http` |  |
| `http.port` | API port |
| `http.baseRoute` | API root route |
| `sequelize` |  |
| `sequelize.host` | Database host |
| `sequelize.port` | Database port |
| `sequelize.username` | Database username |
| `sequelize.password` | Database password |
| `sequelize.database` | Database name |
| `redis` |  |
| `redis.host` | Redis host |
| `redis.port` | Redis port |
| `redis.password` | Redis password |
| `redis.db` | Redis db number |
| `ethereum` |  |
| `ethereum.defaultProvider` | Default chain |
| `ethereum.privateKey` | Private key |
| `ethereum.contractsFile` | File that store contracts' configurations |
| `ethereum.chainsFile` | File that store chains' configurations |
| `github` |  |
| `github.token` | Private github token |
| `push` |  |
| `push.rpcUrl` | Push rpcUrl |
| `push.privateKey` | Push privateKey |
| `wc` |  |
| `wc.projectId` | WalletConnect project id |
| `wc.apiSecret` | WalletConnect api secret |
| `wc.notificationType` | WalletConnect notification type |

### Install Dependencies

```bash
npm install
```

### Sync Sequelize Database

```bash
npm run sync-sequelize
```

### Start Server

```bash
npm run node
```
