import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const FUNCTIONS_DIRECTORY = path.join(__dirname, "functions");
const ARGS = process.argv.slice(2);
const COMMAND = ARGS[0];
const FUNCTION_NAME = ARGS[1];
const AVAILABLE_COMMANDS = ["generate-entrypoint", "prepare-deploy"];

/**
 *
 * Beggining of entry file
 *
 */

if (!COMMAND) {
  console.log("\n🚨 Please specify a command.\n");
  process.exit(1);
}

if (!AVAILABLE_COMMANDS.includes(COMMAND)) {
  console.log(`\n🚨 Unknown command "${COMMAND}".\n`);
  console.log(`ℹ️  Available commands: ${AVAILABLE_COMMANDS.join(", ")}\n`);
  process.exit(1);
}

if (!FUNCTION_NAME) {
  console.log("\n🚨 Please specify a function name.\n");
  process.exit(1);
}

if (COMMAND === "generate-entrypoint") {
  const START_TIME = performance.now();
  buildFunctionEntryPoint(FUNCTION_NAME);
  const END_TIME = performance.now();

  console.log(`\n🏁 Finished in ${(END_TIME - START_TIME).toPrecision(4)} milliseconds\n`);
  process.exit(0);
}

if (COMMAND === "prepare-deploy") {
  console.log(`\n⛏  Preparing functions "${FUNCTION_NAME}" for deploy...`);

  buildFunctionEntryPoint(FUNCTION_NAME);
  prepareFunctionForDeploy(FUNCTION_NAME);

  console.log(`\n🚀 Functions "${FUNCTION_NAME}" prepared for deploy!`);
  console.log(`ℹ️  Use "gcloud functions deploy ${FUNCTION_NAME} --runtime nodejs14" to deploy the function.\n`);

  process.exit(0);
}

/**
 *
 * Functions used in entry point
 *
 */
function buildFunctionEntryPoint(functionName: string) {
  const functionDir = path.join(FUNCTIONS_DIRECTORY, functionName);

  const isFunctionExists = fs.existsSync(functionDir);
  if (!isFunctionExists) {
    console.log(`❌  Function "${functionName}" does not exist.`);
    process.exit(1);
  }

  const functionDistDir = path.join(functionDir, "dist");

  const isFunctionBuilded = fs.existsSync(functionDistDir);
  if (!isFunctionBuilded) {
    console.log(`⚠️  Function "${functionName}" is not builded.`);
    runFunctionBuild(functionName);
  }

  const functionPackageDir = path.join(functionDistDir, "packages");

  const hasFunctionPackage = fs.existsSync(functionPackageDir);
  if (!hasFunctionPackage) {
    console.log(`ℹ️ Function "${functionName}" has no packages. No need to generate entry file. Skipping...`);
    return;
  }

  const entryFile = generateEntryFile(functionName);

  const indexJsPath = path.join(functionDistDir, "index.js");
  fs.writeFileSync(indexJsPath, entryFile);

  console.log(`\n🎫 Function "${functionName}" entry file generated succesfuly 🎉.`);
}

function generateEntryFile(functionName: string) {
  const packagesConfig = getInternalPackageConfig(functionName);

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

function runFunctionBuild(functionName: string) {
  console.log(`🏗  Building "${functionName}" function...`);
  try {
    const functionDir = path.join(FUNCTIONS_DIRECTORY, functionName);
    const packageJsonPath = path.join(functionDir, "package.json");
    const packageJsonFile = fs.readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonFile);

    const response = execSync(`yarn workspace ${packageJson.name} build`);

    console.log(`✅ Function "${functionName}" builded!`);
  } catch (error) {
    console.log("\n🚨 Error while building function!\n");
    process.exit(1);
  }
}

function prepareFunctionForDeploy(functionName: string) {
  const functionPackageConfig = getInternalPackageConfig(functionName);

  console.log("👀 Reading package.json file...");

  const functionPackageJsonPath = path.join(FUNCTIONS_DIRECTORY, functionName, "package.json");
  const packageJson = fs.readFileSync(functionPackageJsonPath, "utf8");
  const packageJsonObj = JSON.parse(packageJson);

  console.log("📦 Updating package.json file...");

  const updatedDependencies = functionPackageConfig.reduce((acc, packageConfig) => {
    delete acc[packageConfig.name];

    return {
      ...acc,
      ...packageConfig.dependencies,
    };
  }, packageJsonObj.dependencies);

  const updatedPackageJson = {
    ...packageJsonObj,
    dependencies: updatedDependencies,
  };

  fs.writeFileSync(functionPackageJsonPath, JSON.stringify(updatedPackageJson, null, 2));

  console.log("🤞 package.json updated with all needed dependencies");

  const yarnLockPath = path.join(__dirname, "..", "yarn.lock");
  const yarnLockDestination = path.join(FUNCTIONS_DIRECTORY, functionName, "yarn.lock");
  fs.copyFileSync(yarnLockPath, yarnLockDestination);

  console.log("📦  yarn.lock copied");
}

function getInternalPackageConfig(functionName: string) {
  const functionPackageDir = path.join(FUNCTIONS_DIRECTORY, functionName, "dist", "packages");
  const packageNames = fs.readdirSync(functionPackageDir);

  return packageNames.map((packageName) => {
    const packageDir = path.join(__dirname, "packages", packageName, "package.json");

    const packageJsonFile = fs.readFileSync(packageDir, "utf8");
    const packageJson = JSON.parse(packageJsonFile);

    return {
      name: packageJson.name,
      alias: `"${packageJson.name}": path.join(__dirname, "packages/${packageName}/src")`,
      dependencies: packageJson.dependencies,
    };
  });
}
