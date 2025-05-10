"use client";

import { useState } from "react";
import { useAccount, useWalletClient, useWriteContract } from "wagmi";
import { useAave } from "@/hooks/useAave";
import { useSafeStore } from "@/store/useSafeStore";
import { CHAIN_CONFIGS } from "@/config/chain";
import { toast } from "react-hot-toast";
import { TransactionStatus } from "@/components/TransactionStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowDownIcon, CreditCardIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGnosisCreditCard } from "@/hooks/useGnosisCreditCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// Default chain ID for Gnosis Chiado testnet
const DEFAULT_CHAIN_ID = 10200;
const { lendingPoolAddress, stablecoinAddresses, gnosisCreditCardAddress } =
  CHAIN_CONFIGS[DEFAULT_CHAIN_ID];

export function BorrowPortal() {
  const [amount, setAmount] = useState("");
  const [borrowStatus, setBorrowStatus] = useState<
    "idle" | "loading" | "borrowing" | "success" | "error"
  >("idle");
  const [selectedAsset, setSelectedAsset] = useState<"USDC" | "EURe">("EURe");
  const [statusMessage, setStatusMessage] = useState("");

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { borrow, isInitialized, error } = useAave({
    chainId: DEFAULT_CHAIN_ID,
  });
  const { refetch } = useGnosisCreditCard();

  // Contract write function to declare credit
  const { writeContract } = useWriteContract();

  // Function to automatically declare credit snapshot after borrowing
  const declareCredit = async () => {
    if (!address) return;

    try {
      // Call the contract to declare credit snapshot
      await writeContract({
        address: gnosisCreditCardAddress as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "pool", type: "address" },
              { internalType: "address", name: "stablecoin", type: "address" },
            ],
            name: "declareCreditSnapshot",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "declareCreditSnapshot",
        args: [
          lendingPoolAddress as `0x${string}`,
          selectedAsset === "USDC"
            ? (stablecoinAddresses.USDC as `0x${string}`)
            : (stablecoinAddresses.EURe as `0x${string}`),
        ],
      });

      // Refresh credit data
      refetch();
      toast.success("Credit updated automatically!");
    } catch (error) {
      console.error("Error updating credit:", error);
      // Don't show error to user - just log it
    }
  };

  const handleBorrow = async () => {
    if (!amount || !address || !walletClient || !isInitialized) return;

    try {
      // Borrow from Aave (funds are automatically sent to Safe)
      setBorrowStatus("borrowing");
      setStatusMessage(`Borrowing ${amount} ${selectedAsset}...`);
      await borrow(amount, selectedAsset, walletClient);

      // Success
      setBorrowStatus("success");
      toast.success(
        `Successfully borrowed ${amount} ${selectedAsset}. Funds are automatically sent to your Safe wallet.`
      );
      setStatusMessage("");
      setAmount("");

      // Automatically declare credit after successful borrow
      await declareCredit();
    } catch (error) {
      console.error("Transaction failed:", error);
      setBorrowStatus("error");

      let errorMessage = "Transaction failed. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setStatusMessage(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <Card className="w-full overflow-hidden border-0 shadow-md bg-gradient-to-br from-purple-50 to-violet-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 h-full min-h-[420px] flex flex-col">
      <CardHeader className="pb-3 relative">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
            <CreditCardIcon className="h-4 w-4 text-purple-600 dark:text-purple-300" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white">
              Borrow Funds
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Get instant liquidity against your collateral
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-5">
          {error && (
            <Alert
              variant="destructive"
              className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800"
            >
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-600 dark:text-red-400 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2.5">
            <Label
              htmlFor="amount"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Amount to Borrow
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="pr-16 h-12 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-600"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center bg-purple-50 dark:bg-purple-900/30 px-2.5 py-1 rounded-md">
                <span className="text-sm font-medium text-purple-600 dark:text-purple-300">
                  {selectedAsset}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Borrow Asset
            </Label>
            <Tabs
              defaultValue="EURe"
              value={selectedAsset}
              onValueChange={(value) =>
                setSelectedAsset(value as "USDC" | "EURe")
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 bg-purple-100/50 dark:bg-gray-800 p-1 h-12">
                <TabsTrigger
                  value="USDC"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 h-10"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-300 text-xs font-bold">
                      $
                    </div>
                    <span>USDC</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="EURe"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 h-10"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-300 text-xs font-bold">
                      €
                    </div>
                    <span>EURe</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="relative py-2 flex items-center justify-center">
            <div className="absolute left-0 right-0 border-t border-gray-200 dark:border-gray-700"></div>
            <div className="relative z-10 bg-purple-100 dark:bg-purple-800 rounded-full p-1">
              <ArrowDownIcon className="h-4 w-4 text-purple-600 dark:text-purple-300" />
            </div>
          </div>

          <Button
            onClick={handleBorrow}
            disabled={
              borrowStatus === "borrowing" ||
              !amount ||
              !address ||
              !isInitialized
            }
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium rounded-lg"
          >
            {borrowStatus === "borrowing"
              ? "Borrowing..."
              : `Borrow ${selectedAsset}`}
          </Button>

          <TransactionStatus status={borrowStatus} message={statusMessage} />

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md border border-gray-100 dark:border-gray-700">
            <div className="flex items-start space-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-500 dark:text-purple-400"
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
                Borrowed funds will be sent directly to your Safe wallet. Your
                credit score will be updated automatically.
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
