"use client";

import { useState } from "react";
import { useBalance } from "wagmi";
import { useMounted } from "@/hooks/useMounted";
import { SafeTransactionHistory } from "@/components/SafeTransactionHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCopy, ExternalLink } from "lucide-react";
import { useSafeStore } from "@/store/useSafeStore";
import SafeAuthConnect from "@/components/SafeAuthConnect";

export function SafeWalletDisplay() {
  const mounted = useMounted();
  const [isCopied, setIsCopied] = useState(false);
  const [showTransactions, setShowTransactions] = useState(true);
  const { safeAddress } = useSafeStore();

  const { data: balance } = useBalance({
    address: safeAddress ? (safeAddress as `0x${string}`) : undefined,
  });

  const formatAddress = (address: string) => {
    if (!address) return "Connect your Safe wallet";
    return `${address.substring(0, 8)}...${address.substring(
      address.length - 6
    )}`;
  };

  const copyToClipboard = async () => {
    if (!safeAddress) return;

    try {
      await navigator.clipboard.writeText(safeAddress);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address", err);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Gnosis Pay Credit Card</CardTitle>
        </CardHeader>
        <CardContent>
          {!safeAddress ? (
            <div className="py-4">
              <p className="text-center text-gray-500 dark:text-gray-400 mb-4">
                Connect your Safe wallet to manage your credit card
              </p>
              <SafeAuthConnect />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm">
                    {formatAddress(safeAddress)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={copyToClipboard}
                    title="Copy address"
                  >
                    <ClipboardCopy className="h-4 w-4" />
                    <span className="sr-only">Copy address</span>
                  </Button>
                  {isCopied && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      Copied!
                    </span>
                  )}
                </div>
                <a
                  href={`https://app.safe.global/transactions/history?safe=gno:${safeAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>View on Safe</span>
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowTransactions(!showTransactions)}
                >
                  {showTransactions
                    ? "Hide Transaction History"
                    : "Show Transaction History"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {showTransactions && safeAddress && <SafeTransactionHistory />}
    </div>
  );
}
