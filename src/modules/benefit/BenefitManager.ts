import {BaseManager, getManager, manager} from "../../app/ManagerContext";
import {BenefitEmail} from "./models/BenefitEmail";
import {UserCredential, UserCredentialState} from "../scan/models/UserCredential";
import {removeDuplicates} from "../../utils/ArrayUtils";
import {resendMgr, WebhookData} from "../email/resend/ResendManager";
import {EmailType} from "../email/EmailConfig";
import {User} from "../user/models/User";
import {Op} from "sequelize";
import {BenefitRecord, BenefitType} from "./models/BenefitRecord";
import {BenefitEmailTemplate, Reward, RewardType} from "./models/BenefitEmailTemplate";
import {BenefitApp} from "./models/BenefitApp";
import {webPushMgr} from "../webPush/WebPushManager";
import {scanMgr} from "../scan/ScanManager";
import {Credential, CredentialState} from "../scan/models/Credential";
import {userMgr} from "../user/UserManager";

export function benefitMgr() {
  return getManager(BenefitManager)
}

@manager
export class BenefitManager extends BaseManager {

  public onStart() {
    super.onStart();

    resendMgr().registerWebhook("email.delivered", this.onDeliveredEmail.bind(this));
    resendMgr().registerWebhook("email.opened", this.onOpenEmail.bind(this));
    resendMgr().registerWebhook("email.clicked", this.onClickEmail.bind(this));
  }

  public async sendBenefitEmails(templateId: string, force = false, sentEmails = []) {
    const template = await BenefitEmailTemplate.findByPk(templateId);
    const {credentialIds, title, content} = template;

    console.log(`[SendBenefitEmails: ${templateId}] Start`, {credentialIds, title, content})

    let targetUsers: User[];
    if (credentialIds?.length > 0) {
      const targetUserIds = removeDuplicates(
        (await UserCredential.findAll({
          where: {
            credentialId: {[Op.in]: credentialIds},
            isMinted: true, state: UserCredentialState.Normal
          }
        })).map(uc => uc.userId));
      targetUsers = await User.findAll({
        where: {id: {[Op.in]: targetUserIds}, email: {[Op.ne]: null}}
      });
    } else
      targetUsers = await User.findAll({ where: {email: {[Op.ne]: null}} })

    console.log(`[SendBenefitEmails: ${templateId}] TargetUsers: ${targetUsers.length}`)

    if (!force) {
      const sentEmails = await BenefitEmail.findAll({where: { templateId }})
      console.log(`[SendBenefitEmails: ${templateId}] SentEmails: ${sentEmails.length}`)

      targetUsers = targetUsers.filter(u => !sentEmails.find(e => e.userId === u.id))
      console.log(`[SendBenefitEmails: ${templateId}] New TargetUsers: ${targetUsers.length}`)
    }

    const res = [];
    for (const {email: to, id: userId} of targetUsers) {
      try {
        if (sentEmails.includes(to)) {
          const [bEmail] = await BenefitEmail.findOrCreate({ where: {id: `fix-for-${to}-${templateId}`, templateId, to, userId} })

          let flag = false
          flag ||= await this.addBenefitRecordForEmail("delivered", bEmail)
          flag ||= await this.addBenefitRecordForEmail("open", bEmail)
          flag ||= await this.addBenefitRecordForEmail("click", bEmail)

          if (flag) await bEmail.save();

          console.log(`[SendBenefitEmails: ${templateId}] For ${to} Fix:`, flag, bEmail.toJSON());
          continue;
        }
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

    // const res: BenefitEmail[] = []
    // for (const email of targetEmails)
    //   try {
    //     const {id} = await resendMgr().sendEmail(EmailType.Benefit, email, {title, content})
    //     if (!id) continue;
    //
    //     res.push(await BenefitEmail.create({
    //       id, title, content, to: email,
    //       credentialId, app, action, link,
    //       openReward, clickReward
    //     }))
    //   } catch (e) {
    //     console.error(`[CreateBenefitEmails] For ${email} error:`, e)
    //   }
  }

  public async onDeliveredEmail(data: WebhookData) {
    const email = await BenefitEmail.findByPk(data.email_id);
    if (!email || email.deliveredBenefitId) return;

    const template = await BenefitEmailTemplate.findByPk(email.templateId);
    const app = await BenefitApp.findByPk(template.appId);

    let flag = false
    flag ||= await this.addBenefitRecordForEmail("delivered", email, template, app)

    if (flag) await email.save();
  }
  public async onOpenEmail(data: WebhookData) {
    const email = await BenefitEmail.findByPk(data.email_id);
    if (!email || (email.deliveredBenefitId && email.openBenefitId)) return;

    const template = await BenefitEmailTemplate.findByPk(email.templateId);
    const app = await BenefitApp.findByPk(template.appId);

    let flag = false
    flag ||= await this.addBenefitRecordForEmail("delivered", email, template, app)
    flag ||= await this.addBenefitRecordForEmail("open", email, template, app)

    if (flag) await email.save();
  }
  public async onClickEmail(data: WebhookData) {
    const email = await BenefitEmail.findByPk(data.email_id);
    if (!email || (email.deliveredBenefitId && email.openBenefitId && email.clickBenefitId)) return;

    const template = await BenefitEmailTemplate.findByPk(email.templateId);
    const app = await BenefitApp.findByPk(template.appId);

    let flag = false
    flag ||= await this.addBenefitRecordForEmail("delivered", email, template, app)
    flag ||= await this.addBenefitRecordForEmail("open", email, template, app)
    flag ||= await this.addBenefitRecordForEmail("click", email, template, app)

    if (flag) await email.save();
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

    if (typeof value !== "number")
      switch (value.type) {
        case "fixed": value = value.value; break;

        case "tag-dp-rate":
          const ucs = await UserCredential.findAll({
            where: {
              userId, credentialId: {[Op.in]: credentialIds},
              isMinted: true, state: CredentialState.Active
            }
          })
          credentialIds = ucs.map(uc => uc.credentialId)

          const cs = await Credential.findAll({where: {id: {[Op.in]: credentialIds}}})
          value = cs.reduce((res, c) => res + c.dataPower, 0) * value.value; break;

        case "all-dp-rate":
          const {dataPower, displayTags} = await scanMgr().getUserDisplayTags(userId);
          credentialIds = credentialIds.filter(
            cid => displayTags.find(c => c.id == cid)
          )
          value = dataPower * value.value; break;
      }

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
