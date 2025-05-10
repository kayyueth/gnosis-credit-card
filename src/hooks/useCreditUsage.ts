import { useState, useEffect } from "react";
import { useSafeTransactions } from "@/hooks/useSafeTransactions";
import { useSafeStore } from "@/store/useSafeStore";

interface CreditUsageStats {
  totalSpent: number;
  totalDeposited: number;
  avgTransactionSize: number;
  transactionCount: number;
  recentTransactions: any[];
  isLoading: boolean;
}

export function useCreditUsage() {
  const { safeAddress } = useSafeStore();
  const [stats, setStats] = useState<CreditUsageStats>({
    totalSpent: 0,
    totalDeposited: 0,
    avgTransactionSize: 0,
    transactionCount: 0,
    recentTransactions: [],
    isLoading: true,
  });

  const { transactions, isLoading, error, refreshTransactions } =
    useSafeTransactions({
      safeAddress,
      skipInitialFetch: false,
    });

  // Calculate credit usage stats from real transaction data
  useEffect(() => {
    if (safeAddress && transactions.length > 0) {
      // Filter for spending transactions (outgoing stablecoin transactions)
      const spendingTransactions = transactions.filter(
        (tx) =>
          tx.type === "outgoing" &&
          ["USDC", "EURe", "xDAI"].includes(tx.tokenSymbol) &&
          tx.action !== "Approval" &&
          tx.action !== "Deposit" &&
          !tx.action?.includes("Transfer")
      );

      // Filter for deposit transactions (incoming non-reward transactions)
      const depositTransactions = transactions.filter(
        (tx) =>
          tx.type === "incoming" &&
          tx.tokenSymbol !== "GNO" &&
          !tx.action?.includes("Transfer")
      );

      // Calculate total spent
      const totalSpent = spendingTransactions.reduce(
        (sum, tx) => sum + Number(tx.formattedValue),
        0
      );

      // Calculate total deposited
      const totalDeposited = depositTransactions.reduce(
        (sum, tx) => sum + Number(tx.formattedValue),
        0
      );

      // Calculate transaction counts
      const spendingTxCount = spendingTransactions.length;
      const depositTxCount = depositTransactions.length;
      const totalTxCount = spendingTxCount + depositTxCount;

      // Calculate average transaction size
      const avgTxSize =
        totalTxCount > 0 ? (totalSpent + totalDeposited) / totalTxCount : 0;

      // Get recent transactions (sorted by timestamp, most recent first)
      const recentTransactions = [
        ...spendingTransactions,
        ...depositTransactions,
      ]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      // Update stats
      setStats({
        totalSpent,
        totalDeposited,
        avgTransactionSize: avgTxSize,
        transactionCount: totalTxCount,
        recentTransactions,
        isLoading: false,
      });
    } else if (!isLoading) {
      // If no safeAddress or transactions but loading is complete
      setStats((prev) => ({ ...prev, isLoading: false }));
    }
  }, [safeAddress, transactions, isLoading]);

  const refreshCreditUsage = async () => {
    await refreshTransactions();
  };

  // Calculate a forecast credit score based on real spending patterns
  const forecastCreditScore = (currentScore: number): number => {
    if (!safeAddress || transactions.length === 0) {
      return currentScore;
    }

    // Get spending transactions from the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentSpending = transactions.filter(
      (tx) =>
        tx.type === "outgoing" &&
        ["USDC", "EURe", "xDAI"].includes(tx.tokenSymbol) &&
        tx.action !== "Approval" &&
        tx.action !== "Deposit" &&
        !tx.action?.includes("Transfer") &&
        tx.timestamp > thirtyDaysAgo
    );

    // Calculate spending regularity and patterns
    const totalRecentSpend = recentSpending.reduce(
      (sum, tx) => sum + Number(tx.formattedValue),
      0
    );

    // Calculate repayment ratio if we have deposit data
    const deposits = transactions.filter(
      (tx) =>
        tx.type === "incoming" &&
        tx.tokenSymbol !== "GNO" &&
        !tx.action?.includes("Transfer") &&
        tx.timestamp > thirtyDaysAgo
    );

    const totalDeposits = deposits.reduce(
      (sum, tx) => sum + Number(tx.formattedValue),
      0
    );

    // Calculate repayment ratio (deposits / spending)
    const repaymentRatio =
      totalRecentSpend > 0
        ? Math.min(totalDeposits / totalRecentSpend, 2) // Cap at 2x
        : 1; // Default to 1 if no spending

    // Spending frequency impact (more regular spending is better)
    const uniqueDays = new Set(
      recentSpending.map((tx) => new Date(tx.timestamp).toDateString())
    ).size;

    // Calculate frequency score (number of unique days with transactions)
    const frequencyScore = Math.min(uniqueDays / 30, 1) * 10;

    // Calculate spending diversity (number of unique merchants)
    const uniqueMerchants = new Set(
      recentSpending.map((tx) => tx.to.toLowerCase())
    ).size;

    const diversityScore = Math.min(uniqueMerchants / 5, 1) * 10;

    // Combine factors to adjust credit score
    // Repayment has high impact, frequency and diversity medium impact
    const scoreDelta =
      (repaymentRatio - 1) * 15 + // +15 points for 2x repayment, -15 for 0x
      frequencyScore * 0.5 + // Up to +5 points for frequency
      diversityScore * 0.3; // Up to +3 points for diversity

    // Apply delta with limits
    return Math.max(10, Math.min(100, currentScore + scoreDelta));
  };

  return {
    ...stats,
    refreshCreditUsage,
    forecastCreditScore,
    error,
  };
}
