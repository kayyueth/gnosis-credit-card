"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { CHAIN_CONFIGS } from "@/config/chain";
import { TransactionRecorder } from "@/store/useTransactionStore";

// Use constants from central config
const DEFAULT_CHAIN_ID = 10200;
const {
  wstETHAddress: WSTETH_ADDRESS,
  lendingPoolAddress: LENDING_POOL_ADDRESS,
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
      TransactionRecorder.recordTransaction({
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

      // Execute the mint transaction
      await mint({
        address: WSTETH_ADDRESS as `0x${string}`,
        abi: ["function mint(address to, uint256 amount) public"],
        functionName: "mint",
        args: [address, parseEther(amount)],
      });

      // Update the transaction status
      TransactionRecorder.updateTransaction({
        action: "Mint",
        from: address,
        to: WSTETH_ADDRESS,
        value: amount,
        formattedValue: amount,
        tokenSymbol: "wstETH",
        title: "Mint wstETH",
        description: `Minting ${amount} wstETH for testing`,
        isPending: false,
        isConfirmed: true,
      });
    } catch (error) {
      console.error("Mint failed:", error);
      throw error;
    }
  };

  const handleApprove = async (amount: string) => {
    if (!approve || !address) return;
    try {
      // Record the UI transaction before it happens
      TransactionRecorder.recordTransaction({
        action: "Approve",
        from: address,
        to: LENDING_POOL_ADDRESS,
        value: amount,
        formattedValue: amount,
        tokenSymbol: "wstETH",
        title: "Approve wstETH",
        description: `Approving ${amount} wstETH for lending pool`,
        isPending: true,
        isConfirmed: false,
      });

      // Execute the approve transaction
      await approve({
        address: WSTETH_ADDRESS as `0x${string}`,
        abi: [
          "function approve(address spender, uint256 amount) external returns (bool)",
        ],
        functionName: "approve",
        args: [LENDING_POOL_ADDRESS, parseEther(amount)],
      });

      // Update the transaction status
      TransactionRecorder.updateTransaction({
        action: "Approve",
        from: address,
        to: LENDING_POOL_ADDRESS,
        value: amount,
        formattedValue: amount,
        tokenSymbol: "wstETH",
        title: "Approve wstETH",
        description: `Approving ${amount} wstETH for lending pool`,
        isPending: false,
        isConfirmed: true,
      });
    } catch (error) {
      console.error("Approve failed:", error);
      throw error;
    }
  };

  const handleDeposit = async (amount: string) => {
    if (!deposit || !address) return;
    try {
      // Record the UI transaction before it happens
      TransactionRecorder.recordTransaction({
        action: "Deposit",
        from: address,
        to: LENDING_POOL_ADDRESS,
        value: amount,
        formattedValue: amount,
        tokenSymbol: "wstETH",
        title: "Deposit wstETH",
        description: `Depositing ${amount} wstETH as collateral`,
        isPending: true,
        isConfirmed: false,
      });

      // Execute the deposit transaction
      await deposit({
        address: LENDING_POOL_ADDRESS as `0x${string}`,
        abi: ["function deposit(address asset, uint256 amount) external"],
        functionName: "deposit",
        args: [WSTETH_ADDRESS, parseEther(amount)],
      });

      // Update the transaction status
      TransactionRecorder.updateTransaction({
        action: "Deposit",
        from: address,
        to: LENDING_POOL_ADDRESS,
        value: amount,
        formattedValue: amount,
        tokenSymbol: "wstETH",
        title: "Deposit wstETH",
        description: `Depositing ${amount} wstETH as collateral`,
        isPending: false,
        isConfirmed: true,
      });
    } catch (error) {
      console.error("Deposit failed:", error);
      throw error;
    }
  };

  const handleBorrow = async (amount: string, stablecoin: "EURe" | "USDC") => {
    if (!borrow || !address) return;
    try {
      // Record the UI transaction before it happens
      TransactionRecorder.recordTransaction({
        action: "Borrow",
        from: LENDING_POOL_ADDRESS,
        to: address,
        value: amount,
        formattedValue: amount,
        tokenSymbol: stablecoin,
        title: `Borrow ${stablecoin}`,
        description: `Borrowing ${amount} ${stablecoin} against collateral`,
        isPending: true,
        isConfirmed: false,
      });

      // Execute the borrow transaction
      await borrow({
        address: LENDING_POOL_ADDRESS as `0x${string}`,
        abi: ["function borrow(address token, uint256 amount) external"],
        functionName: "borrow",
        args: [stablecoinAddresses[stablecoin], parseEther(amount)],
      });

      // Update the transaction status
      TransactionRecorder.updateTransaction({
        action: "Borrow",
        from: LENDING_POOL_ADDRESS,
        to: address,
        value: amount,
        formattedValue: amount,
        tokenSymbol: stablecoin,
        title: `Borrow ${stablecoin}`,
        description: `Borrowing ${amount} ${stablecoin} against collateral`,
        isPending: false,
        isConfirmed: true,
      });
    } catch (error) {
      console.error("Borrow failed:", error);
      throw error;
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
