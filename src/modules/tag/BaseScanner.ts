import {Relation} from "../user/models/Relation";

export abstract class BaseScanner {

  public id: string

  public initialize() {

  }
  public abstract doScan(timestamp: number): Promise<Relation[]>
}
