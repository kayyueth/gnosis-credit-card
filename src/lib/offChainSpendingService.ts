import { formatEther, parseEther } from "viem";
import { useGnosisCreditCard } from "@/hooks/useGnosisCreditCard";

interface OffChainTransaction {
  id: string;
  userAddress: string;
  amount: string;
  timestamp: number;
  merchant: string;
  category: string;
  description: string;
  currency: "USDC" | "EURe";
  isCleared: boolean;
}

// Use localStorage to store off-chain transactions
const STORAGE_KEY = "gnosis_offchain_transactions";

// Add a new type for off-chain transaction history
export interface OffChainTransactionHistory {
  id: string;
  userAddress: string;
  type: "spend" | "clearance";
  amount: string;
  timestamp: number;
  merchant?: string;
  category?: string;
  description?: string;
  currency: "USDC" | "EURe" | "GNO";
  txHash?: string;
}

// Use localStorage to store transaction history
const TRANSACTION_HISTORY_KEY = "gnosis_offchain_history";

// Record a transaction in history
export const recordTransactionHistory = (
  userAddress: string,
  type: "spend" | "clearance",
  amount: string,
  currency: "USDC" | "EURe" | "GNO",
  details?: {
    merchant?: string;
    category?: string;
    description?: string;
    txHash?: string;
  }
): void => {
  try {
    const transaction: OffChainTransactionHistory = {
      id: `history_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userAddress: userAddress.toLowerCase(),
      type,
      amount,
      timestamp: Date.now(),
      currency,
      ...details,
    };

    // Get existing history
    const historyJSON = localStorage.getItem(TRANSACTION_HISTORY_KEY);
    let history: OffChainTransactionHistory[] = [];

    if (historyJSON) {
      history = JSON.parse(historyJSON);
    }

    // Add deduplication: skip if a similar transaction exists within 10 seconds
    const isDuplicate = history.some(
      (tx) =>
        tx.userAddress === transaction.userAddress &&
        tx.type === transaction.type &&
        tx.amount === transaction.amount &&
        tx.currency === transaction.currency &&
        Math.abs(tx.timestamp - transaction.timestamp) < 10000 // 10 seconds window
    );

    if (isDuplicate) return; // Skip duplicate

    // Add new transaction
    history.push(transaction);

    // Save back to localStorage
    localStorage.setItem(TRANSACTION_HISTORY_KEY, JSON.stringify(history));

    console.log(`Recorded ${type} transaction in history:`, transaction);
  } catch (error) {
    console.error("Error recording transaction history:", error);
  }
};

// Get transaction history for a user
export const getTransactionHistory = (
  userAddress: string
): OffChainTransactionHistory[] => {
  try {
    const historyJSON = localStorage.getItem(TRANSACTION_HISTORY_KEY);
    if (!historyJSON) return [];

    const history: OffChainTransactionHistory[] = JSON.parse(historyJSON);
    return history
      .filter(
        (tx) => tx.userAddress.toLowerCase() === userAddress.toLowerCase()
      )
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
  } catch (error) {
    console.error("Error retrieving transaction history:", error);
    return [];
  }
};

// Add a new off-chain transaction
export const addOffChainTransaction = async (
  userAddress: string,
  amount: string,
  merchant: string,
  category: string,
  description: string,
  currency: "USDC" | "EURe"
): Promise<boolean> => {
  try {
    // Create transaction record
    const transaction: OffChainTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userAddress: userAddress.toLowerCase(),
      amount,
      timestamp: Date.now(),
      merchant,
      category,
      description,
      currency,
      isCleared: false,
    };

    // Get existing transactions
    const existingTransactionsJSON = localStorage.getItem(STORAGE_KEY);
    let transactions: OffChainTransaction[] = [];

    if (existingTransactionsJSON) {
      transactions = JSON.parse(existingTransactionsJSON);
    }

    // Add new transaction
    transactions.push(transaction);

    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));

    // Now use the contract to record this spending on-chain (admin function)
    // Note: This would normally be done by a backend service with admin rights
    // We'll skip this direct hook call since it causes issues in a service function
    // The actual contract recordOffChainSpending will be called from the component
    console.log("Recorded off-chain transaction locally:", transaction);

    // Also record to transaction history
    recordTransactionHistory(userAddress, "spend", amount, currency, {
      merchant,
      category,
      description,
    });

    return true;
  } catch (error) {
    console.error("Error adding off-chain transaction:", error);
    return false;
  }
};

// Get all transactions for a specific user
export const getUserOffChainTransactions = (
  userAddress: string
): OffChainTransaction[] => {
  try {
    const transactionsJSON = localStorage.getItem(STORAGE_KEY);
    if (!transactionsJSON) return [];

    const transactions: OffChainTransaction[] = JSON.parse(transactionsJSON);
    return transactions.filter(
      (tx) => tx.userAddress.toLowerCase() === userAddress.toLowerCase()
    );
  } catch (error) {
    console.error("Error retrieving off-chain transactions:", error);
    return [];
  }
};

// Get outstanding (not cleared) transactions for a user
export const getOutstandingTransactions = (
  userAddress: string
): OffChainTransaction[] => {
  return getUserOffChainTransactions(userAddress).filter((tx) => !tx.isCleared);
};

// Clear off-chain transactions (mark as cleared)
export const clearOffChainTransactions = (
  userAddress: string,
  txIds?: string[]
): boolean => {
  try {
    const transactionsJSON = localStorage.getItem(STORAGE_KEY);
    if (!transactionsJSON) return false;

    let transactions: OffChainTransaction[] = JSON.parse(transactionsJSON);
    let clearedTransactions: OffChainTransaction[] = [];
    let totalCleared = 0;
    let currency: "USDC" | "EURe" = "USDC";

    // If specific transaction IDs are provided, only clear those
    if (txIds && txIds.length > 0) {
      transactions = transactions.map((tx) => {
        if (
          tx.userAddress.toLowerCase() === userAddress.toLowerCase() &&
          txIds.includes(tx.id) &&
          !tx.isCleared
        ) {
          clearedTransactions.push(tx);
          totalCleared += Number(tx.amount);
          currency = tx.currency;
          return { ...tx, isCleared: true };
        }
        return tx;
      });
    } else {
      // Otherwise clear all transactions for this user
      transactions = transactions.map((tx) => {
        if (
          tx.userAddress.toLowerCase() === userAddress.toLowerCase() &&
          !tx.isCleared
        ) {
          clearedTransactions.push(tx);
          totalCleared += Number(tx.amount);
          currency = tx.currency;
          return { ...tx, isCleared: true };
        }
        return tx;
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));

    // Record clearance to transaction history if any transactions were cleared
    if (clearedTransactions.length > 0) {
      recordTransactionHistory(
        userAddress,
        "clearance",
        totalCleared.toString(),
        currency,
        {
          description: `Cleared ${
            clearedTransactions.length
          } off-chain transaction${clearedTransactions.length > 1 ? "s" : ""}`,
        }
      );
    }

    return true;
  } catch (error) {
    console.error("Error clearing off-chain transactions:", error);
    return false;
  }
};

// Calculate total outstanding amount
export const getTotalOutstandingAmount = (userAddress: string): number => {
  const transactions = getOutstandingTransactions(userAddress);
  return transactions.reduce((total, tx) => total + Number(tx.amount), 0);
};

// Check if a user should receive a monthly reminder
export const shouldSendMonthlyReminder = (userAddress: string): boolean => {
  const transactions = getOutstandingTransactions(userAddress);
  if (transactions.length === 0) return false;

  // Check if any transaction is older than 25 days
  const now = Date.now();
  const oldestOutstandingTx = transactions.sort(
    (a, b) => a.timestamp - b.timestamp
  )[0];

  // If the oldest transaction is more than 25 days old, send a reminder
  const daysSinceOldest =
    (now - oldestOutstandingTx.timestamp) / (1000 * 60 * 60 * 24);
  return daysSinceOldest >= 25;
};

// Generate a user notification message
export const generateMonthlyReminderMessage = (userAddress: string): string => {
  const outstanding = getTotalOutstandingAmount(userAddress);
  const transactions = getOutstandingTransactions(userAddress);

  if (transactions.length === 0 || outstanding === 0) {
    return "";
  }

  return `You have ${transactions.length} outstanding off-chain payment${
    transactions.length > 1 ? "s" : ""
  } totaling ${outstanding.toFixed(2)} ${
    transactions[0].currency
  }. Please clear your balance before the end of the month to earn rewards.`;
};
