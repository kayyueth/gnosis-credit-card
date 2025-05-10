"use client";

import { useState } from "react";
import { useSafeTransactions } from "@/hooks/useSafeTransactions";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  Info,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useSafeStore } from "@/store/useSafeStore";

interface SafeTransactionHistoryProps {
  className?: string;
}

interface Transaction {
  id: string;
  type: "incoming" | "outgoing";
  action?: string;
  formattedValue: string;
  tokenSymbol: string;
  source: "safe" | "wallet";
  timestamp: number;
  from: string;
  to: string;
}

export function SafeTransactionHistory({
  className,
}: SafeTransactionHistoryProps) {
  const { safeAddress } = useSafeStore();
  const { transactions, isLoading, error, refreshTransactions, walletAddress } =
    useSafeTransactions({
      safeAddress,
    });
  console.log("All transactions", transactions);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "safe" | "wallet">("all");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshTransactions();
    setTimeout(() => setIsRefreshing(false), 1000); // Minimum loading indicator time
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Filter transactions based on selected filter
  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "all") return true;
    return tx.source === filter;
  });

  // Get the first 3 and remaining transactions
  const recentTransactions = filteredTransactions.slice(0, 3);
  const olderTransactions = filteredTransactions.slice(3);

  // Create a transaction item component to reduce duplication
  const TransactionItem = ({ tx }: { tx: Transaction }) => (
    <div
      key={tx.id}
      className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 flex items-center"
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3",
          tx.type === "incoming"
            ? "bg-green-100 dark:bg-green-900/20"
            : "bg-red-100 dark:bg-red-900/20"
        )}
      >
        {tx.type === "incoming" ? (
          <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
        )}
      </div>

      <div className="flex-grow truncate mr-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <p className="font-medium">
              {tx.action || (tx.type === "incoming" ? "Received" : "Sent")}{" "}
              <span className="font-semibold">{tx.formattedValue}</span>{" "}
              {tx.tokenSymbol}
            </p>
            <Badge
              variant={tx.source === "safe" ? "outline" : "secondary"}
              className="font-normal text-xs"
            >
              {tx.source === "safe" ? (
                <>
                  <ShieldCheck className="h-3 w-3 mr-1" /> Safe
                </>
              ) : (
                <>
                  <Wallet className="h-3 w-3 mr-1" /> Wallet
                </>
              )}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(tx.timestamp)}
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {tx.type === "incoming"
            ? `From: ${formatAddress(tx.from)}`
            : `To: ${formatAddress(tx.to)}`}
        </p>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6",
        className
      )}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Transaction History</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
        >
          {isLoading || isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {walletAddress && (
        <div className="flex space-x-2 mb-4">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "safe" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("safe")}
            className="flex items-center gap-1"
          >
            <ShieldCheck className="h-4 w-4" /> Safe
          </Button>
          <Button
            variant={filter === "wallet" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("wallet")}
            className="flex items-center gap-1"
          >
            <Wallet className="h-4 w-4" /> Wallet
          </Button>
        </div>
      )}

      {error && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {isLoading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p>Loading transactions...</p>
            </div>
          ) : (
            <p>
              {transactions.length === 0
                ? "No transactions found"
                : `No ${filter} transactions found`}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Display the recent transactions */}
          {recentTransactions.map((tx) => (
            <TransactionItem key={tx.id} tx={tx} />
          ))}

          {/* If there are older transactions, show them in an accordion */}
          {olderTransactions.length > 0 && (
            <Accordion type="single" collapsible className="border-none">
              <AccordionItem value="older-transactions" className="border-none">
                <AccordionTrigger className="py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:no-underline">
                  <span>View {olderTransactions.length} more transactions</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {olderTransactions.map((tx) => (
                      <TransactionItem key={tx.id} tx={tx} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      )}
    </div>
  );
}
