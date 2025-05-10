"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useMounted } from "@/hooks/useMounted";
import { useConnect } from "wagmi";

export function WalletConnect() {
  const mounted = useMounted();
  const { error } = useConnect();

  return (
    <div className="flex flex-col items-center justify-center">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted: rainbowKitMounted,
        }) => {
          const ready = mounted && rainbowKitMounted;

          if (!ready) {
            return (
              <div className="h-10 w-40 bg-gray-200 rounded-full animate-pulse"></div>
            );
          }

          if (!account) {
            return (
              <button
                onClick={openConnectModal}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-full transition-colors duration-200"
              >
                Connect Wallet
              </button>
            );
          }

          const isWrongNetwork = chain?.unsupported;

          return (
            <div className="flex">
              {isWrongNetwork && (
                <button
                  onClick={openChainModal}
                  className="bg-red-500 hover:bg-red-600 text-white font-medium px-6 py-2 rounded-full transition-colors duration-200"
                >
                  Wrong Network
                </button>
              )}
              <button
                onClick={openAccountModal}
                className="bg-white w-48 h-11 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium text-sm rounded-lg transition-colors duration-200"
              >
                {account.displayName}
              </button>
            </div>
          );
        }}
      </ConnectButton.Custom>

      {error && (
        <div className="mt-2 text-xs text-red-500 max-w-xs text-center">
          {error.message}
        </div>
      )}
    </div>
  );
}
