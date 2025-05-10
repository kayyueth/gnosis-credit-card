"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useMounted } from "@/hooks/useMounted";

export function WalletConnect() {
  const mounted = useMounted();

  return (
    <div className="flex items-center justify-center">
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

          return (
            <div className="flex flex-col gap-2">
              <button
                onClick={openAccountModal}
                className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium px-6 py-3 rounded-full transition-colors duration-200"
              >
                {account.displayName}
              </button>
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
