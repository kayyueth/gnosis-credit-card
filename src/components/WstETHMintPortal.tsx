"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { toast } from "react-hot-toast";
import { TransactionStatus } from "@/components/TransactionStatus";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowDownIcon, SparklesIcon } from "lucide-react";

// Mock wstETH token address
const WSTETH_ADDRESS = "0x9fa52f7c3a19a066a9b7f2EBCA4BC6340366518F";

export function WstETHMintPortal() {
  const [amount, setAmount] = useState("");
  const [mintStatus, setMintStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const processedTxHash = useRef<string | null>(null);

  const { address } = useAccount();

  const {
    writeContract,
    isPending,
    isSuccess,
    error,
    data: txHash,
  } = useWriteContract();

  // Effect to handle transaction success
  useEffect(() => {
    if (isSuccess && txHash && processedTxHash.current !== txHash) {
      processedTxHash.current = txHash as string;
      setMintStatus("success");
      toast.success(`Successfully minted ${amount} wstETH`);
      setAmount("");
    }
  }, [isSuccess, txHash, amount]);

  // Effect to handle transaction error
  useEffect(() => {
    if (error && mintStatus === "loading") {
      setMintStatus("error");
      toast.error(error.message || "Failed to mint wstETH. Please try again.");
    }
  }, [error, mintStatus]);

  const handleMint = async () => {
    if (!amount || !address) return;

    try {
      setMintStatus("loading");
      processedTxHash.current = null;

      // Call the contract to mint wstETH
      writeContract({
        address: WSTETH_ADDRESS as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "to", type: "address" },
              { internalType: "uint256", name: "amount", type: "uint256" },
            ],
            name: "mint",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "mint",
        args: [address, parseEther(amount)],
      });
    } catch (error) {
      console.error("Mint failed:", error);
      setMintStatus("error");
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to mint wstETH. Please try again."
      );
    }
  };

  return (
    <Card className="w-full overflow-hidden border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 h-full min-h-[420px] flex flex-col">
      <CardHeader className="pb-3 relative">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <SparklesIcon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white">
              Mint wstETH
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Generate test tokens for your wallet
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-5">
          <div className="space-y-2.5">
            <Label
              htmlFor="mint-amount"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Amount to Mint
            </Label>
            <div className="relative">
              <Input
                id="mint-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="pr-16 h-12 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                  wstETH
                </span>
              </div>
            </div>
          </div>

          <div className="relative py-2 flex items-center justify-center">
            <div className="absolute left-0 right-0 border-t border-gray-200 dark:border-gray-700"></div>
            <div className="relative z-10 bg-blue-100 dark:bg-blue-800 rounded-full p-1">
              <ArrowDownIcon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            </div>
          </div>

          <Button
            onClick={handleMint}
            disabled={
              !amount || mintStatus === "loading" || !address || isPending
            }
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg"
          >
            {mintStatus === "loading" || isPending
              ? "Minting..."
              : "Mint wstETH"}
          </Button>

          <TransactionStatus status={mintStatus} />

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md border border-gray-100 dark:border-gray-700">
            <div className="flex items-start space-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                This will mint test wstETH tokens to your wallet for testing
                purposes only.
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
