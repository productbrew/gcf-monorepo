import { generateFunctionEntryFile, generateForAllFunctions } from "./generateEntry";

const COMMAND = process.argv.slice(2)[0];

/**
 * Entry point for the generateFunctionsEntryFile script.
 */
if (COMMAND?.toLowerCase() === "generate") {
  console.log("🏎  Generating entry point for all functions ...\n");

  generateForAllFunctions();
} else if (COMMAND) {
  console.log(`🏎  Generating entry point for ${COMMAND} functions ...\n`);

  const START_TIME = performance.now();
  generateFunctionEntryFile(COMMAND);
  const END_TIME = performance.now();

  console.log(`\n🏁 Finished in ${(END_TIME - START_TIME).toPrecision(4)} milliseconds`);
} else {
  console.log("\n Please specify a function name or 'ALL'");
}
