"use client";

import { useState, useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { useAave } from "@/hooks/useAave";
import { toast } from "react-hot-toast";
import { Toaster } from "react-hot-toast";

export function DepositPortal() {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<"ETH" | "wstETH">(
    "wstETH"
  );
  const [selectedBorrowAsset, setSelectedBorrowAsset] = useState<
    "USDC" | "EURe"
  >("EURe");
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { deposit, borrow, mintTokens, isInitialized, error } = useAave();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleMintTokens = async () => {
    if (!walletClient || !isInitialized) return;

    try {
      setIsLoading(true);
      await mintTokens(walletClient);
      toast.success("Successfully minted test tokens");
    } catch (error) {
      console.error("Minting failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to mint tokens. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!amount || !address || !walletClient || !isInitialized) return;

    try {
      setIsLoading(true);
      await deposit(amount, selectedAsset, walletClient);

      toast.success(
        `Successfully deposited ${amount} ${selectedAsset} to lending pool`
      );

      // Automatically borrow after successful deposit
      try {
        await borrow(amount, selectedBorrowAsset, walletClient);
        toast.success(
          `Successfully borrowed ${amount} ${selectedBorrowAsset} from lending pool`
        );
      } catch (borrowError) {
        console.error("Borrow failed:", borrowError);
        toast.error(
          borrowError instanceof Error
            ? borrowError.message
            : "Failed to borrow. Please try again."
        );
      }

      // Reset form
      setAmount("");
    } catch (error) {
      console.error("Deposit failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to deposit. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4">Test Token Minting</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button
            onClick={handleMintTokens}
            disabled={isLoading || !address || !isInitialized}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isLoading || !address || !isInitialized
                ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isLoading ? "Processing..." : "Mint Test Tokens"}
          </button>

          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

          <h2 className="text-xl font-semibold">Deposit & Borrow</h2>
          <div className="flex gap-2">
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

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedBorrowAsset("USDC")}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                selectedBorrowAsset === "USDC"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              USDC
            </button>
            <button
              onClick={() => setSelectedBorrowAsset("EURe")}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                selectedBorrowAsset === "EURe"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              EURe
            </button>
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
            {isLoading ? "Processing..." : "Deposit & Borrow"}
          </button>

          {isClient && !address && (
            <p className="text-sm text-red-500 text-center">
              Please connect your wallet first
            </p>
          )}
        </div>
      </div>
    </>
  );
}
