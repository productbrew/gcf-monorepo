import path from "path";
import fs from "fs";

const FUNCTIONS_DIRECTORY = path.join(__dirname, "../functions");

export function getPackageConfig(functionName: string) {
  const functionPackageDir = path.join(FUNCTIONS_DIRECTORY, functionName, "dist", "packages");
  const packageNames = fs.readdirSync(functionPackageDir);

  return packageNames.map((packageName) => {
    const packageDir = path.join(__dirname, "..", "packages", packageName, "package.json");

    const packageJsonFile = fs.readFileSync(packageDir, "utf8");
    const packageJson = JSON.parse(packageJsonFile);

    return {
      name: packageJson.name,
      alias: `"${packageJson.name}": path.join(__dirname, "packages/${packageName}/src")`,
      dependencies: packageJson.dependencies,
    };
  });
}
