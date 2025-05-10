"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useGnosisCreditCard } from "@/hooks/useGnosisCreditCard";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  usePublicClient,
} from "wagmi";
import toast from "react-hot-toast";
import { CHAIN_CONFIGS } from "@/config/chain";

// Default to Gnosis Chiado testnet
const DEFAULT_CHAIN_ID = 10200;
const { lendingPoolAddress, stablecoinAddresses, gnosisCreditCardAddress } =
  CHAIN_CONFIGS[DEFAULT_CHAIN_ID];

export function CreditDeclarationPanel() {
  const { userCredit, availableCredit, refetch, shouldRedeclare, usdcDebt } =
    useGnosisCreditCard();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [isDeclaringCredit, setIsDeclaringCredit] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transactionPending, setTransactionPending] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const processedTxHash = useRef<string | null>(null);

  // Contract write function to declare credit
  const {
    writeContract,
    isPending,
    isSuccess,
    error,
    data: txHash,
  } = useWriteContract();

  // Direct contract read to debug
  const { data: directUserCredit, refetch: directRefetch } = useReadContract({
    address: gnosisCreditCardAddress as `0x${string}`,
    abi: [
      {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "userCredits",
        outputs: [
          { internalType: "uint256", name: "creditSnapshot", type: "uint256" },
          { internalType: "uint256", name: "creditSpent", type: "uint256" },
          { internalType: "uint256", name: "lastUpdated", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "userCredits",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
    },
  });

  const handleCreditDeclaration = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsDeclaringCredit(true);
      setTransactionPending(false);
      setRetryCount(0);
      processedTxHash.current = null;

      // Fetch and log current borrowing data for debugging
      console.log("Refreshing credit with latest borrow data...");

      // Call the contract to declare credit snapshot
      writeContract({
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
          stablecoinAddresses.USDC as `0x${string}`,
        ],
      });

      toast.success("Credit declaration submitted");
    } catch (error) {
      console.error("Error declaring credit:", error);
      toast.error("Failed to declare credit. Please try again.");
    } finally {
      setIsDeclaringCredit(false);
    }
  };

  // Manual refresh function to update credit information
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      console.log("Manual refresh triggered");

      // If transaction is successful, immediately show the credit status
      if (isSuccess) {
        console.log("Transaction already successful, showing credit status");
        setTransactionPending(false);
      }

      // Perform all data refreshes in parallel
      await Promise.all([
        refetch(),
        directRefetch(),
        // Add a small delay to ensure blockchain state is updated
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);

      toast.success("Credit information refreshed successfully");
    } catch (error) {
      console.error("Error refreshing credit info:", error);
      toast.error("Failed to refresh. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to check transaction receipt directly
  const checkTransactionReceipt = async (hash: `0x${string}`) => {
    if (!hash || !publicClient) return null;

    try {
      console.log("Checking transaction receipt for:", hash);
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash });
        console.log("Transaction receipt:", receipt);
        return receipt;
      } catch (error: any) {
        // Handle the "receipt not found" error gracefully
        if (error.name === "TransactionReceiptNotFoundError") {
          console.log(
            "Transaction receipt not found yet, but transaction exists"
          );
          // Check if the transaction exists at least
          const tx = await publicClient.getTransaction({ hash });
          console.log("Transaction exists:", !!tx);
          return { status: "pending", exists: !!tx };
        }
        throw error; // Re-throw other errors
      }
    } catch (error) {
      console.error("Error getting transaction receipt:", error);
      return null;
    }
  };

  // Effect to handle transaction success
  useEffect(() => {
    if (isSuccess && txHash && processedTxHash.current !== txHash) {
      processedTxHash.current = txHash as string;
      toast.success("Credit declaration successful!");
      console.log("Transaction success detected, txHash:", txHash);

      // Immediately show the credit status screen without waiting for data
      setTransactionPending(false);

      // Trigger a background refetch with a delay to ensure blockchain state is updated
      setTimeout(() => {
        console.log("Running background data refresh");
        handleRefresh();
      }, 2000);
    }
  }, [isSuccess, txHash]);

  // Log whenever directUserCredit or userCredit changes
  useEffect(() => {
    if (directUserCredit) {
      console.log("Direct user credit updated:", directUserCredit);
    }
  }, [directUserCredit]);

  useEffect(() => {
    if (userCredit) {
      console.log("Hook user credit updated:", userCredit);
    }
  }, [userCredit]);

  // If there's no credit declared yet AND no successful transaction OR transaction is explicitly pending
  if (
    (!isSuccess && (!userCredit || Number(userCredit.creditSnapshot) === 0)) ||
    (transactionPending && !isSuccess)
  ) {
    return (
      <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">
            {transactionPending
              ? "Processing Credit Declaration..."
              : "Activate Your Credit Card"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactionPending ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Your transaction was successful, but the credit information is
                still being processed. This might take a few moments to appear
                on the blockchain.
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-900">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Transaction hash:
                  <a
                    href={`https://blockscout.chiadochain.net/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline ml-1"
                  >
                    {txHash ? "View transaction" : "Pending..."}
                  </a>
                </div>
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Credit Information
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Before you can start spending, you need to declare your credit
                limit. This will calculate your available credit based on your
                borrowed stablecoins from Aave.
              </div>

              <Button
                className="w-full"
                onClick={handleCreditDeclaration}
                disabled={isPending || isDeclaringCredit}
                title="This will snapshot your borrowed amount as your credit limit"
              >
                {(isPending || isDeclaringCredit) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Declare Credit
              </Button>

              {isSuccess && (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-900">
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Transaction successful!
                    <a
                      href={`https://blockscout.chiadochain.net/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline ml-1"
                    >
                      View on explorer
                    </a>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}

              {error && (
                <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-900">
                  Error: {error?.message || "Something went wrong"}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // If credit is already declared
  return (
    <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Credit Status</CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh credit information"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Declared Credit
            </div>
            <div className="font-semibold text-lg">
              {Number(userCredit?.creditSnapshot || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Available Credit
            </div>
            <div className="font-semibold text-lg">
              {Number(availableCredit).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Credit Used
          </div>
          <div className="font-semibold text-lg">
            {Number(userCredit?.creditSpent || 0).toFixed(2)}
          </div>
        </div>

        {shouldRedeclare && (
          <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Credit Update Needed
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Your current debt ({Number(usdcDebt).toFixed(2)} USDC) exceeds
                  your declared credit limit (
                  {Number(userCredit?.creditSnapshot || 0).toFixed(2)} USDC).
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {shouldRedeclare
              ? "Update your credit limit to match your current borrowing:"
              : "Have you borrowed more funds? Update your credit limit here:"}
          </div>
          <Button
            className="w-full"
            variant={shouldRedeclare ? "default" : "outline"}
            onClick={handleCreditDeclaration}
            disabled={isPending || isDeclaringCredit}
          >
            {(isPending || isDeclaringCredit) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {shouldRedeclare ? "Update Credit Limit" : "Re-Declare Credit"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
