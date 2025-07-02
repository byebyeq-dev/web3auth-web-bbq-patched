import { get, post } from "@toruslabs/http-helpers";
// import { LANGUAGE_MAP, LANGUAGE_TYPE, LANGUAGES } from "@web3auth/auth";
import { log, LoginMethodConfig, WALLET_ADAPTERS, WalletInitializationError } from "@web3auth/base";

import { AUTH_PROVIDERS, AUTH_PROVIDERS_NAMES } from "./config";

export declare const LANGUAGES: {
  readonly en: "en";
  readonly ja: "ja";
  readonly ko: "ko";
  readonly de: "de";
  readonly it: "it";
  readonly zh: "zh";
  readonly es: "es";
  readonly fr: "fr";
  readonly pt: "pt";
  readonly nl: "nl";
  readonly tr: "tr";
};
export const LANGUAGES_2 = {
  en: "en",
  ja: "ja",
  ko: "ko",
  de: "de",
  it: "it",
  zh: "zh",
  es: "es",
  fr: "fr",
  pt: "pt",
  nl: "nl",
  tr: "tr",
};
export type LANGUAGE_TYPE = (typeof LANGUAGES)[keyof typeof LANGUAGES];
export declare const LANGUAGE_MAP: Record<LANGUAGE_TYPE, string>;

export const getAdapterSocialLogins = (adapterName: string, loginMethodsConfig: LoginMethodConfig = {}): LoginMethodConfig => {
  const finalLoginMethodsConfig: LoginMethodConfig = {};
  if (adapterName === WALLET_ADAPTERS.AUTH) {
    AUTH_PROVIDERS.forEach((loginMethod) => {
      const currentLoginMethodConfig = loginMethodsConfig[loginMethod] || {
        name: AUTH_PROVIDERS_NAMES[loginMethod],
        showOnMobile: true,
        showOnModal: true,
        showOnDesktop: true,
      };
      finalLoginMethodsConfig[loginMethod] = { ...currentLoginMethodConfig };
    });
    log.debug("auth login method ui config", finalLoginMethodsConfig);
  } else {
    throw WalletInitializationError.invalidParams(`${adapterName} is not a valid adapter`);
  }
  return finalLoginMethodsConfig;
};

export async function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    if (img.complete) {
      resolve(true);
    } else {
      img.addEventListener("load", () => {
        resolve(true);
      });
      img.addEventListener("error", () => {
        reject();
      });
    }
  });
}

export async function getNetworkIconId(ticker: string): Promise<string> {
  const fallbackId = "network-default";
  if (!ticker) return fallbackId;
  try {
    const url = `https://images.web3auth.io/network-${ticker.toLowerCase()}.svg`;
    const isValid = await validateImageUrl(url);
    if (isValid) {
      return `network-${ticker.toLowerCase()}`;
    }
    return fallbackId;
  } catch {
    return fallbackId;
  }
}

export const passwordlessBackendUrl = "https://api-passwordless.web3auth.io";

export const getUserCountry = async (): Promise<{ country: string; dialCode: string } | null> => {
  try {
    const result = await get<{ data: { country: string; dial_code: string } }>(`${passwordlessBackendUrl}/api/v3/user/location`);
    if (result && result.data.country) return { country: result.data.country, dialCode: result.data.dial_code };
    return null;
  } catch (error) {
    log.error("error getting user country", error);
    return null;
  }
};

export const validatePhoneNumber = async (phoneNumber: string): Promise<string | boolean> => {
  try {
    const result = await post<{ success: boolean; parsed_number: string }>(`${passwordlessBackendUrl}/api/v3/phone_number/validate`, {
      phone_number: phoneNumber,
    });
    if (result && result.success) return result.parsed_number;
    return false;
  } catch (error: unknown) {
    log.error("error validating phone number", error);
    if ((error as Response).status === 400) {
      return false;
    }
    // sending true because we don't want the user to be stuck on a flow
    // if there is an error with the api or something went wrong.
    return true;
  }
};

interface NavigatorLanguage {
  userLanguage?: string;
}

export const getUserLanguage = (_defaultLanguage: string | undefined): LANGUAGE_TYPE => {
  let userLanguage = undefined;
  if (!userLanguage) {
    const browserLanguage =
      typeof window !== "undefined" ? (window.navigator as NavigatorLanguage).userLanguage || window.navigator.language || "en-US" : "en-US";
    userLanguage = browserLanguage.split("-")[0];
  }
  return Object.prototype.hasOwnProperty.call(LANGUAGES_2, userLanguage) ? (userLanguage as LANGUAGE_TYPE) : LANGUAGES.en;
};
