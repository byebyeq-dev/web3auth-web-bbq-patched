import { LOGIN_PROVIDER, type SafeEventEmitter } from "@web3auth/auth";
import { ADAPTER_NAMES, ChainNamespaceType, cloneDeep, log, WalletRegistry } from "@web3auth/base";
import deepmerge from "deepmerge";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ExternalWalletEventType, MODAL_STATUS, ModalState, SocialLoginEventType, StateEmitterEvents } from "../interfaces";
import i18n from "../localeImport";
import AdapterLoader from "./AdapterLoader";
import Button from "./Button";
import ExternalWallets from "./ExternalWallets";
import Footer from "./Footer";
import Header from "./Header";
// import Loader from "./Loader";
import SocialLoginPasswordless from "./SocialLoginPasswordless";
import SocialLogins from "./SocialLogins";

interface ModalProps {
  stateListener: SafeEventEmitter<StateEmitterEvents>;
  appLogo?: string;
  appName?: string;
  chainNamespace: ChainNamespaceType;
  walletRegistry?: WalletRegistry;
  handleSocialLoginClick: (params: SocialLoginEventType) => void;
  handleExternalWalletClick: (params: ExternalWalletEventType) => void;
  handleShowExternalWallets: (externalWalletsInitialized: boolean) => void;
  closeModal: () => void;
}

log.enableAll();

