import {snowflake} from "../modules/sequelize/snowflake/Snowflake";
import {app} from "../app/App";
import {Tag} from "../modules/tag/models/Tag";

process.env["SCRIPT"] = "true";

async function doScript() {
  const tags = await Tag.findAll();

  const data: Partial<Tag>[] = [
    {
      name: "Early Adopter",
      curator: "Data2.cash",
      description: "First 1000 user of Data2.cash",
      dataPower: 10,
      rules: [{
        groupName: "EarlyAdopter",
        compare: "lte",
        value: 1000,
      }]
    }, {
      name: "Solidity Dev",
      curator: "Data2.cash",
      description: "Solidity developer",
      dataPower: 10,
      rules: [{
        groupName: "SolidityDev",
        compare: "gt",
        value: 0,
      }]
    }, {
      name: "Move Dev",
      curator: "Data2.cash",
      description: "Move developer",
      dataPower: 10,
      rules: [{
        groupName: "MoveDev",
        compare: "gt",
        value: 0,
      }]
    }, {
      name: "Web3 Dev",
      curator: "Data2.cash",
      description: "Web3 developer",
      dataPower: 10,
      rules: [{
        groupName: "Web3Dev",
        compare: "gt",
        value: 0,
      }]
    }, {
      name: "Python Dev",
      curator: "Data2.cash",
      description: "Python developer",
      dataPower: 10,
      rules: [{
        groupName: "PythonDev",
        compare: "gt",
        value: 0,
      }]
    }, {
      name: "JS/TS Dev",
      curator: "Data2.cash",
      description: "JS/TS developer",
      dataPower: 10,
      rules: [{
        groupName: "JSOrTsDev",
        compare: "gt",
        value: 0,
      }]
    }, {
      name: "Go Dev",
      curator: "Data2.cash",
      description: "Go developer",
      dataPower: 10,
      rules: [{
        groupName: "GoDev",
        compare: "gt",
        value: 0,
      }]
    }, {
      name: "Rust Dev",
      curator: "Data2.cash",
      description: "Rust developer",
      dataPower: 10,
      rules: [{
        groupName: "RustDev",
        compare: "gt",
        value: 0,
      }]
    }
  ]
  const updateData = data.map(t => {
    const ot = tags.find(ot => ot.name == t.name);
    return ot ? {...ot.toJSON(), ...t} : { id: snowflake.generate(), ...t }
  })
  await Tag.bulkCreate(updateData, {
    updateOnDuplicate: ['curator', 'dataPower', 'rules', 'state'] // 指定要更新的字段
  })
}

app().start()
  .then(doScript)
  .then(() => process.exit(0));

