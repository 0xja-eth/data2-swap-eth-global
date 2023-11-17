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

