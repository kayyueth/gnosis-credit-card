import { useEffect, useState } from "react";
import { providers, Contract, utils } from "ethers";
import { WalletClient } from "viem";

interface ChainConfig {
  chainId: number;
  wstETHAddress: string;
  stablecoinAddresses: {
    USDC: string;
    EURe: string;
  };
  lendingPoolAddress: string;
}

// MockWstETH
const MOCK_WSTETH_ADDRESS = "0x9fa52f7c3a19a066a9b7f2ebca4bc6340366518f";

// MockStablecoin
const MOCK_STABLECOIN_ADDRESS_USDC =
  "0x969a2c1c858da82fb48627df8f5726c1fe0a2e94";
const MOCK_STABLECOIN_ADDRESS_EURe =
  "0x137e7a3c32993cd0c15dfdf3020875322da145cd";

// MockLendingPool
const MOCK_LENDING_POOL_ADDRESS = "0x9e1d0359028c1892c892bbe90aa11a79cc6f61f9";

// Gnosis Chiado Testnet
const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  10200: {
    chainId: 10200,
    wstETHAddress: MOCK_WSTETH_ADDRESS,
    stablecoinAddresses: {
      USDC: MOCK_STABLECOIN_ADDRESS_USDC,
      EURe: MOCK_STABLECOIN_ADDRESS_EURe,
    },
    lendingPoolAddress: MOCK_LENDING_POOL_ADDRESS,
  },
};

interface UseAaveProps {
  chainId?: number;
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
        const provider = new providers.JsonRpcProvider(
          "https://rpc.chiadochain.net"
        );
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
    abi: any[]
  ) => {
    if (!provider) throw new Error("Provider not initialized");

    // Create Web3Provider from walletClient's transport
    const web3Provider = new providers.Web3Provider(
      (walletClient as any).transport
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
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function mint(address to, uint256 amount) public",
          "function balanceOf(address account) external view returns (uint256)",
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
      throw error;
    }
  };

  const deposit = async (
    amount: string,
    asset: "ETH" | "wstETH",
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
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function balanceOf(address account) external view returns (uint256)",
        ]
      );

      const lendingPool = getContractWithSigner(
        walletClient,
        chainConfig.lendingPoolAddress,
        [
          "function deposit(address asset, uint256 amount) external",
          "function borrow(uint256 amount) external",
          "function getUserCollateral(address user) external view returns (uint256)",
          "function getUserBorrowed(address user) external view returns (uint256)",
        ]
      );

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
      throw error;
    }
  };

  const borrow = async (
    amount: string,
    asset: "USDC" | "EURe",
    walletClient: WalletClient,
    maxLTV: number = 0.5
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

      // Initialize lending pool with signer
      const lendingPool = getContractWithSigner(
        walletClient,
        chainConfig.lendingPoolAddress,
        [
          "function deposit(address asset, uint256 amount) external",
          "function borrow(uint256 amount) external",
          "function getUserCollateral(address user) external view returns (uint256)",
          "function getUserBorrowed(address user) external view returns (uint256)",
        ]
      );

      // Borrow stablecoin
      const borrowTx = await lendingPool.borrow(amountWei);
      await Promise.race([
        borrowTx.wait(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Borrow transaction timeout")),
            30000
          )
        ),
      ]);

      return true;
    } catch (error) {
      console.error("Borrow failed:", error);
      if (error instanceof Error) {
        throw new Error(`Borrow failed: ${error.message}`);
      }
      throw new Error("Borrow failed: Unknown error");
    }
  };

  return {
    provider,
    error,
    isInitialized,
    deposit,
    borrow,
    mintTokens,
  };
}
