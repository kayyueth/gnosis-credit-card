"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { CHAIN_CONFIGS } from "@/config/chain";

// Default to Gnosis Chiado testnet
const DEFAULT_CHAIN_ID = 10200;
const { stablecoinAddresses } = CHAIN_CONFIGS[DEFAULT_CHAIN_ID];

// Contract addresses
const LENDING_POOL_ADDRESS = "0xF1D00F6c7E7Fc7Eda00fCe95583b8d6DD4716572";

// ERC20 interface for token transfers
const erc20Interface = new ethers.utils.Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 value) returns (bool)",
]);

// Lending pool interface for borrowing/depositing
const lendingPoolInterface = new ethers.utils.Interface([
  "event Deposit(address indexed user, address indexed asset, uint256 amount)",
  "event Borrow(address indexed user, address indexed asset, uint256 amount)",
]);

// Define a type for transaction sources
export type TransactionSource = "safe" | "wallet";

export interface Transaction {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  tokenAddress: string;
  tokenSymbol: string;
  value: string;
  formattedValue: string;
  type: "incoming" | "outgoing";
  action?: string; // To store transaction type: "Deposit", "Borrow", "Approval", "Spend"
  source: TransactionSource; // Indicates whether this transaction came from the safe or wallet
}

interface UseSafeTransactionsProps {
  safeAddress?: string;
  chainId?: number;
  skipInitialFetch?: boolean;
}

// Create a cache for transactions to improve performance
const txCache = new Map<
  string,
  { transactions: Transaction[]; timestamp: number }
>();
const CACHE_EXPIRY = 300000; // Increase cache expiry to 5 minutes (was 30 seconds)

// Define event types
interface TransferEvent {
  blockNumber: number;
  transactionHash: string;
  args: {
    from: string;
    to: string;
    value: ethers.BigNumber;
  };
}

interface ApprovalEvent {
  blockNumber: number;
  transactionHash: string;
  args: {
    owner: string;
    spender: string;
    value: ethers.BigNumber;
  };
}

interface LendingEvent {
  blockNumber: number;
  transactionHash: string;
  args: {
    user: string;
    asset: string;
    amount: ethers.BigNumber;
  };
}

