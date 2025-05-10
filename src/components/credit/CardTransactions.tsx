"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useSafeTransactions,
  type TransactionSource,
  type Transaction,
} from "@/hooks/useSafeTransactions";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  Info,
  CreditCard,
  Gift,
  Car,
  PiggyBank,
  Wallet,
  Building,
  Utensils,
  ShoppingBag,
  Home,
  Check,
  ArrowDownUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGnosisCreditCard } from "@/hooks/useGnosisCreditCard";
import { useLending } from "@/hooks/useLending";
import { Skeleton } from "@/components/ui/skeleton";
import { useSafeStore } from "@/store/useSafeStore";
import { useTransactionStore } from "@/store/useTransactionStore";
import { CHAIN_CONFIGS } from "@/config/chain";

interface CardTransactionsProps {
  className?: string;
}

// Add this near the other constant declarations, before the component definition
// Default to Gnosis Chiado testnet
const DEFAULT_CHAIN_ID = 10200;
const { gnosisCreditCardAddress, gnoPointsAddress, lendingPoolAddress } =
  CHAIN_CONFIGS[DEFAULT_CHAIN_ID];

// Function to get category icon
const getCategoryIcon = (category: string, action?: string) => {
  // If we have an action, use that for more specific icon selection
  if (action) {
    if (action.includes("Approve")) {
      return <Wallet className="h-4 w-4 text-blue-600" />;
    }
    if (action === "Deposit") {
      return <PiggyBank className="h-4 w-4 text-blue-600" />;
    }
    if (action === "Borrow") {
      return <Wallet className="h-4 w-4 text-purple-600" />;
    }
    if (action === "Mint") {
      return <CreditCard className="h-4 w-4 text-green-600" />;
    }
    if (action === "Spend") {
      return <ShoppingBag className="h-4 w-4 text-red-600" />;
    }
  }

  // Fallback to category-based icons
  switch (category) {
    case "Shopping":
      return <ShoppingBag className="h-4 w-4" />;
    case "Transportation":
      return <Car className="h-4 w-4" />;
    case "Food & Dining":
      return <Utensils className="h-4 w-4" />;
    case "Utilities":
      return <Home className="h-4 w-4" />;
    case "Rewards":
      return <Gift className="h-4 w-4 text-green-600" />;
    case "Deposit":
      return <PiggyBank className="h-4 w-4 text-blue-600" />;
    case "Borrow":
      return <Wallet className="h-4 w-4 text-purple-600" />;
    case "Mint":
      return <CreditCard className="h-4 w-4 text-green-600" />;
    case "DeFi":
      return <Building className="h-4 w-4 text-blue-600" />;
    default:
      return <CreditCard className="h-4 w-4" />;
  }
};

// Update the inferCategory function to use proper types
interface TransactionDetails {
  to: string;
  from: string;
  type: "incoming" | "outgoing";
  tokenSymbol: string;
  action?: string;
  description?: string;
}

interface CategoryInfo {
  merchant: string;
  category: string;
  description: string;
}

