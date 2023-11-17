import {BaseInterface, body, custom, del, get, params, post, put, query, route} from "../http/InterfaceManager";
import {RelationType} from "./models/Relation";
import {auth, AuthType, Payload} from "./AuthManager";
import {CodeType, userMgr} from "./UserManager";
import {BaseError, ExistError, NotFoundError} from "../http/utils/ResponseUtils";
import {User} from "./models/User";
import {Op} from "sequelize";
import {web3BioMgr} from "./Web3Bio";
import {relationRegister} from "./processors/RelationProcessor";

@route("/user")
export class UserInterface extends BaseInterface {

  @post("/login")
  @auth(AuthType.Normal, false)
  async login(@custom("auth") _auth: Payload) {
    const {type, id, params} = _auth;
    // if (!params.commitment) throw new NotFoundError("commitment")

    const {user, relations} = type == RelationType.Address &&
      await userMgr().loginByMintAddress(id) || await userMgr().loginByRelation(type, id);
    const userCredentials = await UserCredential.findAll({
      where: {userId: user.id}
    })

    console.log("[login] Scan", JSON.stringify(relations))
    // await scanMgr().scanForRelation(relations, CredentialPriority.RealTime)
    //   .then(() => console.log("[scanForRelation] success for login", JSON.stringify(relations)))
    //   .catch(e => console.error("[scanForRelation] error for login", JSON.stringify(relations), e));

    return { user, relations, userCredentials }
  }

  @put("/relation")
  @auth(AuthType.Normal)
  async bindRelation(
    @body("type") type: RelationType,
    @body("params") params: any,
    // @body("updateCommitment", true) updateCommitment: boolean,
    @custom("auth") _auth: Payload) {
    const {user} = _auth;

    const relation = await userMgr().bindRelation(user.id, type, params);

    console.log("[bindRelation] Scan", JSON.stringify(relation))
    // await scanMgr().scanForRelation(relation, CredentialPriority.RealTime)
    //   .then(() => console.log("[scanForRelation] success for bindRelation", JSON.stringify(relation)))
    //   .catch(e => console.error("[scanForRelation] error for bindRelation", JSON.stringify(relation), e));

    if (params?.params?.commitment)
      await userMgr().registerCommitment(relation, params.params.commitment)

    if (type == RelationType.Address) {
      const web3BioRelations = await web3BioMgr().syncWeb3Bios(user.id, relation.id)
      return { relation, web3BioRelations };
    }

    return { relation };
  }

  @del("/relation")
  @auth(AuthType.Normal)
  async unbindRelation(
    @body("type") type: RelationType,
    @body("id", true) id: string,
    @custom("auth") _auth: Payload) {
    const {user} = _auth;
    await userMgr().unbindRelation(user.id, type, id);
  }

  @put("/commitment")
  @auth(AuthType.Normal)
  async pushCommitment(
    @body("relationType", true, RelationType.Address) relationType: RelationType,
    @body("relationId") relationId: string,
    @body("commitment") commitment: string,
    @custom("auth") _auth: Payload) {

    const clazz = relationRegister.getClazz(relationType);

    const relation = await clazz.findOne({
      where: {id: relationId, userId: _auth.user.id}
    })
    if (!relation) throw new NotFoundError("User Address");

    await userMgr().registerCommitment(relation, commitment)

    return { relation };
  }

  @get("/relation/valid")
  async isNewRelationValid(
    @query("id") id: string,
    @query("type", true, RelationType.Address) type: RelationType,
  ) {
    return await userMgr().isNewRelation(id, type);
  }

  @get("/email/valid")
  async isNewEmailValid(
    @query("email") email: string,
  ) {
    return await userMgr().isNewEmail(email);
  }

  @post("/email/send")
  async sendEmailCode(
    @body("type") type: CodeType,
    @body("email") email: string) {
    await userMgr().sendCode(type, email);
  }

  @put("/email/bind")
  @auth(AuthType.Normal)
  async bindEmail(
    @body("email") email: string,
    @body("code") code: string,
    @custom("auth") _auth: Payload) {

    await userMgr().isNewEmail(email, true)

    if (await userMgr().verifyCode(CodeType.Bind, email, code))
      throw new BaseError(601, "Code not correct")

    if (_auth.user.email == email) return;

    const emailUser = await User.findOne({ where: { email } })
    if (emailUser) throw new ExistError("User");

    _auth.user.email = email;
    await _auth.user.save();

    userMgr().sendWelcome([_auth.user])
      .then(() => console.log("[sendWelcome] success for bindEmail", JSON.stringify(_auth.user)))
      .catch(e => console.error("[sendWelcome] error for bindEmail", JSON.stringify(_auth.user), e));
  }

  @post("/credential/:id")
  @auth(AuthType.Normal)
  async updateCredential(
    @params("id") id: string,
    @body("state") state: UserCredentialState,
    @custom("auth") _auth: Payload
  ) {
    const { id: userId } = _auth.user
    const [uCredential] = await UserCredential.findOrCreate({
      where: {userId, credentialId: id}
    })
    uCredential.state = state;
    await uCredential.save();

    return {
      userCredentials: await UserCredential.findAll({ where: {userId} })
    }
  }

  @post("/welcome")
  @auth(AuthType.Super)
  async sendWelcome(
    @body("userId", true) userId: string,
    @body("userIds", true, []) userIds: string[],
    @body("forceSend", true, false) forceSend: boolean,
    @body("forceBenefit", true, false) forceBenefit: boolean) {
    userIds = userId ? [userId] : userIds;

    const where = { id: {[Op.in]: userIds}, email: {[Op.ne]: null} };

    const users = await User.findAll({ where });
    await userMgr().sendWelcome(users, forceSend, forceBenefit);
  }

  @post("/welcome/all")
  @auth(AuthType.Super)
  async sendAllWelcome(
    @body("forceSend", true, false) forceSend: boolean,
    @body("forceBenefit", true, false) forceBenefit: boolean) {

    const users = await User.findAll({
      where: {email: {[Op.ne]: null}}
    });
    await userMgr().sendWelcome(users, forceSend, forceBenefit);
  }

}