export function useSafeTransactions({
  safeAddress = "",
  chainId = DEFAULT_CHAIN_ID,
  skipInitialFetch = false,
}: UseSafeTransactionsProps = {}) {
  const { address: walletAddress } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] =
    useState<ethers.providers.JsonRpcProvider | null>(null);

  // Initialize provider
  useEffect(() => {
    const initProvider = async () => {
      try {
        const chainConfig = CHAIN_CONFIGS[chainId];
        if (!chainConfig) {
          throw new Error(`Chain ID ${chainId} not supported`);
        }

        const newProvider = new ethers.providers.JsonRpcProvider(
          chainConfig.rpcUrl
        );
        await newProvider.ready;
        setProvider(newProvider);
      } catch (err) {
        console.error("Failed to initialize provider:", err);
        setError("Failed to initialize blockchain connection");
        setIsLoading(false);
      }
    };

    initProvider();
    return () => {
      // Cleanup listeners if needed
    };
  }, [chainId]);

  // Helper to process batches of events
  const processEventsBatch = async <
    T,
    E extends TransferEvent | ApprovalEvent | LendingEvent,
    A extends unknown[]
  >(
    events: E[],
    processFn: (event: E, ...args: A) => Promise<T>,
    ...args: A
  ) => {
    const results: T[] = [];
    for (const event of events) {
      try {
        const result = await processFn(event, ...args);
        results.push(result);
      } catch (error) {
        console.error("Error processing event:", error);
      }
    }
    return results;
  };

  // Process approval events
  const processApprovalEvent = async (
    event: ApprovalEvent,
    tokenAddress: string,
    symbol: string,
    decimals: number
  ): Promise<Transaction> => {
    const block = await provider!.getBlock(event.blockNumber);
    const txHash = event.transactionHash;

    const source: TransactionSource =
      event.args.owner.toLowerCase() === safeAddress.toLowerCase()
        ? "safe"
        : "wallet";

    return {
      id: txHash,
      timestamp: block.timestamp * 1000,
      from: event.args.owner,
      to: event.args.spender,
      tokenAddress,
      tokenSymbol: symbol,
      value: event.args.value.toString(),
      formattedValue: ethers.utils.formatUnits(event.args.value, decimals),
      type: "outgoing",
      action: "Approval",
      source,
    };
  };

  // Process lending events (deposits and borrows)
  const processLendingEvent = async (
    event: LendingEvent,
    action: "Deposit" | "Borrow"
  ): Promise<Transaction> => {
    const block = await provider!.getBlock(event.blockNumber);
    const txHash = event.transactionHash;
    const { user, asset, amount } = event.args;

    // Get token details
    const tokenContract = new ethers.Contract(asset, erc20Interface, provider!);
    const [symbol, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.decimals(),
    ]);

    const source: TransactionSource =
      user.toLowerCase() === safeAddress.toLowerCase() ? "safe" : "wallet";

    const type: "incoming" | "outgoing" =
      action === "Deposit" ? "outgoing" : "incoming";

    return {
      id: txHash,
      timestamp: block.timestamp * 1000,
      from: action === "Deposit" ? user : LENDING_POOL_ADDRESS,
      to: action === "Deposit" ? LENDING_POOL_ADDRESS : user,
      tokenAddress: asset,
      tokenSymbol: symbol,
      value: amount.toString(),
      formattedValue: ethers.utils.formatUnits(amount, decimals),
      type,
      action,
      source,
    };
  };

  // Fetch token events for a specified address (safe or wallet)
  const fetchTokenEventsForAddress = useCallback(
    async (targetAddress: string, addressType: TransactionSource) => {
      if (!provider || !targetAddress) return [];

      try {
        console.log(
          `Fetching token events for ${addressType} address:`,
          targetAddress
        );

        // === Setup contracts ===
        const usdcContract = new ethers.Contract(
          stablecoinAddresses.USDC,
          erc20Interface,
          provider
        );
        const eureContract = new ethers.Contract(
          stablecoinAddresses.EURe,
          erc20Interface,
          provider
        );
        const wstETHAddress = "0x9fa52f7c3a19a066a9b7f2EBCA4BC6340366518F";
        const wstETHContract = new ethers.Contract(
          wstETHAddress,
          erc20Interface,
          provider
        );

        const lendingPoolAddress = "0xF1D00F6c7E7Fc7Eda00fCe95583b8d6DD4716572";
        const lendingPoolContract = new ethers.Contract(
          lendingPoolAddress,
          lendingPoolInterface,
          provider
        );

        const [
          usdcSymbol,
          eureSymbol,
          wstETHSymbol,
          usdcDecimals,
          eureDecimals,
          wstETHDecimals,
        ] = await Promise.all([
          usdcContract.symbol(),
          eureContract.symbol(),
          wstETHContract.symbol(),
          usdcContract.decimals(),
          eureContract.decimals(),
          wstETHContract.decimals(),
        ]);

        // === Define block range ===
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 10000); // Past ~3 days

        // === ERC20 Transfer Events ===
        const safeIncomingUsdcFilter = usdcContract.filters.Transfer(
          null,
          targetAddress
        );
        const safeOutgoingUsdcFilter = usdcContract.filters.Transfer(
          targetAddress,
          null
        );
        const safeIncomingEureFilter = eureContract.filters.Transfer(
          null,
          targetAddress
        );
        const safeOutgoingEureFilter = eureContract.filters.Transfer(
          targetAddress,
          null
        );
        const safeIncomingWstETHFilter = wstETHContract.filters.Transfer(
          null,
          targetAddress
        );
        const safeOutgoingWstETHFilter = wstETHContract.filters.Transfer(
          targetAddress,
          null
        );

        // === Lending Events ===
        const safeDepositFilter = lendingPoolContract.filters.Deposit(
          targetAddress,
          null
        );
        const safeBorrowFilter = lendingPoolContract.filters.Borrow(
          targetAddress,
          null
        );

        // === Fetch events ===
        const [
          incomingUsdcEvents,
          outgoingUsdcEvents,
          incomingEureEvents,
          outgoingEureEvents,
          incomingWstETHEvents,
          outgoingWstETHEvents,
          usdcApprovalEvents,
          eureApprovalEvents,
          wstETHApprovalEvents,
          depositEvents,
          borrowEvents,
        ] = await Promise.all([
          usdcContract.queryFilter(
            safeIncomingUsdcFilter,
            fromBlock
          ) as unknown as Promise<TransferEvent[]>,
          usdcContract.queryFilter(
            safeOutgoingUsdcFilter,
            fromBlock
          ) as unknown as Promise<TransferEvent[]>,
          eureContract.queryFilter(
            safeIncomingEureFilter,
            fromBlock
          ) as unknown as Promise<TransferEvent[]>,
          eureContract.queryFilter(
            safeOutgoingEureFilter,
            fromBlock
          ) as unknown as Promise<TransferEvent[]>,
          wstETHContract.queryFilter(
            safeIncomingWstETHFilter,
            fromBlock
          ) as unknown as Promise<TransferEvent[]>,
          wstETHContract.queryFilter(
            safeOutgoingWstETHFilter,
            fromBlock
          ) as unknown as Promise<TransferEvent[]>,
          usdcContract.queryFilter(
            usdcContract.filters.Approval(targetAddress, null),
            fromBlock
          ) as unknown as Promise<ApprovalEvent[]>,
          eureContract.queryFilter(
            eureContract.filters.Approval(targetAddress, null),
            fromBlock
          ) as unknown as Promise<ApprovalEvent[]>,
          wstETHContract.queryFilter(
            wstETHContract.filters.Approval(targetAddress, null),
            fromBlock
          ) as unknown as Promise<ApprovalEvent[]>,
          lendingPoolContract.queryFilter(
            safeDepositFilter,
            fromBlock
          ) as unknown as Promise<LendingEvent[]>,
          lendingPoolContract.queryFilter(
            safeBorrowFilter,
            fromBlock
          ) as unknown as Promise<LendingEvent[]>,
        ]);

        console.log(`Found token events for ${addressType}:`, {
          incomingUsdc: incomingUsdcEvents.length,
          outgoingUsdc: outgoingUsdcEvents.length,
          incomingEure: incomingEureEvents.length,
          outgoingEure: outgoingEureEvents.length,
          incomingWstETH: incomingWstETHEvents.length,
          outgoingWstETH: outgoingWstETHEvents.length,
          usdcApprovals: usdcApprovalEvents.length,
          eureApprovals: eureApprovalEvents.length,
          wstETHApprovals: wstETHApprovalEvents.length,
          depositEvents: depositEvents.length,
          borrowEvents: borrowEvents.length,
        });

        // === Helpers ===
        const processTransferEvent = async (
          event: TransferEvent,
          tokenAddress: string,
          symbol: string,
          decimals: number,
          type: "incoming" | "outgoing"
        ): Promise<Transaction> => {
          const block = await provider.getBlock(event.blockNumber);
          const txHash = event.transactionHash;
          const tx = await provider.getTransaction(txHash);

          let action = type === "incoming" ? "Deposit" : "Spend";
          const lendingPool = lendingPoolAddress.toLowerCase();
          if (
            tx.to?.toLowerCase() === lendingPool ||
            tx.from?.toLowerCase() === lendingPool
          ) {
            action = type === "incoming" ? "Borrow" : "Deposit";
          }

          const opposite = addressType === "safe" ? walletAddress : safeAddress;
          if (opposite) {
            const isBetween =
              (type === "incoming" &&
                event.args.from.toLowerCase() === opposite.toLowerCase()) ||
              (type === "outgoing" &&
                event.args.to.toLowerCase() === opposite.toLowerCase());
            if (isBetween) {
              action = addressType === "safe" ? "Received" : "Sent to Safe";
            }
          }

          return {
            id: txHash,
            timestamp: block.timestamp * 1000,
            from: event.args.from,
            to: event.args.to,
            tokenAddress,
            tokenSymbol: symbol,
            value: event.args.value.toString(),
            formattedValue: ethers.utils.formatUnits(
              event.args.value,
              decimals
            ),
            type,
            action,
            source: addressType,
          };
        };

        // Process all events
        const [
          incomingUsdcTxs,
          outgoingUsdcTxs,
          incomingEureTxs,
          outgoingEureTxs,
          incomingWstETHTxs,
          outgoingWstETHTxs,
          usdcApprovalTxs,
          eureApprovalTxs,
          wstETHApprovalTxs,
          depositTxs,
          borrowTxs,
        ] = await Promise.all([
          processEventsBatch(
            incomingUsdcEvents,
            processTransferEvent,
            stablecoinAddresses.USDC,
            usdcSymbol,
            usdcDecimals,
            "incoming"
          ),
          processEventsBatch(
            outgoingUsdcEvents,
            processTransferEvent,
            stablecoinAddresses.USDC,
            usdcSymbol,
            usdcDecimals,
            "outgoing"
          ),
          processEventsBatch(
            incomingEureEvents,
            processTransferEvent,
            stablecoinAddresses.EURe,
            eureSymbol,
            eureDecimals,
            "incoming"
          ),
          processEventsBatch(
            outgoingEureEvents,
            processTransferEvent,
            stablecoinAddresses.EURe,
            eureSymbol,
            eureDecimals,
            "outgoing"
          ),
          processEventsBatch(
            incomingWstETHEvents,
            processTransferEvent,
            wstETHAddress,
            wstETHSymbol,
            wstETHDecimals,
            "incoming"
          ),
          processEventsBatch(
            outgoingWstETHEvents,
            processTransferEvent,
            wstETHAddress,
            wstETHSymbol,
            wstETHDecimals,
            "outgoing"
          ),
          processEventsBatch(
            usdcApprovalEvents,
            processApprovalEvent,
            stablecoinAddresses.USDC,
            usdcSymbol,
            usdcDecimals
          ),
          processEventsBatch(
            eureApprovalEvents,
            processApprovalEvent,
            stablecoinAddresses.EURe,
            eureSymbol,
            eureDecimals
          ),
          processEventsBatch(
            wstETHApprovalEvents,
            processApprovalEvent,
            wstETHAddress,
            wstETHSymbol,
            wstETHDecimals
          ),
          processEventsBatch(depositEvents, processLendingEvent, "Deposit"),
          processEventsBatch(borrowEvents, processLendingEvent, "Borrow"),
        ]);

        // Combine all transactions
        const allTransactions = [
          ...incomingUsdcTxs,
          ...outgoingUsdcTxs,
          ...incomingEureTxs,
          ...outgoingEureTxs,
          ...incomingWstETHTxs,
          ...outgoingWstETHTxs,
          ...usdcApprovalTxs,
          ...eureApprovalTxs,
          ...wstETHApprovalTxs,
          ...depositTxs,
          ...borrowTxs,
        ];

        return allTransactions;
      } catch (error) {
        console.error("Error fetching token events:", error);
        return [];
      }
    },
    [
      provider,
      safeAddress,
      walletAddress,
      processApprovalEvent,
      processLendingEvent,
    ]
  );

  // Fetch token events for both safe and wallet addresses
  const fetchTokenEvents = useCallback(async () => {
    if (!provider || !safeAddress) return [];

    const addresses: Array<{ address: string; type: TransactionSource }> = [
      { address: safeAddress, type: "safe" },
    ];

    // Add wallet address if it exists and is different from safe address
    if (
      walletAddress &&
      walletAddress.toLowerCase() !== safeAddress.toLowerCase()
    ) {
      addresses.push({ address: walletAddress, type: "wallet" });
    }

    try {
      // Fetch events for all addresses
      const allEventsPromises = addresses.map(({ address, type }) =>
        fetchTokenEventsForAddress(address, type)
      );

      const allEvents = await Promise.all(allEventsPromises);

      // Combine and return all events
      return allEvents.flat();
    } catch (err) {
      console.error("Failed to fetch token events:", err);
      throw err;
    }
  }, [provider, safeAddress, walletAddress, fetchTokenEventsForAddress]);

  // Fetch all transactions
  const fetchTransactions = useCallback(async () => {
    if (!provider) {
      setError("Provider not initialized");
      return;
    }

    if (!safeAddress) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Create a cache key that includes both addresses if wallet address exists
    const walletPart = walletAddress ? `-${walletAddress}` : "";
    const cacheKey = `${safeAddress}${walletPart}-${chainId}`;
    const cachedData = txCache.get(cacheKey);

    // Use cached data if available and not expired
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
      setTransactions(cachedData.transactions);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch token events (transfers, approvals) for both addresses
      const tokenEvents = await fetchTokenEvents();

      console.log(`Found ${tokenEvents.length} total transactions`);

      // Sort by timestamp (newest first)
      tokenEvents.sort((a, b) => b.timestamp - a.timestamp);

      // Update the cache
      txCache.set(cacheKey, {
        transactions: tokenEvents,
        timestamp: Date.now(),
      });

      setTransactions(tokenEvents);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setError("Failed to fetch transaction history");
    } finally {
      setIsLoading(false);
    }
  }, [provider, safeAddress, walletAddress, chainId, fetchTokenEvents]);

  // Fetch transactions on mount or when dependencies change
  useEffect(() => {
    if (skipInitialFetch || !provider) return;

    if (!safeAddress) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    // Use the cache if available and not expired
    const cacheKey = `${safeAddress}-${chainId}`;
    const cachedData = txCache.get(cacheKey);
    const now = Date.now();

    if (
      cachedData &&
      cachedData.timestamp + CACHE_EXPIRY > now &&
      cachedData.transactions.length > 0
    ) {
      setTransactions(cachedData.transactions);
      setIsLoading(false);
      return;
    }

    fetchTransactions();
  }, [provider, safeAddress, chainId, skipInitialFetch, fetchTransactions]);

  // Set up event listeners for real-time updates
  useEffect(() => {
    if (!provider || !safeAddress) return;

    try {
      const usdcContract = new ethers.Contract(
        stablecoinAddresses.USDC,
        erc20Interface,
        provider
      );

      const eureContract = new ethers.Contract(
        stablecoinAddresses.EURe,
        erc20Interface,
        provider
      );

      const wstETHAddress = "0x9fa52f7c3a19a066a9b7f2EBCA4BC6340366518F";
      const wstETHContract = new ethers.Contract(
        wstETHAddress,
        erc20Interface,
        provider
      );

      // Create filters for the Safe address
      const safeIncomingUsdcFilter = usdcContract.filters.Transfer(
        null,
        safeAddress
      );
      const safeOutgoingUsdcFilter = usdcContract.filters.Transfer(
        safeAddress,
        null
      );
      const safeIncomingEureFilter = eureContract.filters.Transfer(
        null,
        safeAddress
      );
      const safeOutgoingEureFilter = eureContract.filters.Transfer(
        safeAddress,
        null
      );
      const safeIncomingWstETHFilter = wstETHContract.filters.Transfer(
        null,
        safeAddress
      );
      const safeOutgoingWstETHFilter = wstETHContract.filters.Transfer(
        safeAddress,
        null
      );

      // Create filters for the wallet address if it exists and is different
      const walletFilters: Array<{
        filter: ethers.EventFilter;
        contract: ethers.Contract;
        tokenAddress: string;
        isIncoming: boolean;
        source: TransactionSource;
      }> = [];
      if (
        walletAddress &&
        walletAddress.toLowerCase() !== safeAddress.toLowerCase()
      ) {
        walletFilters.push(
          {
            filter: usdcContract.filters.Transfer(null, walletAddress),
            contract: usdcContract,
            tokenAddress: stablecoinAddresses.USDC,
            isIncoming: true,
            source: "wallet",
          },
          {
            filter: usdcContract.filters.Transfer(walletAddress, null),
            contract: usdcContract,
            tokenAddress: stablecoinAddresses.USDC,
            isIncoming: false,
            source: "wallet",
          },
          {
            filter: eureContract.filters.Transfer(null, walletAddress),
            contract: eureContract,
            tokenAddress: stablecoinAddresses.EURe,
            isIncoming: true,
            source: "wallet",
          },
          {
            filter: eureContract.filters.Transfer(walletAddress, null),
            contract: eureContract,
            tokenAddress: stablecoinAddresses.EURe,
            isIncoming: false,
            source: "wallet",
          },
          {
            filter: wstETHContract.filters.Transfer(null, walletAddress),
            contract: wstETHContract,
            tokenAddress: wstETHAddress,
            isIncoming: true,
            source: "wallet",
          },
          {
            filter: wstETHContract.filters.Transfer(walletAddress, null),
            contract: wstETHContract,
            tokenAddress: wstETHAddress,
            isIncoming: false,
            source: "wallet",
          }
        );
      }

      // Handler function for incoming transfers
      const handleTransfer = async (
        from: string,
        to: string,
        value: ethers.BigNumber,
        event: ethers.Event,
        tokenAddress: string,
        isIncoming: boolean,
        source: TransactionSource = "safe"
      ) => {
        try {
          const tokenContract = new ethers.Contract(
            tokenAddress,
            erc20Interface,
            provider
          );

          const decimals = await tokenContract.decimals();
          const symbol = await tokenContract.symbol();
          const block = await provider.getBlock(event.blockNumber);
          const tx = await provider.getTransaction(event.transactionHash);

          // Try to determine if this is a deposit, borrow, or spend
          let action = isIncoming ? "Deposit" : "Spend";

          // If it's from or to a lending pool, it could be a deposit or borrow
          const lendingPoolAddressLower = LENDING_POOL_ADDRESS.toLowerCase();

          // Check if this is a deposit (outgoing to lending pool) or borrow (incoming from lending pool)
          if (tx.to?.toLowerCase() === lendingPoolAddressLower) {
            action = "Deposit";
          } else if (tx.from?.toLowerCase() === lendingPoolAddressLower) {
            action = "Borrow";
          }

          // Check if this is a transfer between safe and wallet
          const otherAddress = source === "safe" ? walletAddress : safeAddress;
          if (otherAddress) {
            const otherAddressLower = otherAddress.toLowerCase();
            const isTransferBetweenSafeAndWallet =
              (isIncoming && from.toLowerCase() === otherAddressLower) ||
              (!isIncoming && to.toLowerCase() === otherAddressLower);

            if (isTransferBetweenSafeAndWallet) {
              action = source === "safe" ? "Received" : "Sent to Safe";
            }
          }

          const newTx: Transaction = {
            id: event.transactionHash, // Use transaction hash as ID
            timestamp: block.timestamp * 1000,
            from,
            to,
            tokenAddress,
            tokenSymbol: symbol,
            value: value.toString(),
            formattedValue: ethers.utils.formatUnits(value, decimals),
            type: isIncoming ? "incoming" : "outgoing",
            action,
            source,
          };

          // Add the new transaction to the list
          setTransactions((prevTxs) => {
            // Check if transaction already exists
            const exists = prevTxs.some((tx) => tx.id === newTx.id);
            if (exists) return prevTxs;

            const updatedTxs = [newTx, ...prevTxs];

            // Update cache
            const walletPart = walletAddress ? `-${walletAddress}` : "";
            const cacheKey = `${safeAddress}${walletPart}-${chainId}`;
            txCache.set(cacheKey, {
              transactions: updatedTxs,
              timestamp: Date.now(),
            });

            return updatedTxs;
          });
        } catch (err) {
          console.error("Error processing transfer event:", err);
        }
      };

      // Set up event listeners for safe address
      usdcContract.on(safeIncomingUsdcFilter, (from, to, value, event) =>
        handleTransfer(
          from,
          to,
          value,
          event,
          stablecoinAddresses.USDC,
          true,
          "safe"
        )
      );
      usdcContract.on(safeOutgoingUsdcFilter, (from, to, value, event) =>
        handleTransfer(
          from,
          to,
          value,
          event,
          stablecoinAddresses.USDC,
          false,
          "safe"
        )
      );
      eureContract.on(safeIncomingEureFilter, (from, to, value, event) =>
        handleTransfer(
          from,
          to,
          value,
          event,
          stablecoinAddresses.EURe,
          true,
          "safe"
        )
      );
      eureContract.on(safeOutgoingEureFilter, (from, to, value, event) =>
        handleTransfer(
          from,
          to,
          value,
          event,
          stablecoinAddresses.EURe,
          false,
          "safe"
        )
      );
      wstETHContract.on(safeIncomingWstETHFilter, (from, to, value, event) =>
        handleTransfer(from, to, value, event, wstETHAddress, true, "safe")
      );
      wstETHContract.on(safeOutgoingWstETHFilter, (from, to, value, event) =>
        handleTransfer(from, to, value, event, wstETHAddress, false, "safe")
      );

      // Set up lending pool event listeners
      const lendingPoolContract = new ethers.Contract(
        LENDING_POOL_ADDRESS,
        lendingPoolInterface,
        provider
      );

      // Listen for deposit events
      lendingPoolContract.on(
        lendingPoolContract.filters.Deposit(safeAddress, null),
        async (user, asset, amount, event) => {
          try {
            const tokenContract = new ethers.Contract(
              asset,
              erc20Interface,
              provider
            );
            const decimals = await tokenContract.decimals();
            const symbol = await tokenContract.symbol();
            const block = await provider.getBlock(event.blockNumber);

            const newTx: Transaction = {
              id: event.transactionHash + "-deposit",
              timestamp: block.timestamp * 1000,
              from: user,
              to: LENDING_POOL_ADDRESS,
              tokenAddress: asset,
              tokenSymbol: symbol,
              value: amount.toString(),
              formattedValue: ethers.utils.formatUnits(amount, decimals),
              type: "outgoing",
              action: "Deposit",
              source: "safe",
            };

            setTransactions((prevTxs) => {
              const exists = prevTxs.some((tx) => tx.id === newTx.id);
              if (exists) return prevTxs;

              const updatedTxs = [newTx, ...prevTxs];
              const walletPart = walletAddress ? `-${walletAddress}` : "";
              const cacheKey = `${safeAddress}${walletPart}-${chainId}`;
              txCache.set(cacheKey, {
                transactions: updatedTxs,
                timestamp: Date.now(),
              });

              return updatedTxs;
            });
          } catch (err) {
            console.error("Error processing deposit event:", err);
          }
        }
      );

      // Listen for borrow events
      lendingPoolContract.on(
        lendingPoolContract.filters.Borrow(safeAddress, null),
        async (user, asset, amount, event) => {
          try {
            const tokenContract = new ethers.Contract(
              asset,
              erc20Interface,
              provider
            );
            const decimals = await tokenContract.decimals();
            const symbol = await tokenContract.symbol();
            const block = await provider.getBlock(event.blockNumber);

            const newTx: Transaction = {
              id: event.transactionHash + "-borrow",
              timestamp: block.timestamp * 1000,
              from: LENDING_POOL_ADDRESS,
              to: user,
              tokenAddress: asset,
              tokenSymbol: symbol,
              value: amount.toString(),
              formattedValue: ethers.utils.formatUnits(amount, decimals),
              type: "incoming",
              action: "Borrow",
              source: "safe",
            };

            setTransactions((prevTxs) => {
              const exists = prevTxs.some((tx) => tx.id === newTx.id);
              if (exists) return prevTxs;

              const updatedTxs = [newTx, ...prevTxs];
              const walletPart = walletAddress ? `-${walletAddress}` : "";
              const cacheKey = `${safeAddress}${walletPart}-${chainId}`;
              txCache.set(cacheKey, {
                transactions: updatedTxs,
                timestamp: Date.now(),
              });

              return updatedTxs;
            });
          } catch (err) {
            console.error("Error processing borrow event:", err);
          }
        }
      );

      // Set up event listeners for wallet address
      const cleanupFunctions: Array<() => void> = [];
      for (const {
        filter,
        contract,
        tokenAddress,
        isIncoming,
        source,
      } of walletFilters) {
        contract.on(filter, (from, to, value, event) =>
          handleTransfer(
            from,
            to,
            value,
            event,
            tokenAddress,
            isIncoming,
            source
          )
        );

        cleanupFunctions.push(() => contract.removeAllListeners(filter));
      }

      // Return cleanup function
      return () => {
        // Clean up Safe listeners
        usdcContract.removeAllListeners(safeIncomingUsdcFilter);
        usdcContract.removeAllListeners(safeOutgoingUsdcFilter);
        eureContract.removeAllListeners(safeIncomingEureFilter);
        eureContract.removeAllListeners(safeOutgoingEureFilter);
        wstETHContract.removeAllListeners(safeIncomingWstETHFilter);
        wstETHContract.removeAllListeners(safeOutgoingWstETHFilter);

        // Clean up wallet listeners
        cleanupFunctions.forEach((cleanup) => cleanup());
      };
    } catch (err) {
      console.error("Failed to set up event listeners:", err);
      return () => {};
    }
  }, [provider, safeAddress, walletAddress, chainId]);

  // Function to manually refresh transactions
  const refreshTransactions = useCallback(async () => {
    if (!provider) {
      setError("Provider not initialized");
      return;
    }

    if (!safeAddress) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    await fetchTransactions();
  }, [fetchTransactions, safeAddress, provider]);

  return {
    transactions,
    isLoading,
    error,
    refreshTransactions,
    safeAddress,
    walletAddress,
  };
}
