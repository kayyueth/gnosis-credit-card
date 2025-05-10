import { create } from "zustand";
import { persist } from "zustand/middleware";

// Transaction types for user interface actions
export type UITransactionType =
  | "Mint"
  | "Deposit"
  | "Borrow"
  | "Approve"
  | "Transfer";

// Interface for UI transaction records
export interface UITransaction {
  id: string;
  timestamp: number;
  action: UITransactionType;
  from: string;
  to: string;
  value: string;
  formattedValue: string;
  tokenSymbol: string;
  title: string;
  description: string;
  isPending: boolean;
  isConfirmed: boolean;
  hash?: string;
}

// Store interface
interface TransactionStore {
  transactions: UITransaction[];
  // Add a transaction from UI interaction
  addTransaction: (
    transaction: Omit<UITransaction, "id" | "timestamp">
  ) => string;
  // Update a transaction status (when confirmed)
  updateTransaction: (id: string, updates: Partial<UITransaction>) => void;
  // Clear all transactions (for development or user preference)
  clearTransactions: () => void;
  // Get transactions by type
  getTransactionsByType: (type: UITransactionType) => UITransaction[];
}

// Create a singleton store instance
export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (transaction) => {
        const newTransaction: UITransaction = {
          ...transaction,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };

        set((state) => ({
          transactions: [newTransaction, ...state.transactions],
        }));

        return newTransaction.id;
      },

      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...updates } : tx
          ),
        }));
      },

      clearTransactions: () => {
        set({ transactions: [] });
      },

      getTransactionsByType: (type) => {
        return get().transactions.filter((tx) => tx.action === type);
      },
    }),
    {
      name: "transaction-store",
    }
  )
);

// Static methods for use without hooks
export const TransactionRecorder = {
  recordTransaction: (transaction: Omit<UITransaction, "id" | "timestamp">) => {
    return useTransactionStore.getState().addTransaction(transaction);
  },

  updateTransaction: (id: string, updates: Partial<UITransaction>) => {
    useTransactionStore.getState().updateTransaction(id, updates);
  },

  getTransactionsByType: (type: UITransactionType) => {
    return useTransactionStore.getState().getTransactionsByType(type);
  },
};
