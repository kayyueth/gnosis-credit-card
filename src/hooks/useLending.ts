"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useTransaction,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { CHAIN_CONFIGS } from "@/config/chain";
import { TransactionRecorder } from "@/store/useTransactionStore";

// Use constants from central config
const DEFAULT_CHAIN_ID = 10200;
const {
  wstETHAddress: WSTETH_ADDRESS,
  lendingPoolAddress: LENDING_POOL_ADDRESS,
  safeAddress: SAFE_ADDRESS,
  stablecoinAddresses,
} = CHAIN_CONFIGS[DEFAULT_CHAIN_ID];

interface LendingState {
  wstETHBalance: string;
  allowance: string;
  depositedAmount: string;
  borrowedAmount: string;
  healthFactor: string;
  availableToBorrow: string;
}

// Add a direct transaction recording utility
const recordBorrowTransaction = (
  address: string,
  amount: string,
  stablecoin: "EURe" | "USDC",
  lendingPoolAddress: string,
  isPending: boolean = false
) => {
  return TransactionRecorder.recordTransaction({
    action: "Borrow",
    from: lendingPoolAddress,
    to: address,
    value: amount,
    formattedValue: amount,
    tokenSymbol: stablecoin,
    title: `Borrow ${stablecoin}`,
    description: `Borrowing ${amount} ${stablecoin} against collateral`,
    isPending,
    isConfirmed: !isPending,
  });
};

