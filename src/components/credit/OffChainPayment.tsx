"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useOffChainSpending } from "@/hooks/useOffChainSpending";
import { useGnosisCreditCard } from "@/hooks/useGnosisCreditCard";
import { Loader2, CreditCard, ShoppingCart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";

interface OffChainPaymentProps {
  className?: string;
}

// Predefined merchant categories
const MERCHANT_CATEGORIES = [
  { name: "Shopping", value: "shopping" },
  { name: "Groceries", value: "groceries" },
  { name: "Dining", value: "dining" },
  { name: "Travel", value: "travel" },
  { name: "Entertainment", value: "entertainment" },
  { name: "Transport", value: "transport" },
  { name: "Utilities", value: "utilities" },
  { name: "Other", value: "other" },
];

export function OffChainPayment({ className }: OffChainPaymentProps) {
  const { address } = useAccount();
  const { userCredit, availableCredit, refetch } = useGnosisCreditCard();
  const { recordOffChainSpending, isLoading } = useOffChainSpending();

  const [paymentData, setPaymentData] = useState({
    amount: "",
    merchant: "",
    category: "shopping",
    description: "",
    currency: "USDC" as "USDC" | "EURe",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPaymentData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle currency change
  const handleCurrencyChange = (value: string) => {
    setPaymentData((prev) => ({
      ...prev,
      currency: value as "USDC" | "EURe",
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Validate inputs
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!paymentData.merchant) {
      toast.error("Please enter a merchant name");
      return;
    }

    // Check if amount is within available credit
    const amount = parseFloat(paymentData.amount);
    const available = parseFloat(availableCredit);

    if (amount > available) {
      toast.error(
        `Amount exceeds available credit of ${available.toFixed(2)} ${
          paymentData.currency
        }`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await recordOffChainSpending(
        paymentData.amount,
        paymentData.merchant,
        paymentData.category,
        paymentData.description || `Payment to ${paymentData.merchant}`,
        paymentData.currency
      );

      if (success) {
        // Refresh credit data after successful payment
        await refetch();

        // Reset form on success
        setPaymentData({
          amount: "",
          merchant: "",
          category: "shopping",
          description: "",
          currency: "USDC",
        });

        toast.success("Payment recorded");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShoppingCart className="mr-2 h-5 w-5" />
          Record Off-Chain Payment
        </CardTitle>
        <CardDescription>
          Use your credit without blockchain transactions
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid gap-4">
            {/* Currency tabs */}
            <Tabs
              defaultValue="USDC"
              value={paymentData.currency}
              onValueChange={handleCurrencyChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="USDC">USDC ($)</TabsTrigger>
                <TabsTrigger value="EURe">EURe (€)</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Payment amount */}
            <div className="grid gap-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {paymentData.currency === "USDC" ? "$" : "€"}
                </span>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  placeholder="0.00"
                  className="pl-8"
                  value={paymentData.amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                />
              </div>
              <p className="text-xs text-gray-500">
                Available Credit: {paymentData.currency === "USDC" ? "$" : "€"}
                {parseFloat(availableCredit).toFixed(2)}
              </p>
            </div>

            {/* Merchant name */}
            <div className="grid gap-2">
              <Label htmlFor="merchant">Merchant</Label>
              <Input
                id="merchant"
                name="merchant"
                placeholder="e.g. Amazon, Uber"
                value={paymentData.merchant}
                onChange={handleInputChange}
              />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                value={paymentData.category}
                onChange={handleSelectChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {MERCHANT_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description (optional) */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                name="description"
                placeholder="e.g. Groceries for the week"
                value={paymentData.description}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting || isLoading || !userCredit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Record Payment
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
