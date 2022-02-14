import path from "path";
import fs from "fs";
import { getPackageConfig } from "./getPackageConfig";
import { FUNCTIONS_DIRECTORY } from "./const";
import { performance } from "perf_hooks";

export function generateForAllFunctions() {
  const START_TIME = performance.now();

  fs.readdirSync(FUNCTIONS_DIRECTORY).forEach(generateFunctionEntryFile);

  const END_TIME = performance.now();
  console.log(`\n🏁 Finished in ${(END_TIME - START_TIME).toPrecision(4)} milliseconds`);
}

export function generateFunctionEntryFile(functionName: string) {
  const functionDir = path.join(FUNCTIONS_DIRECTORY, functionName);

  const isFunctionExists = fs.existsSync(functionDir);

  if (!isFunctionExists) {
    console.log(`❌  Function "${functionName}" does not exist.`);
    return false;
  }

  const functionDistDir = path.join(FUNCTIONS_DIRECTORY, functionName, "dist");

  const isFunctionBuilded = fs.existsSync(functionDistDir);
  if (!isFunctionBuilded) {
    console.log(`⚠️  Function "${functionName}" is not builded. Skipping...`);
    return false;
  }

  const hasFunctionPackage = fs.existsSync(path.join(functionDistDir, "packages"));
  if (!hasFunctionPackage) {
    console.log(`Function "${functionName}" has no packages. Skipping...`);
    return false;
  }

  const entryFile = generateEntryFile(functionName);

  fs.writeFileSync(path.join(functionDistDir, "index.js"), entryFile);
  console.log(`✅ Function "${functionName}" entry file generated.`);

  return true;
}

function generateEntryFile(functionName: string) {
  const packagesConfig = getPackageConfig(functionName);

  const aliases = packagesConfig.map((config) => config.alias).join(",\n  ");

  const entryFile = `\
  const path = require("path");
  const moduleAlias = require("module-alias");

  moduleAlias.addAliases({
    ${aliases}
  });

  module.exports = require("./functions/${functionName}/src/index");
  `;

  return entryFile;
}
