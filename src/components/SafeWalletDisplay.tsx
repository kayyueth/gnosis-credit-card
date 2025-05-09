"use client";

import { useState, useEffect } from "react";
import { useBalance } from "wagmi";

interface SafeWalletDisplayProps {
  defaultSafeAddress?: string;
}

export function SafeWalletDisplay({
  defaultSafeAddress = "0x2dC3fB1f38b0E88a98929F256b0967175eAE9e56",
}: SafeWalletDisplayProps) {
  const [mounted, setMounted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const { data: balance } = useBalance({
    address: defaultSafeAddress as `0x${string}`,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 text-green-600 dark:text-green-400"
          >
            <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3H15a.75.75 0 0 0-.75.75 2.25 2.25 0 0 1-4.5 0A.75.75 0 0 0 9 9H5.25Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Gnosis Pay Wallet
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Safe wallet address
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 flex items-center justify-between bg-gray-100 dark:bg-gray-900 rounded-lg px-3 py-2">
          <span className="font-mono text-xs text-gray-800 dark:text-gray-200">
            {formatAddress(defaultSafeAddress)}
          </span>
          <button
            onClick={copyToClipboard}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            {isCopied ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M10.5 3A1.501 1.501 0 0 0 9 4.5h6A1.5 1.5 0 0 0 13.5 3h-3Zm-2.693.178A3 3 0 0 1 10.5 1.5h3a3 3 0 0 1 2.694 1.678c.497.042.992.092 1.486.15 1.497.173 2.57 1.46 2.57 2.929V19.5a3 3 0 0 1-3 3H6.75a3 3 0 0 1-3-3V6.257c0-1.47 1.073-2.756 2.57-2.93.493-.057.989-.107 1.487-.15Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="mt-3 flex justify-between items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Balance: 1.25 ETH Balance:{" "}
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
