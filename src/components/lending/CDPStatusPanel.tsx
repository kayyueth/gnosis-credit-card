import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAccount, useReadContract } from "wagmi";
import { useChainId } from "wagmi";
import { formatEther } from "viem";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, InfoIcon } from "lucide-react";
import { useAave } from "@/hooks/useAave";
import { toast } from "react-hot-toast";

interface CDPStatusPanelProps {
  className?: string;
  currency?: "USDC" | "EURe";
}

// Contract addresses from deployed contracts
const MOCK_LENDING_POOL_ADDRESS = "0xF1D00F6c7E7Fc7Eda00fCe95583b8d6DD4716572";
const EURe_ADDRESS = "0x137e7a3c32993cd0c15dfdf3020875322da145cd";
const USDC_ADDRESS = "0x969a2c1c858da82fb48627df8f5726c1fe0a2e94";

const getUserBorrowedAbi = [
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

export function CDPStatusPanel({
  className,
  currency = "USDC",
}: CDPStatusPanelProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { isInitialized } = useAave();
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const previousDebtRef = useRef<{ usdc: string; eure: string }>({
    usdc: "0",
    eure: "0",
  });
  const [showRedeclareReminder, setShowRedeclareReminder] = useState(false);

  // Exchange rate for conversion between USD and EUR (simplified fixed rate for demo)
  const eurToUsdRate = 1.08;

  // Get the currency symbol
  const getCurrencySymbol = (currencyType: "USDC" | "EURe") => {
    return currencyType === "USDC" ? "$" : "€";
  };

  // Convert USD to EUR if needed
  const getConvertedValue = (usdValue: string) => {
    const numValue = Number(usdValue);
    if (currency === "USDC") return usdValue;
    return (numValue / eurToUsdRate).toFixed(4);
  };

  // Read collateral amount
  const {
    data: collateral,
    error: collateralError,
    isLoading: collateralLoading,
    refetch: refetchCollateral,
  } = useReadContract({
    address: MOCK_LENDING_POOL_ADDRESS as `0x${string}`,
    abi: [
      {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "getUserCollateral",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "getUserCollateral",
    args: [address ?? "0x0"],
    query: {
      enabled: !!address && isInitialized,
      refetchInterval: 5000,
    },
  });

  // Read USDC debt amount
  const {
    data: usdcDebt,
    error: usdcDebtError,
    isLoading: usdcDebtLoading,
    refetch: refetchUsdcDebt,
  } = useReadContract({
    address: MOCK_LENDING_POOL_ADDRESS as `0x${string}`,
    abi: getUserBorrowedAbi,
    functionName: "getUserBorrowed",
    args: address ? [address, USDC_ADDRESS as `0x${string}`] : undefined,
    query: {
      enabled: !!address && isInitialized,
      refetchInterval: 5000,
    },
  });

  const {
    data: eureDebt,
    error: eureDebtError,
    isLoading: eureDebtLoading,
    refetch: refetchEureDebt,
  } = useReadContract({
    address: MOCK_LENDING_POOL_ADDRESS as `0x${string}`,
    abi: getUserBorrowedAbi,
    functionName: "getUserBorrowed",
    args: address ? [address, EURe_ADDRESS as `0x${string}`] : undefined,
    query: {
      enabled: !!address && isInitialized,
      refetchInterval: 5000,
    },
  });

  // Calculate available borrowing power and health factor
  const collateralAmount = collateral ? formatEther(collateral as bigint) : "0";
  const eureDebtAmount = eureDebt ? formatEther(eureDebt as bigint) : "0";
  const usdcDebtAmount = usdcDebt ? formatEther(usdcDebt as bigint) : "0";
  const maxBorrowable = Number(collateralAmount) * 0.5; // 50% LTV
  const totalDebt = Number(eureDebtAmount) + Number(usdcDebtAmount);
  const availableBorrowing = (
    Number(maxBorrowable) - Number(totalDebt)
  ).toFixed(4);
  const availableBorrowingEure = availableBorrowing;
  const availableBorrowingUsdc = availableBorrowing;
  const healthFactor =
    Number(collateralAmount) > 0 && totalDebt > 0
      ? (maxBorrowable / totalDebt).toFixed(2)
      : "∞";
  const isLiquidationRisk = Number(healthFactor) < 1.2;

  // Check if debt has increased since last check, show reminder if needed
  useEffect(() => {
    if (address && usdcDebt && eureDebt) {
      const currentUsdcDebt = usdcDebtAmount;
      const currentEureDebt = eureDebtAmount;
      const prevDebts = previousDebtRef.current;

      // Check if debt has increased
      const usdcDebtIncreased =
        Number(currentUsdcDebt) > Number(prevDebts.usdc);
      const eureDebtIncreased =
        Number(currentEureDebt) > Number(prevDebts.eure);

      // If any debt has increased, show the reminder for 60 seconds
      if (usdcDebtIncreased || eureDebtIncreased) {
        console.log("Debt increased, showing reminder", {
          previous: prevDebts,
          current: { usdc: currentUsdcDebt, eure: currentEureDebt },
        });
        setShowRedeclareReminder(true);

        // Auto-hide the reminder after 60 seconds
        const timerId = setTimeout(() => {
          setShowRedeclareReminder(false);
        }, 60000);

        // Update previous debt values
        previousDebtRef.current = {
          usdc: currentUsdcDebt,
          eure: currentEureDebt,
        };

        return () => clearTimeout(timerId);
      }

      // Update previous debt values even if there's no increase
      previousDebtRef.current = {
        usdc: currentUsdcDebt,
        eure: currentEureDebt,
      };
    }
  }, [usdcDebtAmount, eureDebtAmount, address]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchCollateral(),
        refetchUsdcDebt(),
        refetchEureDebt(),
      ]);
      setLastUpdate(Date.now());
      toast.success("Position data refreshed");
    } catch (error) {
      console.error("Error refreshing position data:", error);
      toast.error("Failed to refresh position data");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!address) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Connect Wallet</h2>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to view your position.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (chainId !== 10200) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Wrong Network</h2>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please switch to Gnosis Chiado testnet to view your position.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (collateralError || eureDebtError || usdcDebtError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Error Loading Position</h2>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {collateralError?.message ||
                eureDebtError?.message ||
                usdcDebtError?.message ||
                "Failed to load position data. Please try again later."}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (collateralLoading || eureDebtLoading || usdcDebtLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Position Status</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
              <RefreshCw className="h-4 w-4 animate-spin" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Position Status</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Collateral (wstETH)
            </p>
            <p className="text-xl font-semibold">{collateralAmount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Debt ({currency})
            </p>
            <p className="text-xl font-semibold">
              {getCurrencySymbol(currency)}
              {getConvertedValue(
                currency === "USDC" ? usdcDebtAmount : eureDebtAmount
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Health Factor
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-semibold">{healthFactor}</p>
              {isLiquidationRisk && (
                <Badge variant="destructive" className="h-5">
                  Risk
                </Badge>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Available to Borrow ({currency})
            </p>
            <p className="text-xl font-semibold">
              {getCurrencySymbol(currency)}
              {getConvertedValue(
                currency === "USDC"
                  ? availableBorrowingUsdc
                  : availableBorrowingEure
              )}
            </p>
          </div>
        </div>
        {isLiquidationRisk && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Warning: Your position is at risk of liquidation. Health factor
              below 1.2
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
