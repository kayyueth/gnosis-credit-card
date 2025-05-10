import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import toast from "react-hot-toast";
import { CHAIN_CONFIGS } from "@/config/chain";
import { recordTransactionHistory } from "@/lib/offChainSpendingService";
import { MerkleProof } from "@/lib/merkleTree";

// Default to Gnosis Chiado testnet
const DEFAULT_CHAIN_ID = 10200;
const { gnosisCreditCardAddress, lendingPoolAddress, stablecoinAddresses } =
  CHAIN_CONFIGS[DEFAULT_CHAIN_ID];

// Contract ABI (partial, just the functions we need)
const CREDIT_CARD_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "spend",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "root", type: "bytes32" },
      { internalType: "bytes32[]", name: "proof", type: "bytes32[]" },
      { internalType: "bytes32", name: "leaf", type: "bytes32" },
    ],
    name: "monthlyClearance",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getAvailableCredit",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "userCredits",
    outputs: [
      { internalType: "uint256", name: "creditSnapshot", type: "uint256" },
      { internalType: "uint256", name: "creditSpent", type: "uint256" },
      { internalType: "uint256", name: "offChainSpending", type: "uint256" },
      { internalType: "uint256", name: "lastUpdated", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastClaim",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Read debt ABI
const READ_DEBT_ABI = [
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "address", name: "token", type: "address" },
    ],
    name: "getUserBorrowed",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Admin ABI for recording off-chain spending - to be used with restricted access
const ADMIN_RECORD_ABI = [
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "recordOffChainSpending",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function useGnosisCreditCard() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shouldRedeclare, setShouldRedeclare] = useState(false);
  const [hasOutstandingOffChainBalance, setHasOutstandingOffChainBalance] =
    useState(false);

  // Read available credit
  const { data: availableCredit, refetch: refetchAvailableCredit } =
    useReadContract({
      address: gnosisCreditCardAddress as `0x${string}`,
      abi: CREDIT_CARD_ABI,
      functionName: "getAvailableCredit",
      args: [address ?? "0x0000000000000000000000000000000000000000"],
      query: {
        enabled: !!address,
        refetchInterval: 3000, // Update every 3 seconds
        staleTime: 1000, // Consider data stale after 1 second
      },
    });

  // Read user credit info
  const { data: userCredit, refetch: refetchUserCredit } = useReadContract({
    address: gnosisCreditCardAddress as `0x${string}`,
    abi: CREDIT_CARD_ABI,
    functionName: "userCredits",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: 3000, // Update every 3 seconds
      staleTime: 1000, // Consider data stale after 1 second
    },
  });

  // Read USDC debt from lending protocol
  const { data: usdcDebt, refetch: refetchUsdcDebt } = useReadContract({
    address: lendingPoolAddress as `0x${string}`,
    abi: READ_DEBT_ABI,
    functionName: "getUserBorrowed",
    args: [
      address ?? "0x0000000000000000000000000000000000000000",
      stablecoinAddresses.USDC as `0x${string}`,
    ],
    query: {
      enabled: !!address,
      refetchInterval: 5000, // Update every 5 seconds
    },
  });

  // Compare USDC debt with credit snapshot to see if we need to redeclare
  useEffect(() => {
    if (userCredit && usdcDebt && address) {
      const creditSnapshotValue = Number(formatEther(userCredit[0] as bigint));
      const usdcDebtValue = Number(formatEther(usdcDebt as bigint));

      // If debt is 5% more than credit snapshot, suggest redeclaring
      const needsRedeclaration = usdcDebtValue > creditSnapshotValue * 1.05;

      console.log("Credit vs Debt comparison:", {
        creditSnapshot: creditSnapshotValue,
        usdcDebt: usdcDebtValue,
        needsRedeclaration,
      });

      setShouldRedeclare(needsRedeclaration);
    }
  }, [userCredit, usdcDebt, address]);

  // Check if user has outstanding off-chain balance
  useEffect(() => {
    if (userCredit && address) {
      const offChainSpendingValue = Number(
        formatEther(userCredit[2] as bigint)
      );
      setHasOutstandingOffChainBalance(offChainSpendingValue > 0);

      console.log("Off-chain spending:", {
        offChainSpending: offChainSpendingValue,
        hasOutstanding: offChainSpendingValue > 0,
      });
    }
  }, [userCredit, address]);

  // Read last claim timestamp
  const { data: lastClaimData, refetch: refetchLastClaim } = useReadContract({
    address: gnosisCreditCardAddress as `0x${string}`,
    abi: CREDIT_CARD_ABI,
    functionName: "lastClaim",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!address,
      refetchInterval: 3000, // Update every 3 seconds
      staleTime: 1000, // Consider data stale after 1 second
    },
  });

  // Write function to spend
  const {
    writeContract,
    error: spendError,
    isPending: isSpendPending,
    isSuccess: isSpendSuccess,
  } = useWriteContract();

  // Add debug logging to track credit values
  useEffect(() => {
    if (availableCredit && userCredit) {
      console.log("Credit card state:", {
        availableCredit: formatEther(availableCredit as bigint),
        creditSnapshot: formatEther(userCredit[0] as bigint),
        creditSpent: formatEther(userCredit[1] as bigint),
        offChainSpending: formatEther(userCredit[2] as bigint),
      });
    }
  }, [availableCredit, userCredit]);

  // Effect to show toast notifications and refresh data
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isSpendSuccess) {
      toast.success("Transaction successful! You earned cashback rewards.");

      // Batch all refetches together
      Promise.all([
        refetchAvailableCredit(),
        refetchUserCredit(),
        refetchLastClaim(),
        refetchUsdcDebt(),
      ]).catch((error) => {
        console.error("Error refreshing data:", error);
      });

      setIsSuccess(true);

      // Reset success state after 3 seconds
      timeoutId = setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    isSpendSuccess,
    refetchAvailableCredit,
    refetchUserCredit,
    refetchLastClaim,
    refetchUsdcDebt,
  ]);

  // Handle spending
  const handleSpend = async (amount: string) => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return false;
    }

    try {
      setIsLoading(true);
      // Convert amount to wei (1e18)
      const amountInWei = parseEther(amount);

      // Send the transaction
      writeContract({
        address: gnosisCreditCardAddress as `0x${string}`,
        abi: CREDIT_CARD_ABI,
        functionName: "spend",
        args: [amountInWei],
      });

      toast.success("Transaction submitted");
      return true;
    } catch (error) {
      console.error("Error spending:", error);
      toast.error("Failed to spend. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle monthly clearance of off-chain spending
  const handleMonthlyClearance = (merkleProof: MerkleProof) => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return false;
    }

    try {
      setIsLoading(true);

      // Convert Merkle proof values to the correct format for the contract
      const root = `0x${merkleProof.root}` as `0x${string}`;
      const proof = merkleProof.proof.map((p) => `0x${p}` as `0x${string}`);
      const leaf = `0x${merkleProof.leaf}` as `0x${string}`;

      // Send the transaction to clear off-chain spending with Merkle proof
      writeContract({
        address: gnosisCreditCardAddress as `0x${string}`,
        abi: CREDIT_CARD_ABI,
        functionName: "monthlyClearance",
        args: [root, proof, leaf],
      });

      toast.success("Monthly clearance transaction submitted");

      // Return success without hash (the hash will be available through isPending/isSuccess)
      return true;
    } catch (error) {
      console.error("Error clearing monthly balance:", error);
      toast.error("Failed to clear monthly balance. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Admin function to record off-chain spending - restricted access
  const recordOffChainSpending = (userAddress: string, amount: string) => {
    try {
      setIsLoading(true);
      // Convert amount to wei (1e18)
      const amountInWei = parseEther(amount);

      // Send the transaction to record off-chain spending
      writeContract({
        address: gnosisCreditCardAddress as `0x${string}`,
        abi: ADMIN_RECORD_ABI,
        functionName: "recordOffChainSpending",
        args: [userAddress as `0x${string}`, amountInWei],
      });

      // Record this admin action in transaction history
      recordTransactionHistory(
        userAddress,
        "spend",
        amount,
        "USDC", // Default currency
        {
          description: "Admin recorded off-chain spending",
          // Note: txHash not available at this point
        }
      );

      return true;
    } catch (error) {
      console.error("Error recording off-chain spending:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    availableCredit: availableCredit
      ? formatEther(availableCredit as bigint)
      : "0",
    userCredit: userCredit
      ? {
          creditSnapshot: formatEther(userCredit[0] as bigint),
          creditSpent: formatEther(userCredit[1] as bigint),
          offChainSpending: formatEther(userCredit[2] as bigint),
          lastUpdated: Number(userCredit[3]),
        }
      : null,
    shouldRedeclare,
    hasOutstandingOffChainBalance,
    usdcDebt: usdcDebt ? formatEther(usdcDebt as bigint) : "0",
    lastClaim: lastClaimData ? Number(lastClaimData) : 0,
    handleSpend,
    handleMonthlyClearance,
    recordOffChainSpending,
    isLoading: isLoading || isSpendPending,
    isSuccess,
    error: spendError,
    refetch: async () => {
      await Promise.all([
        refetchAvailableCredit(),
        refetchUserCredit(),
        refetchLastClaim(),
        refetchUsdcDebt,
      ]);
    },
  };
}
