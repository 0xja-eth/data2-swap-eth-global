import * as fs from 'fs';
import * as path from 'path';

import {Relation, RID} from "../modules/user/models/Relation";

export type Scanner = (se: ScannerEnvironment) => Promise<[RID, number][]>

export class ScannerEnvironment {
  name: string
  outputDir: string
  scanTimes: number[] // 扫描记录

  constructor(name: string, outputDir: string) {
    this.name = name
    this.outputDir = outputDir
    this.scanTimes = this.getScanTimes(outputDir);
  }

  private getScanTimes(outputDir: string): number[] {
    try {
      const scanDir = path.join(outputDir, this.name);
      if (!fs.existsSync(scanDir)) return [];

      const files = fs.readdirSync(scanDir);
      return files
        .map(file => path.parse(file).name)
        .map(name => Number(name))
        .filter(timestamp => !isNaN(timestamp));
    } catch (error) {
      console.error('读取扫描时间时出错:', error);
      return [];
    }
  }

  public get lastScanTime() { return Math.max(...this.scanTimes)}

  public getScanResult(scanTime = this.lastScanTime): [RID, number][] {
    const latestFile = path.join(this.outputDir, this.name, `${scanTime}.json`);

    try {
      const data = fs.readFileSync(latestFile, 'utf-8');
      return JSON.parse(data) as [RID, number][];
    } catch (error) {
      console.error('读取最近一次扫描结果时出错:', error);
      return [];
    }
  }
}