export default function Modal(props: ModalProps) {
  const [modalTransitionClasses, setModalTransitionClasses] = useState(["w3a-modal__inner"]);

  const [modalState, setModalState] = useState<ModalState>({
    externalWalletsVisibility: false,
    status: MODAL_STATUS.INITIALIZED,
    hasExternalWallets: false,
    externalWalletsInitialized: false,
    modalVisibility: false,
    modalVisibilityDelayed: false,
    postLoadingMessage: "",
    walletConnectUri: "",
    socialLoginsConfig: {
      loginMethods: {},
      loginMethodsOrder: [],
      adapter: "",
      uiConfig: {},
    },
    externalWalletsConfig: {},
    detailedLoaderAdapter: "",
    detailedLoaderAdapterName: "",
    showExternalWalletsOnly: false,
  });
  const [t] = useTranslation(undefined, { i18n });

  const {
    stateListener,
    appLogo,
    appName,
    chainNamespace,
    walletRegistry,
    handleSocialLoginClick,
    handleExternalWalletClick,
    handleShowExternalWallets,
    closeModal,
  } = props;

  const [transition, setTransition] = useState("");

  useEffect(() => {
    stateListener.emit("MOUNTED");
    stateListener.on("STATE_UPDATED", (newModalState: Partial<ModalState>) => {
      log.debug("state updated", newModalState);

      setModalState((prevState) => {
        const mergedState = cloneDeep(deepmerge(prevState, newModalState));
        return mergedState;
      });
    });
  }, [stateListener]);

  useEffect(() => {
    let timeOutId: number;
    if (modalState.modalVisibility) {
      setModalState((prevState) => {
        return { ...prevState, modalVisibilityDelayed: modalState.modalVisibility };
      });

      timeOutId = window.setTimeout(() => {
        setModalTransitionClasses(["w3a-modal__inner", modalState.modalVisibility ? "w3a-modal__inner--active" : ""]);
        // hide external wallets, if modal is closing, so that it will show social login screen on reopen.
      }, 100);
    } else {
      setModalTransitionClasses(["w3a-modal__inner", modalState.modalVisibility ? "w3a-modal__inner--active" : ""]);
      // hide external wallets, if modal is closing, so that it will show social login screen on reopen.

      timeOutId = window.setTimeout(() => {
        setModalState((prevState) => {
          return { ...prevState, modalVisibilityDelayed: modalState.modalVisibility };
        });
      }, 250);
    }
    return () => {
      clearTimeout(timeOutId);
    };
  }, [modalState.modalVisibility]);

  const onCloseLoader = useCallback(() => {
    if (modalState.status === MODAL_STATUS.CONNECTED) {
      closeModal();
    }
    if (modalState.status === MODAL_STATUS.ERRORED) {
      setModalState((prevState) => {
        return { ...prevState, modalVisibility: true, status: MODAL_STATUS.INITIALIZED };
      });
    }
  }, [closeModal, modalState.status]);

  const preHandleExternalWalletClick = useCallback(
    (params: ExternalWalletEventType) => {
      const { adapter } = params;
      setModalState((prevState) => {
        return { ...prevState, detailedLoaderAdapter: adapter, detailedLoaderAdapterName: ADAPTER_NAMES[adapter] };
      });
      handleExternalWalletClick(params);
    },
    [handleExternalWalletClick]
  );

  const preHandleSocialWalletClick = (params: SocialLoginEventType) => {
    const { loginParams } = params;
    setModalState((prevState) => {
      return { ...prevState, detailedLoaderAdapter: loginParams.loginProvider, detailedLoaderAdapterName: loginParams.name };
    });
    handleSocialLoginClick(params);
  };

  const isEmailPrimary = modalState.socialLoginsConfig?.uiConfig?.primaryButton === "emailLogin";
  const isExternalPrimary = modalState.socialLoginsConfig?.uiConfig?.primaryButton === "externalLogin";



  // State for accept-terms checkbox (only declare once, at the top of the component)
  const [acceptTermsChecked, setAcceptTermsChecked] = useState(false);
  const externalWalletButton = (
    <div className="w3ajs-external-wallet w3a-group w3a--w-full">
      <div className="w3a-external-toggle w3ajs-external-toggle">
        {/* <div className="w3a-group__title">{t("modal.external.title")}</div> */}
        <Button
          variant={isExternalPrimary ? "primary" : "tertiary"}
          type="button"
          className="w3a--w-full w3ajs-external-toggle__button"
          style={{ width: "100%" }}
          disabled={!acceptTermsChecked}
          onClick={() => {
            setModalState((prevState) => {
              return {
                ...prevState,
                externalWalletsVisibility: true,
              };
            });
            setTransition("slide-enter");
            handleShowExternalWallets(modalState.externalWalletsInitialized);
            setTimeout(() => {
              setTransition("slide-exit");
            }, 300);
          }}
        >
          {t("modal.external.connect")}
        </Button>
      </div>
    </div>
  );

  const areSocialLoginsVisible = useMemo(() => {
    if (modalState.showExternalWalletsOnly) return false;
    if (Object.keys(modalState.socialLoginsConfig?.loginMethods || {}).length === 0) return false;
    const isAnySocialLoginVisible = Object.entries(modalState.socialLoginsConfig?.loginMethods || {}).some(
      ([k, v]) => k !== LOGIN_PROVIDER.EMAIL_PASSWORDLESS && v.showOnModal !== false
    );
    if (isAnySocialLoginVisible) return true;
    return false;
  }, [modalState.showExternalWalletsOnly, modalState.socialLoginsConfig?.loginMethods]);
  log.info("modal state", modalState, areSocialLoginsVisible);

  const isEmailPasswordlessLoginVisible = useMemo(() => {
    return modalState.socialLoginsConfig?.loginMethods[LOGIN_PROVIDER.EMAIL_PASSWORDLESS]?.showOnModal;
  }, [modalState.socialLoginsConfig?.loginMethods]);

  const isSmsPasswordlessLoginVisible = useMemo(() => {
    return modalState.socialLoginsConfig?.loginMethods[LOGIN_PROVIDER.SMS_PASSWORDLESS]?.showOnModal;
  }, [modalState.socialLoginsConfig?.loginMethods]);

  // State for accept-terms checkbox
  // (removed duplicate declaration)

  return (
    modalState.modalVisibilityDelayed && (
      <div id="w3a-modal" className="w3a-modal">
        <div
          className={`${modalTransitionClasses.join(" ")} ${modalState.status !== MODAL_STATUS.INITIALIZED ? "w3a--p-6 w3a--pt-7" : ""} ${(areSocialLoginsVisible || isEmailPasswordlessLoginVisible || isSmsPasswordlessLoginVisible) && !modalState.externalWalletsVisibility
            ? ""
            : "wallet-adapter-container"
            }`}
        >
          {modalState.status !== MODAL_STATUS.INITIALIZED ? (
            <>
              <Header onClose={closeModal} appLogo={appLogo} appName={appName} />
              <div className="w3a-modal__content w3ajs-content">
                <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                  <input
                    type="checkbox"
                    id="accept-terms"
                    style={{ marginRight: "0.5rem" }}
                    checked={acceptTermsChecked}
                    onChange={() => setAcceptTermsChecked((prev) => !prev)}
                  />
                  <label htmlFor="accept-terms" style={{ fontSize: "0.95rem" }}>
                    {t("modal.social.terms_1")} <a className="text-primary underline-offset-4 hover:underline" href="/tos" target="_blank" rel="noopener noreferrer">{t("modal.social.terms_2")}</a>
                  </label>
                </div>
                {/* {modalState.detailedLoaderAdapter ? ( */}
                <AdapterLoader
                  onClose={onCloseLoader}
                  appLogo={appLogo}
                  modalStatus={modalState.status}
                  message={t(modalState.postLoadingMessage)}
                  adapter={modalState.detailedLoaderAdapter}
                  adapterName={modalState.detailedLoaderAdapterName}
                />
                {/* ) : ( */}
                {/* <Loader onClose={onCloseLoader} modalStatus={modalState.status} message={t(modalState.postLoadingMessage)} /> */}
                {/* )} */}
              </div>
            </>
          ) : (
            <div className={`transition-wrapper ${transition}`}>
              {(areSocialLoginsVisible || isEmailPasswordlessLoginVisible || isSmsPasswordlessLoginVisible) &&
                !modalState.externalWalletsVisibility ? (
                <>
                  <Header onClose={closeModal} appLogo={appLogo} appName={appName} />
                  <div className="w3a-modal__content w3ajs-content">
                    <div style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}>
                      <input
                        type="checkbox"
                        id="accept-terms"
                        style={{ marginRight: "0.5rem" }}
                        checked={acceptTermsChecked}
                        onChange={() => setAcceptTermsChecked((prev) => !prev)}
                      />
                      <label htmlFor="accept-terms" style={{ fontSize: "0.95rem" }}>
                        {t("modal.social.terms_1")} <a className="text-primary underline-offset-4 hover:underline" href="/tos" target="_blank" rel="noopener noreferrer">{t("modal.social.terms_2")}</a>
                      </label>
                    </div>
                    {areSocialLoginsVisible ? (
                      <SocialLogins
                        handleSocialLoginClick={(params: SocialLoginEventType) => preHandleSocialWalletClick(params)}
                        socialLoginsConfig={{ ...modalState.socialLoginsConfig, disableButtons: !acceptTermsChecked }}
                      />
                    ) : null}

                    {(isEmailPasswordlessLoginVisible || isSmsPasswordlessLoginVisible) && (
                      <SocialLoginPasswordless
                        isEmailVisible={isEmailPasswordlessLoginVisible}
                        isSmsVisible={isSmsPasswordlessLoginVisible}
                        adapter={modalState.socialLoginsConfig?.adapter}
                        handleSocialLoginClick={(params: SocialLoginEventType) => preHandleSocialWalletClick(params)}
                        isPrimaryBtn={isEmailPrimary}
                        disableButtons={!acceptTermsChecked}
                      />
                    )}

                    {/* button to show external wallets */}
                    {modalState.hasExternalWallets && externalWalletButton}
                  </div>
                </>
              ) : (
                <div className="w3a-modal__content_external_wallet w3ajs-content">
                  <ExternalWallets
                    modalStatus={modalState.status}
                    showBackButton={areSocialLoginsVisible || isEmailPasswordlessLoginVisible || isSmsPasswordlessLoginVisible}
                    handleExternalWalletClick={preHandleExternalWalletClick}
                    chainNamespace={chainNamespace}
                    walletConnectUri={modalState.walletConnectUri}
                    config={modalState.externalWalletsConfig}
                    hideExternalWallets={() =>
                      setModalState((prevState) => {
                        return { ...prevState, externalWalletsVisibility: false };
                      })
                    }
                    walletRegistry={walletRegistry}
                    closeModal={closeModal}
                  />
                </div>
              )}
            </div>
          )}

          <Footer />
        </div>
      </div>
    )
  );
}
