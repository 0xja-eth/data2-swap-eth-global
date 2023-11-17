#!/usr/bin/env node

import {getPoseidon} from "../modules/user/PoseidonUtils";

process.env["SCRIPT"] = "true";

import * as fs from 'fs';
import * as path from 'path';

import yargs from 'yargs';

import {Scanner, ScannerEnvironment} from "./ScannerEnvironment";
import {app} from "../app/App";
import {Tag} from "../modules/tag/models/Tag";
import {getIntersection} from "../utils/ArrayUtils";
import {ethers} from "ethers";
import {KVMerkleTree} from "@sismo-core/kv-merkle-tree";

export const AddressTreeHeight = 20;
export const RegistryTreeHeight = 20;

async function parseArgv() {
  return yargs
    .option('scan', {
      alias: 's',
      description: 'Scan',
      type: 'boolean',
      default: false
    })
    .option('update', {
      alias: 'u',
      description: 'Update',
      type: 'boolean',
      default: false
    })
    .option('id', {
      alias: 'i',
      description: 'Tag id',
      type: 'string',
    })
    .option('name', {
      alias: 'n',
      description: 'Tag name / script name',
      type: 'string',
    })
    .option('scanner-dir', {
      alias: 'd',
      description: 'Scanner directory',
      type: 'string',
      default: './scanners/',
    })
    .option('output-dir', {
      alias: 'o',
      description: 'Output directory',
      type: 'string',
      default: './output/',
    })
    .option('output-root-dir', {
      alias: 'r',
      description: 'Rout output directory',
      type: 'string',
      default: './output/root/',
    })
    .help()
    .alias('help', 'h')
    .argv;
}

async function runScanner() {
  const argv = await parseArgv();

  if (!fs.existsSync(argv.outputDir))
    fs.mkdirSync(argv.outputDir, { recursive: true });
  if (!fs.existsSync(argv.outputRootDir))
    fs.mkdirSync(argv.outputRootDir, { recursive: true });

  if (argv.scan) {
    async function scan(name: string) {
      const scannerScript = path.join(__dirname, argv.scannerDir, name);
      const { default: _scanFunction } = require(scannerScript);
      const scanFunction = _scanFunction as Scanner

      const se = new ScannerEnvironment(name, argv.outputDir)
      const result = await scanFunction(se);

      const timestamp = Date.now();
      const outputFile = path.join(argv.outputDir, name, `/${timestamp}.json`);

      if (!fs.existsSync(path.join(argv.outputDir, name)))
        fs.mkdirSync(path.join(argv.outputDir, name), { recursive: true });

      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    }

    if (argv.name) await scan(argv.name);
    else {
      const scanners = fs.readdirSync(path.join(__dirname, argv.scannerDir))
      const names = scanners
        .map(scanner => path.parse(scanner))
        .filter(scanner => scanner.ext === '.js')
        .map(scanner => scanner.name);

      await Promise.all(names.map(name => scan(name)));
    }
  }
  if (argv.update) {
    const poseidon = await getPoseidon();

    function update(tag: Tag) {
      console.log(`[UpdateTag] ${tag.id} ${tag.name}`, tag.rules);

      const ridGroup = tag.rules.map(rule => {
        const groupPath = path.join(__dirname, argv.scannerDir, rule.groupName);
        // 获取最后的扫描结果
        const files = fs.readdirSync(groupPath)
          .map(file => path.parse(file))
          .filter(file => file.ext === '.json' && !!Number(file.name))
          .sort((a, b) => Number(b.name) - Number(a.name))
        const latestFile = path.join(groupPath, files[0].base);

        const data = fs.readFileSync(latestFile, 'utf-8');
        const result = JSON.parse(data) as [string, number][];

        // 更新Tag
        return result.filter(([, val]) => {
          switch (rule.compare) {
            case 'eq': return val === rule.value;
            case 'ne': return val !== rule.value;
            case 'gt': return val > rule.value;
            case 'lt': return val < rule.value;
            case 'gte': return val >= rule.value;
            case 'lte': return val <= rule.value;
            case 'in': return (rule.value as number[]).includes(val);
            case 'notin': return !(rule.value as number[]).includes(val);
            default: return false;
          }
        }).map(([rid]) => rid);
      })
      const rids = getIntersection(ridGroup)
      tag.addressesRoot = calcAddressRoot(rids);

      console.log(`[UpdateTag] ${tag.id} ${tag.name}`,
        ridGroup.map(a => a.length), rids.length, tag.addressesRoot);

      fs.writeFileSync(
        path.join(__dirname, argv.outputRootDir, `${tag.addressesRoot}.json`),
        JSON.stringify(rids, null, 2));

      return tag.save();
    }

    function calcAddressRoot(rids: string[]) {
      console.log("[CalcAddressRoot] Start", rids.length)
      rids = rids.map(rid => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(rid)));

      const ridsTreeData = {}
      for (const rid of rids) ridsTreeData[rid] = 1;

      const ridsTree = new KVMerkleTree(
        ridsTreeData, poseidon, AddressTreeHeight);
      console.log("[CalcAddressRoot] Generated");

      const res = ridsTree.getRoot().toHexString();
      console.log("[CalcAddressRoot] Finished", rids.length, res)

      return res
    }

    if (!argv.name && !argv.id) {
      const tags = await Tag.findAll();
      await Promise.all(tags.map(update));
    } else {
      const tag = argv.id ?
        await Tag.findOne({ where: { id: argv.id } }) :
        await Tag.findOne({ where: { name: argv.name } });
      await update(tag);
    }
  }

  if (!argv.scan && !argv.update)
    console.error('Please specify --scan or --update');
}

app().start().then(runScanner)
  .then(() => process.exit(0));
