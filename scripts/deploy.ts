import path from "path";
import fs from "fs";
import { generateFunctionEntryFile } from "./generateEntry";
import { getPackageConfig } from "./getPackageConfig";
import { FUNCTIONS_DIRECTORY } from "./const";
const { performance } = require("perf_hooks");

const functionName = process.argv.slice(2)[0];

if (functionName) {
  updatePackageJson(functionName);
}

function updatePackageJson(functionName: string) {
  const result = generateFunctionEntryFile(functionName);

  if (!result) {
    return;
  }

  // TODO: run build step

  console.log("🏗  Preparing for deployment...");

  const functionPackageConfig = getPackageConfig(functionName);

  const functionPackageJsonPath = path.join(FUNCTIONS_DIRECTORY, functionName, "package.json");
  const packageJson = fs.readFileSync(functionPackageJsonPath, "utf8");
  const packageJsonObj = JSON.parse(packageJson);

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

  // TODO: bring back the package.json and yarn.lock
}
