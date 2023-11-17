import {BaseInterface, body, custom, get, post, put, query, route} from "../http/InterfaceManager";
import {auth, AuthType, Payload} from "../user/AuthManager";
import {BenefitRecord} from "./models/BenefitRecord";
import {BenefitEmail} from "./models/BenefitEmail";
import {benefitMgr} from "./BenefitManager";
import {BenefitApp} from "./models/BenefitApp";
import {BenefitEmailTemplate, Reward} from "./models/BenefitEmailTemplate";

@route("/benefit")
export class BenefitInterface extends BaseInterface {

  @get("/")
  @auth(AuthType.Normal)
  async getBenefit(@custom("auth") _auth: Payload) {
    const { user } = _auth;

    const totalEarned = await BenefitRecord
      .sum("value", {where: {userId: user.id}}) || 0
    const recordCount = await BenefitRecord
      .count({where: {userId: user.id}}) || 0

    return { totalEarned, recordCount }
  }

  @get("/records")
  @auth(AuthType.Normal)
  async getBenefitRecords(
    @query("offset") offset: number,
    @query("limit") limit: number,
    @custom("auth") _auth: Payload) {
    const { user } = _auth;

    return await BenefitRecord.findAll({
      where: {userId: user.id}, offset, limit
    })
  }

  @put("/app")
  @auth(AuthType.Super)
  async createBenefitApp(
    @body("name") name: string,
    @body("link") link: string) {
    return await BenefitApp.upsert({name, link})
  }

  @get("/app")
  @auth(AuthType.Super)
  async getBenefitApps() {
    return await BenefitApp.findAll()
  }

  @put("/template")
  @auth(AuthType.Super)
  async createBenefitEmailTemplate(
    @body("appId") appId: string,
    @body("credentialIds", true) credentialIds: string[],
    @body("title") title: string,
    @body("content") content: string,
    @body("action", true, "") action: string,
    @body("deliveredReward", true, 0) deliveredReward: Reward,
    @body("openReward", true, 0) openReward: Reward,
    @body("clickReward", true, 0) clickReward: Reward) {
    return await BenefitEmailTemplate.create(
      credentialIds ? {
        appId, credentialIds, title, content, action,
        deliveredReward, openReward, clickReward
      } : {
        appId, title, content, action,
        deliveredReward, openReward, clickReward
      });
  }

  @get("/template")
  @auth(AuthType.Super)
  async getBenefitTemplates(
    @query("appId") appId: string) {
    return await BenefitEmailTemplate.findAll({
      where: {appId}
    })
  }

  @put("/email")
  @auth(AuthType.Super)
  async sendBenefitEmails(
    @body("templateId") templateId: string) {

    return benefitMgr().sendBenefitEmails(templateId)
  }
}
