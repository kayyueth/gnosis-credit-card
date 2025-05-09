"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { useAave } from "@/hooks/useAave";
import { toast } from "react-hot-toast";
import { Toaster } from "react-hot-toast";

interface DepositFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function DepositForm({ onSuccess, onError }: DepositFormProps) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<"ETH" | "wstETH">("ETH");
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { deposit, isInitialized } = useAave();

  const handleDeposit = async () => {
    if (!amount || !address || !walletClient || !isInitialized) return;

    try {
      setIsLoading(true);
      const txs = await deposit(amount, selectedAsset, walletClient);

      // Handle multiple transactions if needed
      for (const tx of txs) {
        const txResponse = await tx.tx();
        console.log("Transaction sent:", txResponse);
      }

      toast.success(
        `Successfully deposited ${amount} ${selectedAsset} to Aave`
      );

      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      setAmount("");
    } catch (error) {
      console.error("Deposit failed:", error);
      toast.error("Failed to deposit. Please try again.");

      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">Deposit Collateral</h2>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedAsset("ETH")}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                selectedAsset === "ETH"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              ETH
            </button>
            <button
              onClick={() => setSelectedAsset("wstETH")}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                selectedAsset === "wstETH"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              wstETH
            </button>
          </div>

          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
              {selectedAsset}
            </span>
          </div>

          <button
            onClick={handleDeposit}
            disabled={!amount || isLoading || !address || !isInitialized}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              !amount || isLoading || !address || !isInitialized
                ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isLoading ? "Processing..." : "Deposit"}
          </button>

          {!address && (
            <p className="text-sm text-red-500 text-center">
              Please connect your wallet first
            </p>
          )}
        </div>
      </div>
    </>
  );
}
