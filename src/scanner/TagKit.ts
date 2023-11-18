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
import {bucketMgr} from "../modules/aws/bucket/Bucket";

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
    .option('upload', {
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
      console.log(`[Scan] Start ${name}`);

      const scannerScript = path.join(__dirname, argv.scannerDir, name);
      const scanner = require(scannerScript);
      const scanFunction = scanner.default as Scanner
      const append = scanner.append as boolean;

      const se = new ScannerEnvironment(name, argv.outputDir)
      console.log(`[Scan] ScannerEnvironment`, se);
      let result = await scanFunction(se);
      if (append) {
        console.log(`[Scan] Done`, result.length, 'Appending');

        const lastScanResult = se.getScanResult(); // 上次扫描结果
        console.log(`[Scan] Last result`, lastScanResult.length);

        const lastScanRids = lastScanResult.map(([rid, _]) => rid); // 上次扫描结果的rid
        const newScanRids = result.map(([rid, _]) => rid); // 本次扫描结果的rid
        const intersection = getIntersection([lastScanRids, newScanRids]); // 重合的rid
        console.log(`[Scan] Intersection`, intersection.length);

        const lastResult = lastScanResult.filter(([rid, _]) => !intersection.includes(rid)) // 上次扫描结果中不重合的rid

        result = [...lastResult, ...result]; // 合并上次扫描结果和本次扫描结果
      }
      console.log(`[Scan] Done`, result.length);

      const timestamp = Date.now();
      const outputFile = path.join(argv.outputDir, name, `/${timestamp}.json`);

      if (!fs.existsSync(path.join(argv.outputDir, name)))
        fs.mkdirSync(path.join(argv.outputDir, name), { recursive: true });

      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));

      console.log(`[Scan] Saved`, outputFile);
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
      console.log(`[Update] ${tag.id} ${tag.name}`, tag.rules);

      const ridGroup = tag.rules.map(rule => {
        const groupPath = path.join(argv.outputDir, rule.groupName);
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

      console.log(`[Update] ${tag.id} ${tag.name}`,
        ridGroup.map(a => a.length), rids.length, tag.addressesRoot);

      fs.writeFileSync(
        path.join(argv.outputRootDir, `${tag.addressesRoot}.json`),
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

  if (argv.upload) {
    async function upload(root?: string) {
      console.log(`[Upload] ${root}`);

      const rootFile = path.join(argv.outputRootDir, `${root}.json`)
      const addresses = JSON.parse(fs.readFileSync(rootFile, 'utf-8')) as string[];

      const awsPath = `addressRoots/${root}.json`
      const data = await bucketMgr().getFile(awsPath)
      if (!data) {
        await bucketMgr().uploadFile(awsPath, JSON.stringify(addresses), {
          ContentType: "application/json"
        })
        console.log(`[Upload] ${root} uploaded`);
      } else console.log(`[Upload] ${root} already exists`);
      return root;
    }

    const roots = fs.readdirSync(argv.outputRootDir).map(file => path.parse(file).name);
    await Promise.all(roots.map(upload));
  }

  if (!argv.scan && !argv.update && !argv.upload)
    console.error('Please specify --scan or --update or --upload');
}

app().start().then(runScanner)
  .then(() => process.exit(0));
