import AWSConfig from "../AWSConfig";
import {BaseManager, getManager, manager} from "../../../app/ManagerContext";
import {awsMgr} from "../AWSManager";
import {S3} from "aws-sdk";

export interface BucketConfig {
  name: string
}

declare module "../AWSConfig" {
  interface AWSConfig {
    bucket?: BucketConfig
  }
}

export function BucketConfig() { return AWSConfig()?.bucket }

export function bucketMgr() {
  return getManager(BucketManager)
}

@manager
class BucketManager extends BaseManager {

  public get s3() { return awsMgr().client }
  public get config() { return BucketConfig() }

  public getBucketUrl(path: string) {
    if (!this.config) return;
    return `${this.config.name}.s3.${this.s3.config.region}.amazonaws.com/${path}`;
  }
  public getBucketPath(url: string) {
    if (!this.config) return;
    return url.replace(`${this.config.name}.s3.${this.s3.config.region}.amazonaws.com/`, "");
  }

  public async uploadFile(path: string, file: string,
                          options: Partial<S3.Types.PutObjectRequest> = {}) {
    if (!this.config) return;

    console.log("[BucketUploadFile] Start", path, file.slice(0, 100));
    try {
      const res = await this.s3.upload({
        Bucket: this.config.name,
        Key: path, Body: file, ACL: "public-read",
        ...options
        // ContentType: "application/json",
      }).promise();
      console.log("[BucketUploadFile] Finish", path, res);
      return res;
    } catch (e) {
      console.error("[BucketUploadFile] Error", path, e);
      throw e;
    }
  }

  public async getFile(path: string) {
    if (!this.config) return;

    console.log("[BucketGetFile] Start", path);
    try {
      const res = await this.s3.getObject({
        Bucket: this.config.name, Key: path,
      }).promise();
      console.log("[BucketGetFile] Finish", path, res);
      return res;
    } catch (e) {
      console.error("[BucketGetFile] Error", path, e);
      throw e;
    }
  }

}
