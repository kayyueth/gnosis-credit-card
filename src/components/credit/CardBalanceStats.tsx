"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ArrowUp,
  ArrowDown,
  CreditCard,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useSafeTransactions } from "@/hooks/useSafeTransactions";
import { useLending } from "@/hooks/useLending";
import { useSafeStore } from "@/store/useSafeStore";
import { useGnosisCreditCard } from "@/hooks/useGnosisCreditCard";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

type CurrencyType = "USDC" | "EURe";

interface CardBalanceStatsProps {
  className?: string;
  currency?: CurrencyType;
}

export function CardBalanceStats({
  className,
  currency = "USDC",
}: CardBalanceStatsProps) {
  const { safeAddress } = useSafeStore();
  const { userCredit, refetch: refetchCredit } = useGnosisCreditCard();
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalDeposited: 0,
    avgTransactionSize: 0,
    transactionCount: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { transactions, refreshTransactions } = useSafeTransactions({
    safeAddress,
  });
  const lendingState = useLending();

  // Exchange rate for conversion between USD and EUR (simplified fixed rate for demo)
  const eurToUsdRate = 1.08;

  // Get the currency symbol
  const getCurrencySymbol = (currencyType: CurrencyType) => {
    return currencyType === "USDC" ? "$" : "€";
  };

  // Convert USD to EUR if needed
  const getConvertedValue = (usdValue: number) => {
    if (currency === "USDC") return usdValue;
    return usdValue / eurToUsdRate;
  };

  // Extract stable values from userCredit to avoid recalculations
  const creditSpent = useMemo(() => {
    const onChainSpent = userCredit?.creditSpent
      ? parseFloat(userCredit.creditSpent)
      : 0;
    const offChainSpent = userCredit?.offChainSpending
      ? parseFloat(userCredit.offChainSpending)
      : 0;
    return onChainSpent + offChainSpent;
  }, [userCredit?.creditSpent, userCredit?.offChainSpending]);

  const creditSnapshot = useMemo(() => {
    return userCredit?.creditSnapshot
      ? parseFloat(userCredit.creditSnapshot)
      : 0;
  }, [userCredit?.creditSnapshot]);

  const depositedAmount = useMemo(() => {
    return lendingState?.state?.depositedAmount
      ? Number(lendingState.state.depositedAmount)
      : 0;
  }, [lendingState?.state?.depositedAmount]);

  // Calculate real statistics from transaction data
  useEffect(() => {
    if (safeAddress) {
      // Use the memoized value
      const spent = creditSpent;

      // Calculate deposit amount
      let deposited = 0;
      let depositTxCount = 0;
      const spendingTxCount = creditSpent > 0 ? 1 : 0;

      // Add known deposit amount from lending state (use memoized value)
      if (depositedAmount > 0) {
        deposited += depositedAmount;
        depositTxCount++;
      }

      // Add deposits from transactions
      transactions.forEach((tx) => {
        if (tx.type === "incoming" && tx.tokenSymbol !== "GNO") {
          // Incoming non-reward transactions are deposits
          deposited += Number(tx.formattedValue);
          depositTxCount++;
        }
      });

      // Calculate average transaction size (if we have any transactions)
      const totalTxCount = spendingTxCount + depositTxCount;
      const totalValue = spent + deposited;
      const avgTxSize = totalTxCount > 0 ? totalValue / totalTxCount : 0;

      const newStats = {
        totalSpent: spent,
        totalDeposited: deposited,
        avgTransactionSize: avgTxSize,
        transactionCount: totalTxCount,
      };

      setStats(newStats);
    }
  }, [safeAddress, transactions, depositedAmount, creditSpent]);

  // Memoize converted values to prevent recalculation on every render
  const symbol = getCurrencySymbol(currency);
  const convertedValues = useMemo(() => {
    return {
      totalSpent: getConvertedValue(stats.totalSpent),
      totalDeposited: getConvertedValue(stats.totalDeposited),
      avgTxSize: getConvertedValue(stats.avgTransactionSize),
      availableBalance: getConvertedValue(
        creditSnapshot > 0
          ? creditSnapshot - creditSpent
          : stats.totalDeposited - stats.totalSpent
      ),
    };
  }, [stats, currency, creditSnapshot, creditSpent, getConvertedValue]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchCredit(), refreshTransactions()]);
      toast.success("Stats refreshed successfully");
    } catch (error) {
      console.error("Error refreshing stats:", error);
      toast.error("Failed to refresh stats");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Balance Overview
        </h3>
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
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          title="Total Spent"
          value={`${symbol}${convertedValues.totalSpent.toLocaleString(
            undefined,
            {
              maximumFractionDigits: 2,
            }
          )}`}
          icon={<ArrowUp className="h-4 w-4 text-red-500" />}
          trend={`${
            stats.transactionCount > 0 ? stats.transactionCount : "No"
          } transactions`}
          trendUp={false}
        />

        <StatCard
          title="Total Deposited"
          value={`${symbol}${convertedValues.totalDeposited.toLocaleString(
            undefined,
            {
              maximumFractionDigits: 2,
            }
          )}`}
          icon={<ArrowDown className="h-4 w-4 text-green-500" />}
          trend="Available for spending"
          trendUp={true}
        />

        <StatCard
          title="Avg. Transaction"
          value={`${symbol}${convertedValues.avgTxSize.toLocaleString(
            undefined,
            {
              maximumFractionDigits: 2,
            }
          )}`}
          icon={<CreditCard className="h-4 w-4 text-blue-500" />}
          trend={`${
            stats.transactionCount > 0 ? stats.transactionCount : "No"
          } transactions`}
        />

        <StatCard
          title="Available Balance"
          value={`${symbol}${convertedValues.availableBalance.toLocaleString(
            undefined,
            {
              maximumFractionDigits: 2,
            }
          )}`}
          icon={<Wallet className="h-4 w-4 text-purple-500" />}
          trend="Ready to spend"
        />
      </div>
    </div>
  );
}
