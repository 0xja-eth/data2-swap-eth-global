import {Relation, RelationType, RID} from "../../user/models/Relation";

export function scanner(name: string) {
  return clazz => {
    BaseScanner.scanners.push(new clazz(name));
  }
}

export abstract class BaseScanner {

  public static scanners: BaseScanner[] = [];

  public name: string

  constructor(name: string) {
    this.name = name
  }

  public get relationTypes(): RelationType[] {
    return null; // For all
  }

  public scanForAll: () => Promise<[RID, number][]>;
  public scanForRelations: (relations: Relation[]) => Promise<[RID, number][]>;
}
