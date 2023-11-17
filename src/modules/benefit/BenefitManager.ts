import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {BenefitEmail} from "./models/BenefitEmail";
import {removeDuplicates} from "../../utils/ArrayUtils";
import {resendMgr, WebhookData} from "../email/resend/ResendManager";
import {EmailType} from "../email/EmailConfig";
import {User} from "../user/models/User";
import {Op} from "sequelize";
import {BenefitRecord, BenefitType} from "./models/BenefitRecord";
import {BenefitEmailTemplate, Reward, RewardType} from "./models/BenefitEmailTemplate";
import {BenefitApp} from "./models/BenefitApp";
import {webPushMgr} from "../webPush/WebPushManager";

export function benefitMgr() {
  return getManager(BenefitManager)
}

@manager
export class BenefitManager extends BaseManager {

  public async sendBenefitEmails(templateId: string, targetUsers: User[], force = false) {
    const template = await BenefitEmailTemplate.findByPk(templateId);
    const {credentialIds, title, content} = template;

    console.log(`[SendBenefitEmails: ${templateId}] Start`, {credentialIds, title, content})
    console.log(`[SendBenefitEmails: ${templateId}] TargetUsers: ${targetUsers.length}`)

    if (!force) {
      const sentEmails = await BenefitEmail.findAll({where: { templateId }})
      console.log(`[SendBenefitEmails: ${templateId}] SentEmails: ${sentEmails.length}`)

      targetUsers = targetUsers.filter(u => !sentEmails.find(e => e.userId === u.id))
      console.log(`[SendBenefitEmails: ${templateId}] New TargetUsers: ${targetUsers.length}`)
    }

    const res: BenefitEmail[] = [];
    for (const {email: to, id: userId} of targetUsers) {
      try {
        const emailRes = await resendMgr().sendEmail(EmailType.Benefit, to, {title, content})
        const id = emailRes?.id
        if (!id)
          console.log(`[SendBenefitEmails: ${templateId}] For ${to} Fail:`, emailRes)
        else {
          const bEmail = await BenefitEmail.create({ id, templateId, to, userId })
          console.log(`[SendBenefitEmails: ${templateId}] For ${to} Success:`, { id, templateId, to, userId })
          res.push(bEmail);
        }
      } catch (e) {
        console.error(`[SendBenefitEmails: ${templateId}] For ${to} Error:`, e)
      }
    }

    console.log(`[SendBenefitEmails: ${templateId}] Finished`, res.length)
    return res
  }
  public async addBenefitRecordForEmail(type: "delivered" | "open" | "click",
                                        email: BenefitEmail,
                                        template?: BenefitEmailTemplate,
                                        app?: BenefitApp) {
    if (email[`${type}BenefitId`]) return false;

    template ||= await BenefitEmailTemplate.findByPk(email.templateId);
    app ||= await BenefitApp.findByPk(template.appId);

    const br = await this.addBenefitRecord(email.userId,
      template[`${type}Reward`], type, app.name, app.link,
      template.action, template.credentialIds)

    if (br) email[`${type}BenefitId`] = br.id;
    return !!br;
  }
  public async addBenefitRecord(userId: string, value: Reward, type: BenefitType,
                                app: string, link?: string, action?: string,
                                credentialIds?: string[]) {
    if (typeof value !== "number" &&
      value.type == "tag-dp-rate" && !credentialIds?.length)
      value.type = "all-dp-rate"

    if (typeof value !== "number") value = value.value

    if (value <= 0) return;

    const res = await BenefitRecord.create({
      userId, credentialIds, value, app, action, link, type
    })
    try {
      await webPushMgr().sendNotification(userId, `You earned $${value.toFixed(2)} from your data`)
    } catch (e) {
      console.error(`[AddBenefitRecord] Send push notification to ${userId} error:`, e)
    }

    return res
  }

}
