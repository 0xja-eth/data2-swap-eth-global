import {Address} from "../../modules/user/models/Address";
import Twitter from "../../modules/user/models/oauth/Twitter";
import Github from "../../modules/user/models/oauth/Github";
import {Relation} from "../../modules/user/models/Relation";
import {ScannerEnvironment} from "../ScannerEnvironment";

const Count = 1000;

export default async function(se: ScannerEnvironment): Promise<[Relation, number][]> {
  const addresses = await Address.findAll()
  const twitters = await Twitter.findAll()
  const githubs = await Github.findAll()

  const relations = [...addresses, ...twitters, ...githubs] as Relation[]
  return relations.sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
  ).slice(0, Count).map((r, i) => [r, i + 1])
}