export function useLending() {
  const { address } = useAccount();
  const [state, setState] = useState<LendingState>({
    wstETHBalance: "0",
    allowance: "0",
    depositedAmount: "0",
    borrowedAmount: "0",
    healthFactor: "0",
    availableToBorrow: "0",
  });

  // Read wstETH balance
  const { data: wstETHBalance } = useReadContract({
    address: WSTETH_ADDRESS as `0x${string}`,
    abi: ["function balanceOf(address) view returns (uint256)"],
    functionName: "balanceOf",
    args: [address],
  });

  // Read contract's stored EURe address
  const { data: contractEureAddress } = useReadContract({
    address: LENDING_POOL_ADDRESS as `0x${string}`,
    abi: ["function eure() view returns (address)"],
    functionName: "eure",
  });

  // Read contract's stored USDC address
  const { data: contractUsdcAddress } = useReadContract({
    address: LENDING_POOL_ADDRESS as `0x${string}`,
    abi: ["function usdc() view returns (address)"],
    functionName: "usdc",
  });

  // Read allowance
  const { data: allowance } = useReadContract({
    address: WSTETH_ADDRESS as `0x${string}`,
    abi: ["function allowance(address,address) view returns (uint256)"],
    functionName: "allowance",
    args: [address, LENDING_POOL_ADDRESS],
  });

  // Read contract USDC debt
  const debtAbi = [
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

  const { data: usdcDebt } = useReadContract({
    address: LENDING_POOL_ADDRESS as `0x${string}`,
    abi: debtAbi,
    functionName: "getUserBorrowed",
    args: [
      address ?? "0x0000000000000000000000000000000000000000",
      stablecoinAddresses.USDC as `0x${string}`,
    ],
  });

  // Mint wstETH
  const { writeContract: mint, isPending: isMinting } = useWriteContract();

  // Approve LendingPool
  const { writeContract: approve, isPending: isApproving } = useWriteContract();

  // Deposit collateral
  const { writeContract: deposit, isPending: isDepositing } =
    useWriteContract();

  // Borrow stablecoin
  const { writeContract: borrow, isPending: isBorrowing } = useWriteContract();

  // Update state when contract reads change
  useEffect(() => {
    if (wstETHBalance) {
      setState((prev) => ({
        ...prev,
        wstETHBalance: formatEther(wstETHBalance as bigint),
      }));
    }
  }, [wstETHBalance]);

  useEffect(() => {
    if (allowance) {
      setState((prev) => ({
        ...prev,
        allowance: formatEther(allowance as bigint),
      }));
    }
  }, [allowance]);

  // Sync borrowedAmount with on-chain data
  useEffect(() => {
    if (usdcDebt) {
      const debtAmount = formatEther(usdcDebt as bigint);

      console.log("USDC debt from contract:", debtAmount);

      if (debtAmount !== state.borrowedAmount) {
        setState((prev) => ({
          ...prev,
          borrowedAmount: debtAmount,
        }));

        // If this is the first time detecting a non-zero amount, ensure a transaction is recorded
        if (
          Number(debtAmount) > 0 &&
          Number(state.borrowedAmount) === 0 &&
          address
        ) {
          console.log(
            "Recording borrow transaction from contract read:",
            debtAmount
          );
          recordBorrowTransaction(
            address,
            debtAmount,
            "USDC",
            LENDING_POOL_ADDRESS,
            false // Not pending, as this is confirmed on-chain
          );
        }
      }
    }
  }, [usdcDebt, address, state.borrowedAmount]);

  const handleMint = async (amount: string) => {
    if (!mint || !address) return;
    try {
      // Record the UI transaction before it happens
      const txId = TransactionRecorder.recordTransaction({
        action: "Mint",
        from: address,
        to: WSTETH_ADDRESS,
        value: amount,
        formattedValue: amount,
        tokenSymbol: "wstETH",
        title: "Mint wstETH",
        description: `Minting ${amount} wstETH for testing`,
        isPending: true,
        isConfirmed: false,
      });

      // Execute the transaction
      const result = await mint({
        address: WSTETH_ADDRESS as `0x${string}`,
        abi: ["function mint(uint256)"],
        functionName: "mint",
        args: [parseEther(amount)],
      });

      // Update the transaction with hash (if available in result)
      TransactionRecorder.updateTransaction(txId, {
        isPending: false,
        isConfirmed: true,
      });
    } catch (error) {
      console.error("Mint error:", error);
    }
  };

  const handleApprove = async (amount: string) => {
    if (!approve || !address) return;
    try {
      // Record the UI transaction before it happens
      const txId = TransactionRecorder.recordTransaction({
        action: "Approve",
        from: address,
        to: LENDING_POOL_ADDRESS,
        value: amount,
        formattedValue: amount,
        tokenSymbol: "wstETH",
        title: "Approve Lending Pool",
        description: `Approving ${amount} wstETH for deposit`,
        isPending: true,
        isConfirmed: false,
      });

      // Execute the transaction
      const result = await approve({
        address: WSTETH_ADDRESS as `0x${string}`,
        abi: ["function approve(address,uint256)"],
        functionName: "approve",
        args: [LENDING_POOL_ADDRESS, parseEther(amount)],
      });

      // Update the transaction with hash (if available in result)
      TransactionRecorder.updateTransaction(txId, {
        isPending: false,
        isConfirmed: true,
      });
    } catch (error) {
      console.error("Approve error:", error);
    }
  };

  const handleDeposit = async (amount: string) => {
    if (!deposit || !address) return;
    try {
      // Record the UI transaction before it happens
      const txId = TransactionRecorder.recordTransaction({
        action: "Deposit",
        from: address,
        to: LENDING_POOL_ADDRESS,
        value: amount,
        formattedValue: amount,
        tokenSymbol: "wstETH",
        title: "Deposit Collateral",
        description: `Depositing ${amount} wstETH as collateral`,
        isPending: true,
        isConfirmed: false,
      });

      // Execute the transaction
      const result = await deposit({
        address: LENDING_POOL_ADDRESS as `0x${string}`,
        abi: ["function deposit(address,uint256,address,uint16)"],
        functionName: "deposit",
        args: [WSTETH_ADDRESS, parseEther(amount), address, 0],
      });

      // Update the transaction with hash (if available in result)
      TransactionRecorder.updateTransaction(txId, {
        isPending: false,
        isConfirmed: true,
      });
    } catch (error) {
      console.error("Deposit error:", error);
    }
  };

  const handleBorrow = async (amount: string, stablecoin: "EURe" | "USDC") => {
    if (!borrow || !address) return;

    // Always record the transaction immediately so it appears in the list
    const txId = recordBorrowTransaction(
      address,
      amount,
      stablecoin,
      LENDING_POOL_ADDRESS,
      true // Mark as pending initially
    );

    try {
      const stablecoinAddress = (
        stablecoin === "EURe" ? contractEureAddress : contractUsdcAddress
      ) as `0x${string}`;
      if (!stablecoinAddress) {
        throw new Error("Stablecoin address not found");
      }

      // Execute the transaction
      const result = await borrow({
        address: LENDING_POOL_ADDRESS as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: "address", name: "stablecoin", type: "address" },
              { internalType: "uint256", name: "amount", type: "uint256" },
            ],
            name: "borrow",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "borrow",
        args: [stablecoinAddress, parseEther(amount)],
      });

      // Update the transaction status
      TransactionRecorder.updateTransaction(txId, {
        isPending: false,
        isConfirmed: true,
      });

      // Manually update the state.borrowedAmount to ensure it reflects the new value
      // This helps with immediate UI updates without waiting for contract read to refresh
      setState((prevState) => ({
        ...prevState,
        borrowedAmount: (
          Number(prevState.borrowedAmount) + Number(amount)
        ).toString(),
      }));

      console.log("Borrow successful - recorded in transaction history", {
        txId,
        amount,
        stablecoin,
        newBorrowedAmount: (
          Number(state.borrowedAmount) + Number(amount)
        ).toString(),
      });
    } catch (error) {
      console.error("Borrow error:", error);

      // Even on error, don't remove the transaction but mark it as not pending
      TransactionRecorder.updateTransaction(txId, {
        isPending: false,
        isConfirmed: true, // We still mark as confirmed since the UI transaction happened
        description: `Failed to borrow ${amount} ${stablecoin}`,
      });
    }
  };

  return {
    state,
    handleMint,
    handleApprove,
    handleDeposit,
    handleBorrow,
    isMinting,
    isApproving,
    isDepositing,
    isBorrowing,
  };
}
