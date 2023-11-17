import {relationRegister, BaseRelationProcessor} from "./RelationProcessor";
import {RelationBindParams, RelationType} from "../models/Relation";
import {Address} from "../models/Address";
import {signMgr} from "../SignManager";
import {ExistError} from "../../http/utils/ResponseUtils";
import {User} from "../models/User";

class AddressProcessor extends BaseRelationProcessor<RelationType.Address> {
  public get type() { return RelationType.Address as const; }

  public async setRel(userId: string, params: RelationBindParams[RelationType.Address]) {
    signMgr().verifySign(params);

    let res = await this.clazz.findByPk(params.address);
    if (res) {
      // 已经被其他用户绑定过
      if (res.userId != userId) {
        const rUser = await User.findByPk(res.userId);
        if (rUser)
          throw new ExistError(this.typeName, {
            userId: rUser.id, userName: rUser.name
          });

        // 如果找不到这个用户，替换为当前userId
        res.userId = userId;
        await res.save();
      }
    } else
      res = await this.clazz.create({userId, id: params.address});

    return res;
  }
  // public findRelByParams(userId: string, params: RelationBindParams[RelationType.Address]) {
  //   signMgr().verifySign(params);
  //   return this.clazz.findOne({where: {userId, id: params.address}});
  // }
}

relationRegister.add(RelationType.Address, {
  clazz: Address,
  processor: new AddressProcessor()
})
