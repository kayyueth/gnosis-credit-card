"use client";

import { useState } from "react";
import { WalletConnect } from "@/components/WalletConnect";
import { SafeWalletDisplay } from "@/components/SafeWalletDisplay";
import { WalletDebug } from "@/components/WalletDebug";

export function WalletContainer() {
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="flex flex-col w-full gap-8">
      <div className="flex flex-col gap-2">
        <WalletConnect />
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mt-1 transition-colors"
        >
          {showDebug ? "Hide Debug Info" : "Show Debug Info"}
        </button>
        {showDebug && <WalletDebug />}
      </div>

      <div className="flex flex-col gap-2">
        <SafeWalletDisplay />
      </div>
    </div>
  );
}
