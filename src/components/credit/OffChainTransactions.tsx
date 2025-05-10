"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useOffChainSpending } from "@/hooks/useOffChainSpending";
import { useGnosisCreditCard } from "@/hooks/useGnosisCreditCard";
import {
  Loader2,
  Clock,
  Check,
  AlertCircle,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import toast from "react-hot-toast";

interface OffChainTransactionsProps {
  className?: string;
}

export function OffChainTransactions({ className }: OffChainTransactionsProps) {
  const { address } = useAccount();
  const {
    outstandingTransactions,
    totalOutstanding,
    clearMonthlyBalance,
    isLoading,
    hasReminder,
    reminderMessage,
    refetch: refetchOffChainSpending,
  } = useOffChainSpending();
  const { userCredit, refetch: refetchCredit } = useGnosisCreditCard();
  const [clearInProgress, setClearInProgress] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchOffChainSpending(), refetchCredit()]);
      toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle payment clearing
  const handleClearBalance = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setClearInProgress(true);
    try {
      const success = await clearMonthlyBalance();
      if (success) {
        // Refresh credit data after successful balance clearing
        await refetchCredit();
        toast.success("Balance cleared and credit updated");
      }
    } catch (error) {
      console.error("Error clearing balance:", error);
      toast.error("Failed to clear balance");
    } finally {
      setClearInProgress(false);
    }
  };

  // Format date as Month Day, Year
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            <CardTitle>Off-Chain Transactions</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <CardDescription>
          Purchases made with your Gnosis Card without on-chain transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Monthly Reminder Alert */}
        {hasReminder && reminderMessage && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Monthly Payment Reminder</AlertTitle>
            <AlertDescription>{reminderMessage}</AlertDescription>
          </Alert>
        )}

        {/* Off-Chain Spending Overview */}
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Outstanding Balance
              </div>
              <div className="font-semibold text-lg">
                {totalOutstanding.toFixed(2)}{" "}
                {outstandingTransactions.length > 0
                  ? outstandingTransactions[0].currency
                  : "USDC"}
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <span>Loading transactions...</span>
          </div>
        ) : outstandingTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No outstanding off-chain transactions.</p>
          </div>
        ) : (
          <Table>
            <TableCaption>
              Your outstanding off-chain transactions.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outstandingTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">
                    {formatDate(tx.timestamp)}
                  </TableCell>
                  <TableCell>{tx.merchant}</TableCell>
                  <TableCell>{tx.category}</TableCell>
                  <TableCell className="text-right">
                    {parseFloat(tx.amount).toFixed(2)} {tx.currency}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Footer with payment button */}
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-sm text-gray-500 flex items-center">
          <Clock className="mr-1 h-4 w-4" />
          Clear by the end of the month to earn rewards
        </div>
        <Button
          variant="default"
          onClick={handleClearBalance}
          disabled={
            isLoading || clearInProgress || outstandingTransactions.length === 0
          }
        >
          {clearInProgress ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Clear Balance
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
