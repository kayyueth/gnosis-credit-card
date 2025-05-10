import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useGnosisCreditCard } from "@/hooks/useGnosisCreditCard";
import toast from "react-hot-toast";
import {
  addOffChainTransaction,
  getUserOffChainTransactions,
  getOutstandingTransactions,
  clearOffChainTransactions,
  getTotalOutstandingAmount,
  shouldSendMonthlyReminder,
  generateMonthlyReminderMessage,
  recordTransactionHistory,
  type OffChainTransactionHistory,
} from "@/lib/offChainSpendingService";
import { getCreditProfile } from "@/data/mock-credit-scores";
import { CHAIN_CONFIGS } from "@/config/chain";
import { generateMerkleTree } from "@/lib/merkleTree";

// Default to Gnosis Chiado testnet
const DEFAULT_CHAIN_ID = 10200;

interface OffChainSpendingHookReturn {
  recordOffChainSpending: (
    amount: string,
    merchant: string,
    category: string,
    description: string,
    currency: "USDC" | "EURe"
  ) => Promise<boolean>;
  clearMonthlyBalance: () => Promise<boolean>;
  allTransactions: OffChainTransactionHistory[];
  outstandingTransactions: OffChainTransactionHistory[];
  totalOutstanding: number;
  isLoading: boolean;
  checkForReminders: () => void;
  hasReminder: boolean;
  reminderMessage: string;
  refetch: () => void;
}

export function useOffChainSpending(): OffChainSpendingHookReturn {
  const { address } = useAccount();
  const { handleMonthlyClearance, isLoading: isCreditCardLoading } =
    useGnosisCreditCard();
  const [isLoading, setIsLoading] = useState(false);
  const [allTransactions, setAllTransactions] = useState<
    OffChainTransactionHistory[]
  >([]);
  const [outstandingTransactions, setOutstandingTransactions] = useState<
    OffChainTransactionHistory[]
  >([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");

  // Function to load transactions
  const loadTransactions = useCallback(() => {
    if (!address) return;

    try {
      // Get all transactions and convert to history format
      const all = getUserOffChainTransactions(address).map((tx) => ({
        ...tx,
        type: "spend" as const,
        id: tx.id,
        userAddress: tx.userAddress,
      }));
      setAllTransactions(all);

      // Get outstanding transactions and convert to history format
      const outstanding = getOutstandingTransactions(address).map((tx) => ({
        ...tx,
        type: "spend" as const,
        id: tx.id,
        userAddress: tx.userAddress,
      }));
      setOutstandingTransactions(outstanding);

      // Calculate total outstanding
      const total = getTotalOutstandingAmount(address);
      setTotalOutstanding(total);

      // Check if reminder should be shown
      const needsReminder = shouldSendMonthlyReminder(address);
      setHasReminder(needsReminder);

      if (needsReminder) {
        const message = generateMonthlyReminderMessage(address);
        setReminderMessage(message);
      } else {
        setReminderMessage("");
      }
    } catch (error) {
      console.error("Error loading off-chain transactions:", error);
    }
  }, [address]);

  // Load transactions when user connects
  useEffect(() => {
    if (!address) return;

    // Load immediately and then on a schedule
    loadTransactions();

    // Set up interval to check transactions
    const intervalId = setInterval(loadTransactions, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [address, loadTransactions]);

  // Function to record new off-chain spending
  const recordOffChainSpending = useCallback(
    async (
      amount: string,
      merchant: string,
      category: string,
      description: string,
      currency: "USDC" | "EURe"
    ): Promise<boolean> => {
      if (!address) {
        toast.error("Please connect your wallet first");
        return false;
      }

      setIsLoading(true);
      try {
        // Only store locally, do NOT call contract for off-chain payment
        const localSuccess = await addOffChainTransaction(
          address,
          amount,
          merchant,
          category,
          description,
          currency
        );

        if (localSuccess) {
          toast.success("Off-chain payment recorded successfully");
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error recording off-chain spending:", error);
        toast.error("An error occurred while recording off-chain spending");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [address]
  );

  // Function to clear monthly balance (on-chain and local records)
  const clearMonthlyBalance = useCallback(async (): Promise<boolean> => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return false;
    }

    if (outstandingTransactions.length === 0) {
      toast("No outstanding balance to clear");
      return true;
    }

    setIsLoading(true);
    try {
      // Generate Merkle tree for outstanding transactions
      const merkleProof = generateMerkleTree(outstandingTransactions);

      // Call the contract's monthlyClearance function which will handle both
      // the payment and GNO rewards in one transaction
      const contractSuccess = await handleMonthlyClearance(merkleProof);

      if (contractSuccess) {
        // If successful, update local records
        const localSuccess = clearOffChainTransactions(address);

        if (localSuccess) {
          toast.success("Monthly balance cleared successfully");

          // Calculate total amount and GNO reward based on credit tier
          const totalAmount = getTotalOutstandingAmount(address);
          const currency = outstandingTransactions[0]?.currency || "USDC";

          // Get credit profile to determine cashback rate
          const profile = getCreditProfile(address);
          let cashbackRate = 0;

          if (profile) {
            if (profile.totalScore >= 90) {
              cashbackRate = 0.03; // Sovereign: 3%
            } else if (profile.totalScore >= 75) {
              cashbackRate = 0.02; // Ally: 2%
            } else if (profile.totalScore >= 60) {
              cashbackRate = 0.01; // Basic: 1%
            } else if (profile.totalScore >= 40) {
              cashbackRate = 0.005; // Citizen: 0.5%
            }
            // Dormant: 0%
          }

          const gnoReward = (totalAmount * cashbackRate).toFixed(2);

          // Record the clearance transaction if any amount was cleared
          if (totalAmount > 0) {
            recordTransactionHistory(
              address,
              "clearance",
              totalAmount.toString(),
              currency,
              {
                description: `Monthly clearance`,
                merkleRoot: merkleProof.root, // Store Merkle root in transaction history
              }
            );
          }

          // Always record the GNO reward transaction, even if 0
          recordTransactionHistory(address, "clearance", gnoReward, "GNO", {
            description: `GNO cashback reward (${(cashbackRate * 100).toFixed(
              1
            )}%)`,
            category: "Rewards",
            merchant: "Gnosis Pay",
          });

          // Refresh transactions
          const all = getUserOffChainTransactions(address);
          setAllTransactions(all);

          const outstanding = getOutstandingTransactions(address);
          setOutstandingTransactions(outstanding);

          setTotalOutstanding(0);
          setHasReminder(false);
          setReminderMessage("");

          return true;
        }
      }

      toast.error("Failed to clear monthly balance");
      return false;
    } catch (error) {
      console.error("Error clearing monthly balance:", error);
      toast.error("An error occurred while clearing monthly balance");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, outstandingTransactions, handleMonthlyClearance]);

  // Function to check for reminders (can be called on demand)
  const checkForReminders = useCallback(() => {
    if (!address) return;

    const needsReminder = shouldSendMonthlyReminder(address);
    setHasReminder(needsReminder);

    if (needsReminder) {
      const message = generateMonthlyReminderMessage(address);
      setReminderMessage(message);
    } else {
      setReminderMessage("");
    }
  }, [address]);

  return {
    recordOffChainSpending,
    clearMonthlyBalance,
    allTransactions,
    outstandingTransactions,
    totalOutstanding,
    isLoading: isLoading || isCreditCardLoading,
    checkForReminders,
    hasReminder,
    reminderMessage,
    refetch: loadTransactions,
  };
}
