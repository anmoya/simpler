#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateNextVersion } from "./releaseVersion.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = resolve(rootDir, "package.json");
const tauriConfPath = resolve(rootDir, "src-tauri/tauri.conf.json");

function main() {
  const nextVersion = process.argv[2];
  if (!nextVersion) {
    console.error("Usage: npm run release -- <version>");
    process.exit(1);
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const error = validateNextVersion(packageJson.version, nextVersion);
  if (error) {
    console.error(error);
    process.exit(1);
  }

  const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf8"));

  packageJson.version = nextVersion;
  tauriConf.version = nextVersion;

  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  writeFileSync(tauriConfPath, `${JSON.stringify(tauriConf, null, 2)}\n`);

  console.log(`Bumped version to ${nextVersion} in package.json and src-tauri/tauri.conf.json`);
}

main();
