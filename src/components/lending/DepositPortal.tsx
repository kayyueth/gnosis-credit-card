"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { useAave } from "@/hooks/useAave";
import { toast } from "react-hot-toast";
import { TransactionStatus } from "@/components/TransactionStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowDownIcon, WalletIcon } from "lucide-react";
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

export function DepositPortal() {
  const [amount, setAmount] = useState("");
  const [depositStatus, setDepositStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { deposit, isInitialized, error } = useAave();

  const handleDeposit = async () => {
    if (!amount || !address || !walletClient || !isInitialized) return;

    try {
      setDepositStatus("loading");
      await deposit(amount, "wstETH", walletClient);
      setDepositStatus("success");
      toast.success(`Successfully deposited ${amount} wstETH`);
      setAmount("");
    } catch (error) {
      console.error("Deposit failed:", error);
      setDepositStatus("error");
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to deposit. Please try again."
      );
    }
  };

  return (
    <Card className="w-full overflow-hidden border-0 shadow-md bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 h-full min-h-[420px] flex flex-col">
      <CardHeader className="pb-3 relative">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
            <WalletIcon className="h-4 w-4 text-green-600 dark:text-green-300" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-white">
              Deposit Collateral
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Supply wstETH to enable borrowing
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
              Amount to Deposit
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="pr-16 h-12 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-md">
                <span className="text-sm font-medium text-green-600 dark:text-green-300">
                  wstETH
                </span>
              </div>
            </div>
          </div>

          <div className="relative py-2 flex items-center justify-center">
            <div className="absolute left-0 right-0 border-t border-gray-200 dark:border-gray-700"></div>
            <div className="relative z-10 bg-green-100 dark:bg-green-800 rounded-full p-1">
              <ArrowDownIcon className="h-4 w-4 text-green-600 dark:text-green-300" />
            </div>
          </div>

          <Button
            onClick={handleDeposit}
            disabled={
              !amount ||
              depositStatus === "loading" ||
              !address ||
              !isInitialized
            }
            className="w-full h-12 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-medium rounded-lg"
          >
            {depositStatus === "loading" ? "Processing..." : "Deposit wstETH"}
          </Button>

          <TransactionStatus status={depositStatus} />

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md border border-gray-100 dark:border-gray-700">
            <div className="flex items-start space-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500 dark:text-green-400"
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
                Depositing collateral will enable you to borrow stablecoins
                against your wstETH.
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
