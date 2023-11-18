
process.env["SCRIPT"] = "true";

import {app} from "../app/App";

async function doScript() {

  const data: Partial<EventRecorder>[] = [
    {
      id: EventRecorder.makeId(GID, GSlug, GVersion, "Buy"),
      fields: ['_tagIds', '_buyer', '_count', '_value']
    }, {
      id: EventRecorder.makeId(GID, GSlug, GVersion, "Send"),
      fields: ['_tagId', '_sender', '_title', '_content']
    }, {
      id: EventRecorder.makeId(GID, GSlug, GVersion, "ZKProof"),
      fields: ['_to', '_a', '_b', '_c', '_dest', '_pubKey1', '_pubKey2', '_tagId', '_nullifier']
    }
  ]

  await EventRecorder.bulkCreate(data, {
    updateOnDuplicate: ['state', 'fields'] // 指定要更新的字段
  })
}

app().start()
  .then(doScript)
  .then(() => process.exit(0));

import {GID, GSlug, GVersion} from "../modules/theGraph/EventManager";
import {EventRecorder} from "../modules/theGraph/EventRecorder";
