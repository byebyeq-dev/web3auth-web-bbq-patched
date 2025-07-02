import { LOGIN_PROVIDER } from "@web3auth/auth";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import i18n from "../localeImport";
import { getUserCountry, validatePhoneNumber } from "../utils";
import Button from "./Button";
import Icon from "./Icon";

interface SocialLoginPasswordlessProps {
  isPrimaryBtn: boolean;
  isEmailVisible: boolean;
  isSmsVisible: boolean;
  adapter: string;
  handleSocialLoginClick: (params: { adapter: string; loginParams: { loginProvider: string; login_hint?: string; name: string } }) => void;
  disableButtons?: boolean;
}
export default function SocialLoginPasswordless(props: SocialLoginPasswordlessProps) {
  const { handleSocialLoginClick, adapter, isPrimaryBtn, isEmailVisible, isSmsVisible, disableButtons } = props;

  const [fieldValue, setFieldValue] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("");
  const [isValidInput, setIsValidInput] = useState<boolean | null>(null);

  const [t] = useTranslation(undefined, { i18n });

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = fieldValue;
    if (isEmailVisible) {
      const isEmailValid = value.match(/^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i);
      if (isEmailValid) {
        return handleSocialLoginClick({
          adapter,
          loginParams: { loginProvider: LOGIN_PROVIDER.EMAIL_PASSWORDLESS, login_hint: value, name: "Email" },
        });
      }
    }
    if (isSmsVisible) {
      const number = value.startsWith("+") ? value : `${countryCode}${value}`;
      const result = await validatePhoneNumber(number);
      if (result) {
        return handleSocialLoginClick({
          adapter,
          loginParams: { loginProvider: LOGIN_PROVIDER.SMS_PASSWORDLESS, login_hint: typeof result === "string" ? result : number, name: "Mobile" },
        });
      }
    }

    setIsValidInput(false);
    return undefined;
  };

  useEffect(() => {
    const getLocation = async () => {
      const result = await getUserCountry();
      if (result && result.dialCode) {
        setCountryCode(result.dialCode);
      }
    };
    if (isSmsVisible) getLocation();
  }, [isSmsVisible]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFieldValue(e.target.value);
    if (isValidInput === false) setIsValidInput(null);
  };

  const title = useMemo(() => {
    if (isEmailVisible && isSmsVisible) return "modal.social.passwordless-title";
    if (isEmailVisible) return "modal.social.email";
    return "modal.social.phone";
  }, [isEmailVisible, isSmsVisible]);

  const placeholder = useMemo(() => {
    if (isEmailVisible && isSmsVisible) return "+(00)123456/name@example.com";
    if (isEmailVisible) return "name@example.com";
    return "+(00)123456";
  }, [isEmailVisible, isSmsVisible]);

  const invalidInputErrorMessage = useMemo(() => {
    if (isEmailVisible && isSmsVisible) return "modal.errors-invalid-number-email";
    if (isEmailVisible) return "modal.errors-invalid-email";
    return "modal.errors-invalid-number";
  }, [isEmailVisible, isSmsVisible]);

  return (
    <div className="w3ajs-passwordless w3a-group w3a-group--passwordless">
      <div className="w3a-group__title">
        {t(title)}
        {isSmsVisible && (
          <div className="w3a--relative w3a--flex w3a--flex-col w3a--items-center w3a--cursor-pointer w3a--group">
            <Icon iconName="information-circle-light" darkIconName="information-circle" />
            <div className="w3a--absolute w3a--z-20 w3a--flex-col w3a--items-center w3a--hidden w3a--mb-5 w3a--top-4 group-hover:w3a--flex">
              <div className="w3a--w-3 w3a--h-3 w3a--ml-[3px] -w3a--mb-2 w3a--rotate-45 w3a--bg-app-gray-50 dark:w3a--bg-app-gray-600" />
              <div
                className={`w3a--relative w3a--p-4 w3a--w-[300px] w3a--text-xs w3a--leading-none w3a--text-app-white w3a--rounded-md w3a--bg-app-gray-50 dark:w3a--bg-app-gray-600 w3a--shadow-lg ${isSmsVisible && !isEmailVisible ? "w3a--left-20" : "w3a--left-8"
                  }`}
              >
                <div className="w3a--mb-1 w3a--text-xs w3a--font-medium w3a--text-app-gray-900 dark:w3a--text-app-white">
                  {t("modal.popup.phone-header")}
                </div>
                <div className="w3a--text-xs w3a--text-app-gray-400">{t("modal.popup.phone-body")}</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <form className="w3ajs-passwordless-form" onSubmit={(e) => handleFormSubmit(e)}>
        <input
          className="w3a--w-full w3a--mb-4 w3a-text-field"
          name="passwordless-input"
          required
          placeholder={`${t("modal.social.sms-placeholder-text")} ${placeholder}`}
          onFocus={(e) => {
            e.target.placeholder = "";
          }}
          onBlur={(e) => {
            e.target.placeholder = `${t("modal.social.sms-placeholder-text")} ${placeholder}`;
          }}
          onChange={(e) => handleInputChange(e)}
        />

        {isValidInput === false && <div className="w3a-sms-field--error">{t(invalidInputErrorMessage)}</div>}

        <Button variant={isPrimaryBtn ? "primary" : "tertiary"} disabled={fieldValue === "" || disableButtons} className="w3a--w-full" type="submit">
          {t("modal.social.passwordless-cta")}
        </Button>
      </form>
    </div>
  );
}
