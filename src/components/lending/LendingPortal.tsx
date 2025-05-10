"use client";

import { useAccount } from "wagmi";
import { DepositPortal } from "@/components/lending/DepositPortal";
import { BorrowPortal } from "@/components/lending/BorrowPortal";
import { CDPStatusPanel } from "@/components/lending/CDPStatusPanel";

export function LendingPortal() {
  const { address } = useAccount();

  if (!address) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          Please connect your wallet to access the lending portal
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CDPStatusPanel />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DepositPortal />
        <BorrowPortal />
      </div>
    </div>
  );
}
