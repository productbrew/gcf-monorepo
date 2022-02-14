import { getConfigValue } from "@productbrew/config";
import * as cowsay from "cowsay";

export function getWelcomeMessage(name: string) {
  const companyName = getConfigValue("COMPANY_NAME");
  const website = getConfigValue("URL");

  return `\
Welcome ${name} to ${companyName}!

Our main website is ${website}`;
}

export function getCowMessage(name: string) {
  const version = getConfigValue("VERSION");

  return cowsay.say({
    text: `Hello ${name}! v${version}`,
    T: "U ",
    p: true,
  });
}
