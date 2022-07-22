import path from "path";
import YAML from "yaml";
import fs from "fs";
import { execSync } from "child_process";
import { performance } from "perf_hooks";

const ARGS = process.argv.slice(2);
const COMMAND = ARGS[0];
const FUNCTION_NAME = ARGS[1];

if (!FUNCTION_NAME) {
  console.log("\n🚨 Please specify a function name.\n");

  process.exit(1);
}

const AVAILABLE_COMMANDS = ["generate-entrypoint", "deploy"];

const FUNCTIONS_DIRECTORY = path.join(__dirname, "functions");
const FUNCTION_DIR = path.join(FUNCTIONS_DIRECTORY, FUNCTION_NAME);

/**
 *
 * Beginning of entry file
 *
 * source: https://dev.to/czystyl/google-cloud-functions-in-monorepo-44ak
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
  buildFunctionEntryPoint();
  const END_TIME = performance.now();

  console.log(`\n🏁 Finished in ${(END_TIME - START_TIME).toPrecision(4)} milliseconds\n`);

  process.exit(0);
}

if (COMMAND === "deploy") {
  console.log(`\n⛏  Preparing functions "${FUNCTION_NAME}" for deploy...`);

  deployFunction();

  process.exit(0);
}

/**
 *
 * Functions used in entry point
 *
 */
function buildFunctionEntryPoint() {
  const isFunctionExists = fs.existsSync(FUNCTION_DIR);
  if (!isFunctionExists) {
    console.log(`❌  Function "${FUNCTION_NAME}" does not exist.`);
    process.exit(1);
  }

  const functionDistDir = path.join(FUNCTION_DIR, "dist");

  runFunctionBuild();

  const functionPackageDir = path.join(functionDistDir, "packages");

  const hasFunctionPackage = fs.existsSync(functionPackageDir);
  if (!hasFunctionPackage) {
    console.log(`ℹ️ Function "${FUNCTION_NAME}" has no packages. No need to generate entry file. Skipping...`);
    return;
  }

  const entryFile = generateEntryFile();

  const indexJsPath = path.join(functionDistDir, "index.js");
  fs.writeFileSync(indexJsPath, entryFile);

  console.log(`\n🎫 Function "${FUNCTION_NAME}" entry file generated succesfuly 🎉`);
}

function generateEntryFile() {
  const packagesConfig = getInternalPackageConfig();

  const aliases = packagesConfig.map((config) => config.alias);

  const entryFile = `\
const path = require("path");
const moduleAlias = require("module-alias");

moduleAlias.addAliases({
  ${aliases.join(",\n  ")}
});

module.exports = require("./functions/${FUNCTION_NAME}/src/index");
`;

  return entryFile;
}

function runFunctionBuild() {
  console.log(`🏗  Building "${FUNCTION_NAME}" function...`);

  try {
    const packageJsonPath = path.join(FUNCTION_DIR, "package.json");
    const packageJsonFile = fs.readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonFile);

    if (packageJson.dependencies["module-alias"] === undefined) {
      console.log('\n🚨 Function package.json does not include "module-alias" package.\n');

      process.exit(1);
    }

    execSync(`yarn workspace ${packageJson.name} build`);

    console.log(`✅ Function "${FUNCTION_NAME}" builded!`);
  } catch (error) {
    console.log(error);
    console.log("\n🚨 Error while building function!\n");

    process.exit(1);
  }
}

function prepareFunctionForDeploy() {
  buildFunctionEntryPoint();

  const functionPackageConfig = getInternalPackageConfig();

  console.log("👀 Reading package.json file...");

  const functionPackageJsonPath = path.join(FUNCTION_DIR, "package.json");
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

  const yarnLockPath = path.join(__dirname, "yarn.lock");
  const yarnLockDestination = path.join(FUNCTION_DIR, "yarn.lock");
  fs.copyFileSync(yarnLockPath, yarnLockDestination);

  console.log("📦  yarn.lock copied");
}

function deployFunction() {
  console.log(`🚀  Deploying...`);

  prepareFunctionForDeploy();

  try {
    const configObj = getEnvVariableConfig();

    const envVariables = Object.entries(configObj)
      .map(([key, value]) => `${key}='${value}'`)
      .join(",");

    console.log("🚀 Deploying a function, may take up to 2 minutes...");

    const command = `\
gcloud functions deploy ${FUNCTION_NAME} \
--source ${FUNCTION_DIR} \
--set-env-vars ${envVariables} \
${getFunctionFlags()}`;

    execSync(command);

    console.log(`✅  Function "${FUNCTION_NAME}" deployed! 🎉`);
  } catch (error) {
    console.log(error);
    console.log("\n🚨 Error while deploying function!\n");
    process.exit(1);
  }
}

function getFunctionFlags() {
  const packageJsonPath = path.join(FUNCTION_DIR, "package.json");
  const packageJsonFile = fs.readFileSync(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonFile);

  if (!packageJson.gcfConfig) {
    return "";
  }

  const gcfFlags = Object.entries(packageJson.gcfConfig)
    .map(([key, value]) => {
      if (value === true) {
        return `--${key}`;
      }

      return `--${key}='${value}'`;
    })
    .join(" ");

  return gcfFlags;
}

function getEnvVariableConfig() {
  const mainConfigFilePath = path.join(FUNCTION_DIR, ".env.yaml");
  const mainConfigFile = fs.readFileSync(mainConfigFilePath, "utf8");
  const mainConfigFileObj = YAML.parse(mainConfigFile);

  const functionConfigFilePath = path.join(FUNCTION_DIR, `.env.${FUNCTION_NAME}.yaml`);

  if (fs.existsSync(functionConfigFilePath)) {
    const functionConfigFile = fs.readFileSync(functionConfigFilePath, "utf8");
    const functionConfigObj = YAML.parse(functionConfigFile);

    return {
      ...mainConfigFileObj,
      ...functionConfigObj,
    };
  }

  return {
    ...mainConfigFileObj,
  };
}

function getInternalPackageConfig() {
  const functionPackageDir = path.join(FUNCTION_DIR, "dist", "packages");
  const packageNames = fs.readdirSync(functionPackageDir);

  const packages = packageNames.map((packageName) => {
    const packageDir = path.join(__dirname, "packages", packageName, "package.json");

    const packageJsonFile = fs.readFileSync(packageDir, "utf8");
    const packageJson = JSON.parse(packageJsonFile);

    return {
      name: packageJson.name,
      alias: `"${packageJson.name}": path.join(__dirname, "packages/${packageName}/src")`,
      dependencies: packageJson.dependencies,
    };
  });

  return packages;
}
