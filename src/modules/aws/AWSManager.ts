import AWS, {S3} from "aws-sdk";
import AWSConfig from "./AWSConfig";
import {BaseManager, getManager, manager} from "../../app/ManagerContext";

export function awsMgr() {
  return getManager(AWSManager);
}

@manager
export class AWSManager extends BaseManager {

  public client: S3;

  onStart() {
    super.onStart();
    const config = AWSConfig();
    if (!config) return;

    AWS.config.update({
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
      // credentials: {
      // },
    })

    this.client = new S3();
  }
}
