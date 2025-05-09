import { useEffect, useState } from "react";
import { providers, Contract, utils } from "ethers";
import {
  UiPoolDataProvider,
  UiIncentiveDataProvider,
  ChainId,
  LendingPool,
} from "@aave/contract-helpers";
import { WalletClient } from "viem";

interface ChainConfig {
  chainId: number;
  poolDataProviderAddress: string;
  incentiveDataProviderAddress: string;
  lendingPoolAddressProvider: string;
  wstETHAddress: string;
}

// Gnosis Chain ID is 100
const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  100: {
    chainId: 100,
    poolDataProviderAddress: "0x9441B65EE553F70df9C77d45d3283B6BC24F222d",
    incentiveDataProviderAddress: "0x929EC64c34a17401F460460D4B9390518E5B473e",
    lendingPoolAddressProvider: "0xc3301b30dadefcf1905d512ab4f2c3eab5a75ccf",
    wstETHAddress: "0x6C76971f98945AE98dD7d4DFcA8711ebea946eA6",
  },
  // Add more chains as needed
};

interface AaveError extends Error {
  code?: string | number;
  data?: unknown;
  transaction?: unknown;
}

interface UseAaveProps {
  chainId?: number;
}

export function useAave({ chainId = 100 }: UseAaveProps = {}) {
  const [provider, setProvider] = useState<providers.JsonRpcProvider | null>(
    null
  );
  const [poolDataProvider, setPoolDataProvider] =
    useState<UiPoolDataProvider | null>(null);
  const [incentiveDataProvider, setIncentiveDataProvider] =
    useState<UiIncentiveDataProvider | null>(null);
  const [lendingPool, setLendingPool] = useState<LendingPool | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initializeAave() {
      try {
        const chainConfig = CHAIN_CONFIGS[chainId];
        if (!chainConfig) {
          throw new Error(`Chain ID ${chainId} not supported`);
        }

        // Initialize provider
        const provider = new providers.JsonRpcProvider(
          "https://rpc.gnosischain.com"
        );
        setProvider(provider);

        // Initialize pool data provider
        const poolDataProvider = new UiPoolDataProvider({
          uiPoolDataProviderAddress: chainConfig.poolDataProviderAddress,
          provider,
          chainId: chainConfig.chainId,
        });
        setPoolDataProvider(poolDataProvider);

        // Initialize incentive data provider
        const incentiveDataProvider = new UiIncentiveDataProvider({
          uiIncentiveDataProviderAddress:
            chainConfig.incentiveDataProviderAddress,
          provider,
          chainId: chainConfig.chainId,
        });
        setIncentiveDataProvider(incentiveDataProvider);

        // Initialize LendingPool contract
        const lendingPool = new LendingPool(provider, {
          LENDING_POOL: chainConfig.lendingPoolAddressProvider,
        });
        setLendingPool(lendingPool);

        // Test connection
        await provider.getNetwork();
        console.log("Successfully connected to Aave on chain", chainId);
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.error("Failed to initialize Aave:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setIsInitialized(false);
      }
    }

    initializeAave();
  }, [chainId]);

  const deposit = async (
    amount: string,
    asset: "ETH" | "wstETH",
    walletClient: WalletClient
  ) => {
    if (!lendingPool || !provider || !isInitialized) {
      throw new Error("Aave not initialized");
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
      const transactions = [];

      if (asset === "ETH") {
        // For ETH deposits, we need to use the special depositETH function
        const tx = await lendingPool.deposit({
          user: userAddress,
          reserve: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // ETH address
          amount: amountWei.toString(),
          onBehalfOf: userAddress,
          referralCode: "0",
        });
        transactions.push(tx);
      } else {
        // For wstETH deposits, we need to approve the lending pool first
        const wstETHContract = new Contract(
          chainConfig.wstETHAddress,
          [
            "function approve(address spender, uint256 amount) external returns (bool)",
          ],
          provider
        );

        // Get the lending pool address from the config
        const lendingPoolAddress = chainConfig.lendingPoolAddressProvider;

        // Approve the lending pool to spend wstETH
        const approveTx = await wstETHContract.approve(
          lendingPoolAddress,
          amountWei
        );
        transactions.push(approveTx);

        // Then deposit the wstETH
        const depositTx = await lendingPool.deposit({
          user: userAddress,
          reserve: chainConfig.wstETHAddress,
          amount: amountWei.toString(),
          onBehalfOf: userAddress,
          referralCode: "0",
        });
        transactions.push(depositTx);
      }

      return transactions;
    } catch (error) {
      console.error("Deposit failed:", error);
      throw error;
    }
  };

  return {
    provider,
    poolDataProvider,
    incentiveDataProvider,
    lendingPool,
    error,
    isInitialized,
    deposit,
  };
}
