"use client";

import { useState } from "react";
import { ConnectWallet } from "./ConnectWallet";
import { SafeWalletDisplay } from "./SafeWalletDisplay";
import { useAave } from "@/hooks/useAave";

export function WalletContainer() {
  // Safe wallet addresses
  const safeAddresses = [
    "0x2dC3fB1f38b0E88a98929F256b0967175eAE9e56", // Main Safe address
  ];

  const [selectedSafeIndex, setSelectedSafeIndex] = useState(0);
  const { poolDataProvider, incentiveDataProvider } = useAave();

  const nextSafe = () => {
    setSelectedSafeIndex((prev) => (prev + 1) % safeAddresses.length);
  };

  // Example: Fetch Aave reserves on mount (optional)
  // const [aaveReserves, setAaveReserves] = useState([]);
  // useEffect(() => {
  //   async function fetchAaveData() {
  //     if (poolDataProvider) {
  //       const reserves = await poolDataProvider.getReservesHumanized({
  //         lendingPoolAddressProvider: "0xc3301b30dadefcf1905d512ab4f2c3eab5a75ccf",
  //       });
  //       setAaveReserves(reserves.reservesData);
  //     }
  //   }
  //   fetchAaveData();
  // }, [poolDataProvider]);

  return (
    <div className="flex flex-col w-full gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium text-center">
          Your Personal Wallet
        </h2>
        <ConnectWallet />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-medium">Your Gnosis Pay Wallet</h2>
        </div>
        <SafeWalletDisplay
          defaultSafeAddress={safeAddresses[selectedSafeIndex]}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
          {selectedSafeIndex === 0
            ? "This is your main Gnosis Pay wallet"
            : "This is a sample Safe wallet for demonstration"}
        </p>
      </div>
    </div>
  );