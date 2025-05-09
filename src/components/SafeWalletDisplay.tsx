"use client";

import { useState } from "react";
import { useBalance } from "wagmi";
import { useMounted } from "@/hooks/useMounted";

interface SafeWalletDisplayProps {
  defaultSafeAddress?: string;
}

export function SafeWalletDisplay({
  defaultSafeAddress = "0x2dC3fB1f38b0E88a98929F256b0967175eAE9e56",
}: SafeWalletDisplayProps) {
  const mounted = useMounted();
  const [isCopied, setIsCopied] = useState(false);

  const { data: balance } = useBalance({
    address: defaultSafeAddress as `0x${string}`,
  });

  const formatAddress = (address: string) => {
    return `${address.substring(0, 8)}...${address.substring(
      address.length - 6
    )}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(defaultSafeAddress);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address", err);
    }
  };

  if (!mounted) return null;

  return (
    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatAddress(defaultSafeAddress)}
        </span>
        <button
          onClick={copyToClipboard}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {isCopied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="mt-3 flex justify-between items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Balance:{" "}
          {balance
            ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}`
            : "Loading..."}
        </span>
        <a
          href={`https://app.safe.global/transactions/queue?safe=eth:${defaultSafeAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View on Safe
        </a>
      </div>
    </div>
  );
}
