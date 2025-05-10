import { useEffect, useState } from "react";
import { providers, Contract, utils } from "ethers";
import { WalletClient } from "viem";
import { BigNumber } from "ethers";
import { CHAIN_CONFIGS } from "@/config/chain";

interface UseAaveProps {
  chainId?: number;
}

interface ContractABI {
  inputs?: { internalType: string; name: string; type: string }[];
  outputs?: { internalType: string; name: string; type: string }[];
  stateMutability?: string;
  type: string;
  name?: string;
}

export function useAave({ chainId = 10200 }: UseAaveProps = {}) {
  const [provider, setProvider] = useState<providers.JsonRpcProvider | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initializeProvider() {
      try {
        const chainConfig = CHAIN_CONFIGS[chainId];
        if (!chainConfig) {
          throw new Error(`Chain ID ${chainId} not supported`);
        }

        // Initialize provider
        const provider = new providers.JsonRpcProvider(chainConfig.rpcUrl);
        setProvider(provider);

        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error("Failed to initialize provider:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setIsInitialized(false);
      }
    }

    initializeProvider();
  }, [chainId]);

  const getContractWithSigner = (
    walletClient: WalletClient,
    address: string,
    abi: ContractABI[]
  ) => {
    if (!provider) throw new Error("Provider not initialized");

    // Create Web3Provider from walletClient's transport
    const web3Provider = new providers.Web3Provider(
      walletClient.transport as unknown as providers.ExternalProvider
    );
    const signer = web3Provider.getSigner();

    return new Contract(address, abi, signer);
  };

  const mintTokens = async (walletClient: WalletClient) => {
    if (!provider || !isInitialized) {
      throw new Error("Provider not initialized");
    }

    if (!walletClient.account) {
      throw new Error("Wallet client not connected");
    }

    try {
      const chainConfig = CHAIN_CONFIGS[chainId];
      if (!chainConfig) {
        throw new Error(`Chain ID ${chainId} not supported`);
      }

      const amount = utils.parseEther("1000");
      const userAddress = walletClient.account.address;

      // Initialize wstETH contract with signer
      const wstETH = getContractWithSigner(
        walletClient,
        chainConfig.wstETHAddress,
        [
          {
            type: "function",
            name: "approve",
            inputs: [
              { name: "spender", type: "address", internalType: "address" },
              { name: "amount", type: "uint256", internalType: "uint256" },
            ],
            outputs: [{ name: "", type: "bool", internalType: "bool" }],
            stateMutability: "nonpayable",
          },
          {
            type: "function",
            name: "mint",
            inputs: [
              { name: "to", type: "address", internalType: "address" },
              { name: "amount", type: "uint256", internalType: "uint256" },
            ],
            outputs: [],
            stateMutability: "nonpayable",
          },
          {
            type: "function",
            name: "balanceOf",
            inputs: [
              { name: "account", type: "address", internalType: "address" },
            ],
            outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
            stateMutability: "view",
          },
          {
            type: "function",
            name: "allowance",
            inputs: [
              { name: "owner", type: "address", internalType: "address" },
              { name: "spender", type: "address", internalType: "address" },
            ],
            outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
            stateMutability: "view",
          },
        ]
      );

      // Mint wstETH only
      const wstETHTx = await wstETH.mint(userAddress, amount);
      await Promise.race([
        wstETHTx.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Transaction timeout")), 30000)
        ),
      ]);

      return true;
    } catch (error) {
      console.error("Minting failed:", error);
      if (error instanceof Error) {
        if (error.message.includes("revert")) {
          throw new Error("Transaction failed. Please try again.");
        } else if (error.message.includes("timeout")) {
          throw new Error("Transaction timed out. Please try again.");
        }
      }
      throw error;
    }
  };

  const deposit = async (
    amount: string,
    asset: "wstETH",
    walletClient: WalletClient
  ) => {
    if (!provider || !isInitialized) {
      throw new Error("Provider not initialized");
    }

    if (!walletClient.account) {
      throw new Error("Wallet client not connected");
    }

    try {
      const chainConfig = CHAIN_CONFIGS[chainId];
      if (!chainConfig) {
        throw new Error(`Chain ID ${chainId} not supported`);
      }

      const amountWei = utils.parseEther(amount);
      const userAddress = walletClient.account.address;

      // Initialize contracts with signer
      const wstETH = getContractWithSigner(
        walletClient,
        chainConfig.wstETHAddress,
        [
          {
            type: "function",
            name: "approve",
            inputs: [
              { name: "spender", type: "address", internalType: "address" },
              { name: "amount", type: "uint256", internalType: "uint256" },
            ],
            outputs: [{ name: "", type: "bool", internalType: "bool" }],
            stateMutability: "nonpayable",
          },
          {
            type: "function",
            name: "balanceOf",
            inputs: [
              { name: "account", type: "address", internalType: "address" },
            ],
            outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
            stateMutability: "view",
          },
          {
            type: "function",
            name: "allowance",
            inputs: [
              { name: "owner", type: "address", internalType: "address" },
              { name: "spender", type: "address", internalType: "address" },
            ],
            outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
            stateMutability: "view",
          },
        ]
      );

      const lendingPool = getContractWithSigner(
        walletClient,
        chainConfig.lendingPoolAddress,
        [
          {
            type: "function",
            name: "deposit",
            inputs: [
              { name: "asset", type: "address", internalType: "address" },
              { name: "amount", type: "uint256", internalType: "uint256" },
            ],
            outputs: [],
            stateMutability: "nonpayable",
          },
          {
            type: "function",
            name: "getUserCollateral",
            inputs: [
              { name: "user", type: "address", internalType: "address" },
            ],
            outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
            stateMutability: "view",
          },
        ]
      );

      // Check user balance
      const balance = await wstETH.balanceOf(userAddress);
      if (balance.lt(amountWei)) {
        throw new Error(
          `Insufficient ${asset} balance. Please mint more tokens first.`
        );
      }

      // Check allowance
      const allowance = await wstETH.allowance(
        userAddress,
        lendingPool.address
      );
      if (allowance.lt(amountWei)) {
        // Approve lending pool to spend wstETH
        const approveTx = await wstETH.approve(lendingPool.address, amountWei);
        await Promise.race([
          approveTx.wait(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Approve transaction timeout")),
              30000
            )
          ),
        ]);
      }

      // Deposit wstETH
      const depositTx = await lendingPool.deposit(wstETH.address, amountWei);
      await Promise.race([
        depositTx.wait(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Deposit transaction timeout")),
            30000
          )
        ),
      ]);

      return true;
    } catch (error) {
      console.error("Deposit failed:", error);
      if (error instanceof Error) {
        if (error.message.includes("Only wstETH accepted as collateral")) {
          throw new Error("Only wstETH can be used as collateral");
        } else if (error.message.includes("insufficient balance")) {
          throw new Error(
            `Insufficient ${asset} balance. Please mint more tokens first.`
          );
        } else if (error.message.includes("insufficient allowance")) {
          throw new Error(
            "Insufficient allowance. Please approve the contract first."
          );
        } else if (error.message.includes("revert")) {
          throw new Error("Transaction failed. Please try again.");
        } else if (error.message.includes("timeout")) {
          throw new Error("Transaction timed out. Please try again.");
        }
      }
      throw error;
    }
  };

  const borrow = async (
    amount: string,
    asset: "USDC" | "EURe",
    walletClient: WalletClient
  ) => {
    console.log("🔥 useAave.borrow() triggered");

    if (!provider || !isInitialized) {
      throw new Error("Provider not initialized");
    }

    if (!walletClient.account) {
      throw new Error("Wallet client not connected");
    }

    try {
      const chainConfig = CHAIN_CONFIGS[chainId];
      if (!chainConfig) {
        throw new Error(`Chain ID ${chainId} not supported`);
      }

      const amountWei = utils.parseEther(amount);
      const userAddress = walletClient.account.address;

      // Initialize lending pool contract
      const lendingPool = getContractWithSigner(
        walletClient,
        chainConfig.lendingPoolAddress,
        [
          {
            type: "function",
            name: "borrow",
            inputs: [
              { name: "stablecoin", type: "address", internalType: "address" },
              { name: "amount", type: "uint256", internalType: "uint256" },
            ],
            outputs: [],
            stateMutability: "nonpayable",
          },
          {
            type: "function",
            name: "getUserCollateral",
            inputs: [
              { name: "user", type: "address", internalType: "address" },
            ],
            outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
            stateMutability: "view",
          },
          {
            type: "function",
            name: "getUserBorrowed",
            inputs: [
              { name: "user", type: "address", internalType: "address" },
              { name: "token", type: "address", internalType: "address" },
            ],
            outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
            stateMutability: "view",
          },
        ]
      );

      // Get stablecoin addresses
      const stablecoinAddress =
        asset === "USDC"
          ? chainConfig.stablecoinAddresses.USDC
          : chainConfig.stablecoinAddresses.EURe;

      console.log("stablecoinAddress:", stablecoinAddress);
      console.log("userAddress:", userAddress);

      // Check user's current borrow status
      const borrowedEure = await lendingPool.getUserBorrowed(
        userAddress,
        chainConfig.stablecoinAddresses.EURe
      );
      const borrowedUsdc = await lendingPool.getUserBorrowed(
        userAddress,
        chainConfig.stablecoinAddresses.USDC
      );
      const totalBorrowed = borrowedEure.add(borrowedUsdc);

      // Get collateral
      const collateral = await lendingPool.getUserCollateral(userAddress);

      // Calculate health factor (with 80% LTV and 1.2 minimum health threshold)
      const healthFactor = collateral.gt(0)
        ? collateral
            .mul(utils.parseEther("0.8"))
            .div(totalBorrowed.add(amountWei))
        : BigNumber.from(0);

      console.log("collateral:", utils.formatEther(collateral));
      console.log("totalBorrowed:", utils.formatEther(totalBorrowed));
      console.log("healthFactor:", utils.formatEther(healthFactor));

      if (healthFactor.lt(utils.parseEther("1.2"))) {
        throw new Error(
          "Health factor too low. Please deposit more collateral first."
        );
      }

      // Send borrow transaction
      const borrowTx = await lendingPool.borrow(stablecoinAddress, amountWei);
      console.log("📤 borrowTx sent:", borrowTx.hash);

      await Promise.race([
        borrowTx.wait(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Borrow transaction timeout")),
            30000
          )
        ),
      ]);

      console.log("✅ Transaction confirmed:", borrowTx.hash);

      return true;
    } catch (error) {
      console.error("Borrow failed:", error);
      if (error instanceof Error) {
        if (error.message.includes("insufficient collateral")) {
          throw new Error(
            "Insufficient collateral. Please deposit more first."
          );
        } else if (error.message.includes("health factor")) {
          throw new Error(
            "Health factor too low. Please deposit more collateral first."
          );
        } else if (error.message.includes("revert")) {
          throw new Error("Transaction failed. Please try again.");
        } else if (error.message.includes("timeout")) {
          throw new Error("Transaction timed out. Please try again.");
        }
      }
      throw error;
    }
  };

  return {
    provider,
    error,
    isInitialized,
    mintTokens,
    deposit,
    borrow,
  };
}