const inferCategory = (tx: TransactionDetails): CategoryInfo => {
  // Check if it's a known merchant
  const lowerTo = tx.to.toLowerCase();
  const lowerFrom = tx.from.toLowerCase();

  // Check first if the action is explicitly set to Mint
  if (tx.action === "Mint") {
    return {
      merchant: "Token Mint",
      category: "Mint",
      description: tx.description || "Token Minting",
    };
  }

  // For DeFi operations (Aave)
  if (
    lowerTo === lendingPoolAddress.toLowerCase() ||
    lowerFrom === lendingPoolAddress.toLowerCase()
  ) {
    const merchant = "Aave V3";
    const category = tx.type === "incoming" ? "Borrow" : "Deposit";
    const description =
      tx.type === "incoming" ? "Stablecoin Borrow" : "Collateral Deposit";
    return { merchant, category, description };
  }

  // For GnosisCreditCard operations (mint and rewards)
  if (
    lowerTo === gnosisCreditCardAddress.toLowerCase() ||
    lowerFrom === gnosisCreditCardAddress.toLowerCase()
  ) {
    // If the token is GNO and it's incoming, it's likely a mint or rewards operation
    if (tx.tokenSymbol === "GNO" && tx.type === "incoming") {
      return {
        merchant: "Gnosis Pay",
        category: "Rewards",
        description:
          tx.action === "Mint" ? "Credit Minted" : "Cashback Rewards",
      };
    }
  }

  // For GnoPoints operations (credit-related)
  if (
    lowerTo === gnoPointsAddress.toLowerCase() ||
    lowerFrom === gnoPointsAddress.toLowerCase()
  ) {
    return {
      merchant: "Gnosis Credit",
      category: tx.type === "incoming" ? "Mint" : "Transfer",
      description: tx.type === "incoming" ? "Credit Minted" : "Credit Transfer",
    };
  }

  // For wstETH tokens coming from mockWstETH address (minting)
  if (tx.tokenSymbol === "wstETH" && tx.type === "incoming") {
    return {
      merchant: "wstETH Mint",
      category: "Mint",
      description: "Collateral Token Minted",
    };
  }

  // For stablecoins, categorize as DeFi transactions
  if (["USDC", "EURe", "xDAI"].includes(tx.tokenSymbol)) {
    // Check if it's a known DeFi address
    const targetAddress = tx.type === "outgoing" ? lowerTo : lowerFrom;

    if (targetAddress === lendingPoolAddress.toLowerCase()) {
      return {
        merchant: "Aave V3",
        category: tx.type === "incoming" ? "Borrow" : "Deposit",
        description:
          tx.type === "incoming" ? "Stablecoin Borrowed" : "Stablecoin Deposit",
      };
    }

    if (targetAddress === gnosisCreditCardAddress.toLowerCase()) {
      return {
        merchant: "Gnosis Pay",
        category: "DeFi",
        description: tx.type === "incoming" ? "Received" : "Sent",
      };
    }

    // For other addresses, categorize as DeFi transactions
    return {
      merchant:
        tx.type === "outgoing"
          ? `To ${formatAddress(tx.to)}`
          : `From ${formatAddress(tx.from)}`,
      category: "DeFi",
      description: tx.type === "outgoing" ? "Sent" : "Received",
    };
  }

  // For other token types
  return {
    merchant:
      tx.type === "outgoing"
        ? `To ${formatAddress(tx.to)}`
        : `From ${formatAddress(tx.from)}`,
    category: "Transfer",
    description: tx.type === "outgoing" ? "Sent" : "Received",
  };
};

const formatAddress = (address: string) => {
  return `${address.substring(0, 6)}...${address.substring(
    address.length - 4
  )}`;
};

// Transaction skeleton component for loading state
const TransactionSkeleton = () => (
  <div className="flex items-center p-3 rounded-lg border border-gray-100 dark:border-gray-800">
    <Skeleton className="flex-shrink-0 w-10 h-10 rounded-full mr-3" />
    <div className="flex-grow">
      <div className="flex justify-between items-start">
        <div>
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="text-right">
          <Skeleton className="h-5 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  </div>
);

// Update the RewardTransaction interface to extend Transaction with required fields
interface RewardTransaction extends Transaction {
  rewardAmount: number;
  rewardType: "cashback" | "points";
  originalTransactionId: string;
}

