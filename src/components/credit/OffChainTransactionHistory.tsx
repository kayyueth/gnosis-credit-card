"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  Clock,
  ArrowDownUp,
  CreditCard,
  Receipt,
  ExternalLink,
  Gift,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getTransactionHistory,
  type OffChainTransactionHistory as OffChainTxHistory,
} from "@/lib/offChainSpendingService";
import { CHAIN_CONFIGS } from "@/config/chain";
import toast from "react-hot-toast";

// Default to Gnosis Chiado testnet
const DEFAULT_CHAIN_ID = 10200;
const EXPLORER_URL = "https://gnosis-chiado.blockscout.com/tx/";

interface OffChainTransactionHistoryProps {
  className?: string;
}

export function OffChainTransactionHistory({
  className,
}: OffChainTransactionHistoryProps) {
  const { address } = useAccount();
  const [transactions, setTransactions] = useState<OffChainTxHistory[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to load transaction history
  const loadTransactionHistory = () => {
    if (!address) return;
    const history = getTransactionHistory(address);
    setTransactions(history);
  };

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      loadTransactionHistory();
      toast.success("Transaction history refreshed successfully");
    } catch (error) {
      console.error("Error refreshing transaction history:", error);
      toast.error("Failed to refresh transaction history");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load transaction history when user connects
  useEffect(() => {
    if (!address) return;

    // Load immediately
    loadTransactionHistory();

    // Set up interval to refresh history
    const intervalId = setInterval(loadTransactionHistory, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, [address]);

  // Filter transactions by type
  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "all") return true;
    return tx.type === filter;
  });

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Get type badge
  const getTypeBadge = (type: string, currency: string) => {
    if (currency === "GNO") {
      return (
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-700 border-purple-200"
        >
          <Gift className="h-3 w-3 mr-1" />
          Reward
        </Badge>
      );
    }
    if (type === "spend") {
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          <CreditCard className="h-3 w-3 mr-1" />
          Spend
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200"
        >
          <Receipt className="h-3 w-3 mr-1" />
          Clearance
        </Badge>
      );
    }
  };

  // Format transaction hash as a link
  const formatTxHash = (hash?: string) => {
    if (!hash) return null;

    return (
      <a
        href={`${EXPLORER_URL}${hash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors mt-1"
      >
        <ExternalLink className="h-3 w-3 mr-1" />
        View on Explorer
      </a>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <ArrowDownUp className="mr-2 h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>All off-chain card activities</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
            <span className="text-sm text-gray-500">Filter:</span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="spend">Spending Only</SelectItem>
                <SelectItem value="clearance">Clearance Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>No transaction history yet.</p>
            <p className="text-sm">
              Your off-chain spending and clearance actions will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableCaption>
              Your transaction history for off-chain activities
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">
                    {formatDate(tx.timestamp)}
                  </TableCell>
                  <TableCell>{getTypeBadge(tx.type, tx.currency)}</TableCell>
                  <TableCell>
                    {tx.type === "spend" ? (
                      <div>
                        <div className="font-medium">
                          {tx.merchant || "Off-chain purchase"}
                        </div>
                        {tx.category && (
                          <div className="text-xs text-gray-500">
                            {tx.category}
                          </div>
                        )}
                        {tx.description && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {tx.description}
                          </div>
                        )}
                        {formatTxHash(tx.txHash)}
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm">
                          {tx.description || "Balance clearance"}
                        </div>
                        {tx.category && (
                          <div className="text-xs text-gray-500">
                            {tx.category}
                          </div>
                        )}
                        {formatTxHash(tx.txHash)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        tx.type === "spend"
                          ? "text-red-600"
                          : tx.currency === "GNO"
                          ? "text-purple-600"
                          : "text-green-600"
                      }
                    >
                      {tx.type === "spend" ? "-" : "+"}
                      {parseFloat(tx.amount).toFixed(2)} {tx.currency}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
