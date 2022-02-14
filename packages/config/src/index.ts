export enum Config {
  URL = "URL",
  COMPANY_NAME = "COMPANY_NAME",
  VERSION = "VERSION",
}

/**
 * Get the config value
 */
export function getConfigValue(key: keyof typeof Config) {
  switch (key) {
    case Config.URL:
      return "https://productbrew.com";

    case Config.COMPANY_NAME:
      return "Product Brew";

    case Config.VERSION:
      return "1.0.0";

    default:
      throw new Error("Key not found!");
  }
}