export function CardTransactions({ className }: CardTransactionsProps) {
  const { safeAddress } = useSafeStore();
  const { transactions, isLoading, error, refreshTransactions, walletAddress } =
    useSafeTransactions({
      safeAddress,
      skipInitialFetch: false, // Keep listeners enabled
    });

  // Get UI transactions from our store
  const { transactions: uiTransactions } = useTransactionStore();

  const { userCredit } = useGnosisCreditCard();
  const lendingState = useLending();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [lendingTransactions, setLendingTransactions] = useState<Transaction[]>(
    []
  );
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);
  const [transactionTabActive, setTransactionTabActive] = useState(false);
  const [rewardsTransactions, setRewardsTransactions] = useState<
    RewardTransaction[]
  >([]);

  // Check if the current active tab is "transactions"
  useEffect(() => {
    const checkTransactionTab = () => {
      const transactionTab = document.querySelector(
        '[data-value="transactions"][aria-selected="true"]'
      );
      setTransactionTabActive(!!transactionTab);
    };

    // Initial check
    checkTransactionTab();

    // Set up a MutationObserver to watch for tab changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "aria-selected"
        ) {
          checkTransactionTab();
        }
      }
    });

    const tabTriggers = document.querySelectorAll(
      '[data-value="transactions"]'
    );
    tabTriggers.forEach((trigger) => {
      observer.observe(trigger, { attributes: true });
    });

    return () => observer.disconnect();
  }, []);

  // Refresh transactions when tab becomes active
  useEffect(() => {
    if (transactionTabActive && !isLoading) {
      refreshTransactions();
    }
  }, [transactionTabActive, refreshTransactions, isLoading]);

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && transactionTabActive) {
        refreshTransactions();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshTransactions, transactionTabActive]);

  // Immediately fetch data when component mounts, but with a small delay to prioritize UI rendering
  useEffect(() => {
    const loadData = async () => {
      if (!dataFetched) {
        await refreshTransactions();
        setDataFetched(true);
      }
    };

    // Use a small timeout to prioritize UI rendering first
    const timer = setTimeout(loadData, 300);
    return () => clearTimeout(timer);
  }, [dataFetched, refreshTransactions]);

  // Remove mock spending transactions functionality
  useEffect(() => {
    if (transactions.length > 0) {
      setLocalTransactions(transactions);
    }
  }, [transactions]);

  // Poll for transactions when the transactions tab is active
  useEffect(() => {
    if (!transactionTabActive) return;

    // Set up polling for transactions when tab is active
    const pollInterval = setInterval(() => {
      if (!isRefreshing && !isLoading) {
        refreshTransactions();
      }
    }, 15000); // Poll every 15 seconds when tab is active

    return () => clearInterval(pollInterval);
  }, [transactionTabActive, refreshTransactions, isRefreshing, isLoading]);

  // Optimize handleRefresh to show immediate feedback
  const handleRefresh = async () => {
    if (isRefreshing || isLoading) return;

    setIsRefreshing(true);

    try {
      // Force a fresh check for borrow transactions
      const borrowedAmount = lendingState?.state?.borrowedAmount;
      if (borrowedAmount && Number(borrowedAmount) > 0 && safeAddress) {
        // Create a fresh borrow transaction to ensure it appears
        const borrowTx: Transaction = {
          id: `borrow-refresh-${Date.now()}-${borrowedAmount}`,
          from: lendingPoolAddress,
          to: safeAddress,
          type: "incoming",
          value: borrowedAmount,
          formattedValue: Number(borrowedAmount).toFixed(2),
          tokenSymbol: "USDC",
          tokenAddress: lendingPoolAddress,
          timestamp: Date.now() - 60000, // 1 minute ago
          action: "Borrow",
          source: "wallet",
        };

        setLendingTransactions((prev) => {
          if (
            !prev.some(
              (tx) =>
                tx.value === borrowedAmount &&
                inferCategory(tx).category === "Borrow"
            )
          ) {
            console.log("Adding borrow transaction during refresh:", borrowTx);
            return [...prev, borrowTx];
          }
          return prev;
        });
      }

      await refreshTransactions();
    } catch (error) {
      console.error("Error refreshing transactions:", error);
    } finally {
      // Delay turning off the loading indicator to ensure UI feels responsive
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Generate rewards transactions
  useEffect(() => {
    if (userCredit && safeAddress) {
      // Get actual spending transactions to generate cashbacks from
      const spendingTransactions = [...transactions, ...localTransactions]
        .filter(
          (tx) =>
            // Only consider outgoing stablecoin transactions (actual spending)
            tx.type === "outgoing" &&
            ["USDC", "EURe", "xDAI"].includes(tx.tokenSymbol) &&
            tx.action !== "Approval" &&
            tx.action !== "Deposit" &&
            !tx.action?.includes("Transfer")
        )
        // Sort by timestamp, most recent first
        .sort((a, b) => b.timestamp - a.timestamp)
        // Take up to 5 most recent transactions
        .slice(0, 5);

      // Array for our cashback rewards
      const generatedRewards: RewardTransaction[] = spendingTransactions.map(
        (tx, index) => ({
          id: `reward-${tx.id}-${index}`,
          from: tx.from,
          to: tx.to,
          type: "incoming",
          value: (Number(tx.value) * 0.02).toString(), // 2% cashback
          formattedValue: (Number(tx.formattedValue) * 0.02).toFixed(2),
          tokenSymbol: "GNO",
          tokenAddress: gnoPointsAddress,
          timestamp: tx.timestamp + 300000, // 5 minutes after the original transaction
          action: "Reward",
          source: "wallet",
          rewardAmount: Number(tx.value) * 0.02,
          rewardType: "cashback",
          originalTransactionId: tx.id,
        })
      );

      setRewardsTransactions(generatedRewards);
    }
  }, [userCredit, safeAddress, transactions, localTransactions]);

  // Generate lending transactions
  useEffect(() => {
    // Don't regenerate lending transactions if we already have them
    // This prevents duplicate entries with different timestamps
    const hasDeposit = lendingTransactions.some(
      (tx) =>
        inferCategory(tx).category === "Deposit" &&
        tx.tokenSymbol === "wstETH" &&
        Number(tx.value) === Number(lendingState?.state?.depositedAmount || 0)
    );

    const hasBorrow = lendingTransactions.some(
      (tx) =>
        inferCategory(tx).category === "Borrow" &&
        tx.tokenSymbol === "USDC" &&
        Number(tx.value) === Number(lendingState?.state?.borrowedAmount || 0)
    );

    // Only create new transactions if we don't already have them
    const lendingActivity = [...lendingTransactions];

    // Add deposit transaction if it's not already there
    if (
      !hasDeposit &&
      lendingState?.state?.depositedAmount &&
      Number(lendingState.state.depositedAmount) > 0 &&
      safeAddress
    ) {
      lendingActivity.push({
        id: `deposit-${lendingState.state.depositedAmount}`,
        from: safeAddress,
        to: lendingPoolAddress,
        type: "outgoing",
        value: lendingState.state.depositedAmount,
        formattedValue: Number(lendingState.state.depositedAmount).toFixed(2),
        tokenSymbol: "wstETH",
        tokenAddress: lendingPoolAddress,
        timestamp: Date.now() - 86400000,
        action: "Deposit",
        source: "wallet",
      });
    }

    // Add borrow transaction if it's not already there
    if (
      !hasBorrow &&
      lendingState?.state?.borrowedAmount &&
      Number(lendingState.state.borrowedAmount) > 0 &&
      safeAddress
    ) {
      lendingActivity.push({
        id: `borrow-${lendingState.state.borrowedAmount}`,
        from: lendingPoolAddress,
        to: safeAddress,
        type: "incoming",
        value: lendingState.state.borrowedAmount,
        formattedValue: Number(lendingState.state.borrowedAmount).toFixed(2),
        tokenSymbol: "USDC",
        tokenAddress: lendingPoolAddress,
        timestamp: Date.now() - 86380000,
        action: "Borrow",
        source: "wallet",
      });
    }

    // Only update state if we actually added new transactions
    if (lendingActivity.length > lendingTransactions.length) {
      setLendingTransactions(lendingActivity);
    }
  }, [
    lendingState?.state?.depositedAmount,
    lendingState?.state?.borrowedAmount,
    safeAddress,
    lendingTransactions,
  ]);

  // Process UI transactions to match the format of other transactions
  const processedUITransactions = useMemo(() => {
    if (!uiTransactions.length) return [];

    return uiTransactions.map((tx) => {
      // Determine the proper type based on action
      let type: "incoming" | "outgoing" =
        tx.from === safeAddress || tx.from === walletAddress
          ? "outgoing"
          : "incoming";
      // Description should reflect what actually happened in the UI
      let action = tx.action;
      // For mint actions, make sure they show as mint in both category and action
      if (tx.action === "Mint") {
        action = "Mint";
        type = "incoming";
      }
      if (tx.action === "Borrow") {
        action = "Borrow";
        type = "incoming";
      }
      return {
        id: tx.id,
        timestamp: tx.timestamp,
        from: tx.from,
        to: tx.to,
        tokenAddress: "",
        tokenSymbol: tx.tokenSymbol,
        value: tx.value,
        formattedValue: tx.formattedValue,
        type,
        action,
        source: "ui" as TransactionSource,
      };
    });
  }, [uiTransactions, safeAddress, walletAddress]);

  const formatTime = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Process real transactions to add merchant, category and description
  const processedTransactions = [...transactions, ...localTransactions]
    .filter(
      (tx, index, self) =>
        // Remove duplicates based on transaction ID
        index === self.findIndex((t) => t.id === tx.id) &&
        // Filter out approval actions
        tx.action !== "Approval"
    )
    .map((tx) => {
      const { merchant, category, description } = inferCategory(tx);

      // Prioritize "Mint" action/category over "Deposit" to avoid confusion
      let finalCategory = category;
      let finalAction = tx.action || category;

      // If this is a wstETH incoming transaction, explicitly mark as Mint
      if (tx.tokenSymbol === "wstETH" && tx.type === "incoming") {
        finalCategory = "Mint";
        finalAction = "Mint";
      }

      // If the description contains "mint" or "minted", prioritize Mint
      if (description.toLowerCase().includes("mint")) {
        finalCategory = "Mint";
        finalAction = "Mint";
      }

      return {
        ...tx,
        merchant,
        category: finalCategory,
        action: finalAction,
        description,
      };
    });

  // Combine all transactions - now including UI transactions and remove duplicates
  const allTransactions = [
    ...processedTransactions,
    ...rewardsTransactions,
    ...lendingTransactions,
    ...processedUITransactions,
  ]
    .filter((tx, index, self) => {
      // Try to deduplicate by looking for similar transactions (same amount, type, and token)
      return (
        index ===
        self.findIndex(
          (t) =>
            // Match by exact ID first
            t.id === tx.id ||
            // Or by similar transaction properties
            (inferCategory(t).category === inferCategory(tx).category &&
              t.tokenSymbol === tx.tokenSymbol &&
              Math.abs(Number(t.value) - Number(tx.value)) < 0.01 &&
              Math.abs(t.timestamp - tx.timestamp) < 600000) // Within 10 minutes of each other
        )
      );
    })
    .filter((tx) => {
      const { category, action } = { ...inferCategory(tx), action: tx.action };
      return (
        category === "Deposit" ||
        category === "Borrow" ||
        category === "Mint" ||
        category === "Rewards" ||
        action === "Deposit" ||
        action === "Borrow" ||
        action === "Mint"
      );
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  // Always show actual data or loading
  const showLoading = isLoading || isRefreshing || !dataFetched;
  const hasTransactions = allTransactions.length > 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center">
            <ArrowDownUp className="mr-2 h-5 w-5" />
            Credit Card Activity
          </CardTitle>
          <CardDescription>Your deposits, borrows, and rewards</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className="h-8 px-2"
        >
          {isLoading || isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <TransactionSkeleton key={i} />
            ))}
          </div>
        ) : !hasTransactions ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {!userCredit || Number(userCredit?.creditSnapshot || "0") === 0 ? (
              <p>
                No credit activity yet. Deposit collateral and borrow to get
                started.
              </p>
            ) : (
              <p>
                No transactions yet. Make a deposit or borrow to see activity!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {allTransactions.slice(0, 10).map((tx) => {
              const { merchant, category, description } = inferCategory(tx);

              // Determine the real transaction type based on both action and category
              const isMint =
                tx.action === "Mint" ||
                (category === "Mint" && tx.action !== "Deposit") ||
                (description && description.toLowerCase().includes("mint")) ||
                (merchant && merchant.toLowerCase().includes("mint"));

              const isDeposit =
                !isMint && (tx.action === "Deposit" || category === "Deposit");

              const isBorrow =
                !isMint &&
                !isDeposit &&
                (tx.action === "Borrow" || category === "Borrow");

              // Adjust the merchant name for wstETH mints
              const displayMerchant =
                isMint && tx.tokenSymbol === "wstETH"
                  ? "wstETH Mint"
                  : merchant;

              return (
                <div
                  key={tx.id}
                  className="flex items-center p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div
                    className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3",
                      isDeposit
                        ? "bg-blue-100 dark:bg-blue-900/20"
                        : isBorrow
                        ? "bg-purple-100 dark:bg-purple-900/20"
                        : isMint
                        ? "bg-emerald-100 dark:bg-emerald-900/20"
                        : tx.action?.includes("Approve")
                        ? "bg-blue-100 dark:bg-blue-900/20"
                        : category === "Rewards"
                        ? "bg-green-100 dark:bg-green-900/20"
                        : tx.type === "incoming"
                        ? "bg-green-100 dark:bg-green-900/20"
                        : "bg-red-100 dark:bg-red-900/20"
                    )}
                  >
                    {isDeposit ? (
                      <PiggyBank className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : isBorrow ? (
                      <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    ) : isMint ? (
                      <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : tx.action?.includes("Approve") ? (
                      <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : category === "Rewards" ? (
                      <Gift className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : tx.type === "incoming" ? (
                      <ArrowDownLeft className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>

                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium flex items-center">
                          {displayMerchant ||
                            formatAddress(
                              tx.type === "incoming" ? tx.from : tx.to
                            )}
                          <Badge variant="outline" className="ml-2 text-xs">
                            {tx.tokenSymbol}
                          </Badge>
                          {/* Use different colored badges for different action types */}
                          {isMint && (
                            <Badge className="ml-2 text-xs bg-emerald-500 text-white border-none">
                              Mint
                            </Badge>
                          )}
                          {isBorrow && (
                            <Badge className="ml-2 text-xs bg-purple-500 text-white border-none">
                              Borrow
                            </Badge>
                          )}
                          {isDeposit && (
                            <Badge className="ml-2 text-xs bg-blue-500 text-white border-none">
                              Deposit
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                          {getCategoryIcon(category)}
                          <span className="ml-1">
                            {description ||
                              (category === "Mint"
                                ? "Token Minted"
                                : category === "Deposit"
                                ? "Collateral Deposit"
                                : category === "Borrow"
                                ? "Stablecoin Borrow"
                                : category)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={cn(
                            "font-semibold",
                            isMint
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isBorrow
                              ? "text-purple-600 dark:text-purple-400"
                              : isDeposit
                              ? "text-blue-600 dark:text-blue-400"
                              : tx.type === "incoming"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {tx.type === "incoming" ? "+" : "-"}
                          {tx.formattedValue}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatTime(tx.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {allTransactions.length > 10 && (
              <Button variant="ghost" className="w-full text-sm" size="sm">
                View All Transactions
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
