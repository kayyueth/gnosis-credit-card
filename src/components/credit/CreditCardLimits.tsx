"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { getCreditProfile } from "@/data/mock-credit-scores";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreditUsage } from "@/hooks/useCreditUsage";
import { useSafeStore } from "@/store/useSafeStore";
import { useGnosisCreditCard } from "@/hooks/useGnosisCreditCard";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

type CurrencyType = "USDC" | "EURe";

interface CreditCardLimitsProps {
  className?: string;
  currency?: CurrencyType;
  onCurrencyChange?: (currency: CurrencyType) => void;
}

export function CreditCardLimits({
  currency: propCurrency,
  onCurrencyChange,
}: CreditCardLimitsProps = {}) {
  const { address } = useAccount();
  const { safeAddress } = useSafeStore();
  const { totalSpent, totalDeposited, isLoading } = useCreditUsage();
  const { userCredit, refetch } = useGnosisCreditCard();
  const [creditLimit, setCreditLimit] = useState(0);
  const [usedPercentage, setUsedPercentage] = useState(0);
  const [tier, setTier] = useState("Basic");
  const [currency, setCurrency] = useState<CurrencyType>(
    propCurrency || "USDC"
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Currency conversion rate
  const eurToUsdRate = 1.08; // 1 EUR = 1.08 USD

  // Function to update credit limits
  const updateCreditLimits = useCallback(() => {
    if (!address) return;

    // Get credit profile
    const profile =
      getCreditProfile(address) ||
      getCreditProfile("0x1BaC47611FACa45E540F1c07c27bFEfD03bCEd16");

    if (profile) {
      // Set credit limit based on total score
      let limit = 1000; // Default for Dormant
      let tierName = "Dormant";

      if (profile.totalScore >= 85) {
        limit = 15000;
        tierName = "Sovereign";
      } else if (profile.totalScore >= 70) {
        limit = 10000;
        tierName = "Ally";
      } else if (profile.totalScore >= 50) {
        limit = 5000;
        tierName = "Basic";
      } else if (profile.totalScore >= 30) {
        limit = 3000;
        tierName = "Citizen";
      }

      // Get the credit limit from smart contract if available
      const contractCreditLimit = userCredit?.creditSnapshot
        ? parseFloat(userCredit.creditSnapshot)
        : 0;

      // Use the contract limit if it exists, otherwise use profile-based limit
      const actualLimit = contractCreditLimit > 0 ? contractCreditLimit : limit;

      // Calculate used credit based on actual spending from smart contract
      const actualUsedAmount = userCredit?.creditSpent
        ? parseFloat(userCredit.creditSpent)
        : 0;
      const offChainSpent = userCredit?.offChainSpending
        ? parseFloat(userCredit.offChainSpending)
        : 0;
      const totalUsedAmount = actualUsedAmount + offChainSpent;
      const actualUsedPercentage = Math.min(
        Math.floor((totalUsedAmount / actualLimit) * 100),
        100
      );
      const available = actualLimit - totalUsedAmount;

      console.log("Credit calculation debug:", {
        contractCreditLimit,
        actualLimit,
        actualUsedAmount,
        offChainSpent,
        totalUsedAmount,
        available,
        userCredit,
      });

      setCreditLimit(actualLimit);
      setUsedPercentage(actualUsedPercentage);
      setTier(tierName);
    }
  }, [address, userCredit]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success("Credit information refreshed");
      updateCreditLimits();
    } catch (error) {
      console.error("Error refreshing credit:", error);
      toast.error("Failed to refresh credit information");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle currency change
  useEffect(() => {
    if (propCurrency) {
      setCurrency(propCurrency);
    }
  }, [propCurrency]);

  useEffect(() => {
    if (onCurrencyChange) {
      onCurrencyChange(currency);
    }
  }, [currency, onCurrencyChange]);

  // Run update when component mounts or credit data changes
  useEffect(() => {
    updateCreditLimits();
  }, [updateCreditLimits]);

  // Get the currency symbol
  const getCurrencySymbol = (currencyType: CurrencyType) => {
    return currencyType === "USDC" ? "$" : "€";
  };

  // Convert USD to EUR if needed
  const getConvertedValue = (usdValue: number) => {
    if (currency === "USDC") return usdValue;
    return usdValue / eurToUsdRate;
  };

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Card Limits</CardTitle>
          <CardDescription>
            Connect your wallet to view your limits
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const symbol = getCurrencySymbol(currency);
  const convertedCreditLimit = getConvertedValue(creditLimit);

  // Calculate available credit from user credit data if available
  const actualAvailableCredit = userCredit
    ? parseFloat(userCredit.creditSnapshot) - parseFloat(userCredit.creditSpent)
    : creditLimit - (usedPercentage / 100) * creditLimit;

  const convertedAvailableLimit = getConvertedValue(actualAvailableCredit);

  return (
    <Card className={cn("overflow-hidden", propCurrency)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl">Credit Card Limits</CardTitle>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Tabs
            value={currency}
            onValueChange={(v) => setCurrency(v as CurrencyType)}
            className="h-8"
          >
            <TabsList className="h-8">
              <TabsTrigger value="USDC" className="text-xs px-2 h-7">
                USDC
              </TabsTrigger>
              <TabsTrigger value="EURe" className="text-xs px-2 h-7">
                EURe
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Credit Limit */}
          <div>
            <div className="flex justify-between mb-2">
              <div className="text-sm font-medium">Available Credit</div>
              <div className="text-sm font-medium">
                {symbol}
                {convertedAvailableLimit.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                / {symbol}
                {convertedCreditLimit.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <Progress
              variant="credit"
              usedValue={usedPercentage}
              value={100 - usedPercentage}
              className="h-2"
            />
            <div className="flex justify-between mt-1">
              <div className="text-xs text-gray-500">
                {usedPercentage}% Used
              </div>
              <div className="text-xs text-gray-500">
                {100 - usedPercentage}% Available
              </div>
            </div>
          </div>

          {/* Borrowing Rates */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-medium mb-3">
              Current Borrowing Terms
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Interest Rate</div>
                <div className="text-lg font-semibold">
                  {tier === "Sovereign"
                    ? "4"
                    : tier === "Ally"
                    ? "5"
                    : tier === "Basic"
                    ? "6"
                    : tier === "Citizen"
                    ? "7.5"
                    : "9"}
                  %
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Cashback Rate</div>
                <div className="text-lg font-semibold">
                  {tier === "Sovereign"
                    ? "3"
                    : tier === "Ally"
                    ? "2"
                    : tier === "Basic"
                    ? "1"
                    : tier === "Citizen"
                    ? "0.5"
                    : "0"}
                  %
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
