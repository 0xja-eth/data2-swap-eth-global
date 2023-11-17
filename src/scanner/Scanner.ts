#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

import yargs from 'yargs';

import {Scanner, ScannerEnvironment} from "./ScannerEnvironment";
import {app} from "../app/App";

async function parseArgv() {
  return yargs
    .option('scan', {
      alias: 's',
      description: '扫描脚本名称',
      type: 'string',
    })
    .option('dir', {
      alias: 'd',
      description: '扫描器目录',
      type: 'string',
      default: './scanners/',
    })
    .option('output', {
      alias: 'o',
      description: '输出目录',
      type: 'string',
      default: './outputs/',
    })
    .help()
    .alias('help', 'h')
    .argv;
}

async function runScanner() {
  const argv = await parseArgv();

  if (!argv.scan) {
    console.error('需要指定 --scan 参数'); return;
  }

  const scannerScript = path.join(__dirname, argv.dir, `${argv.scan}.ts`);
  const { default: _scanFunction } = await import(scannerScript);
  const scanFunction = _scanFunction as Scanner

  const se = new ScannerEnvironment(argv.scan, argv.output)
  const result = await scanFunction(se);

  const timestamp = Date.now();
  const outputFile = path.join(argv.output, `${argv.scan}/${timestamp}.json`);

  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
}

app().start().then(runScanner);
