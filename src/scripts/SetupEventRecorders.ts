
process.env["SCRIPT"] = "true";

import {app} from "../app/App";

async function doScript() {

  const data: Partial<EventRecorder>[] = [
    {
      id: EventRecorder.makeId(GID, GSlug, GVersion, "Buy"),
      fields: ['_cid', '_buyer', '_count', '_value']
    }, {
      id: EventRecorder.makeId(GID, GSlug, GVersion, "Send"),
      fields: ['_cid', '_sender', '_title', '_content']
    }
  ]

  await EventRecorder.bulkCreate(data, {
    updateOnDuplicate: ['state', 'fields'] // 指定要更新的字段
  })
}

app().start()
  .then(doScript)
  .then(() => process.exit(0));

import {GID, GSlug, GVersion} from "../modules/d2s/EventManager";
import {EventRecorder} from "../modules/d2s/EventRecorder";
