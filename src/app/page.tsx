"use client";

import { useState, useEffect } from "react";
import { WalletConnect } from "@/components/auth/WalletConnect";
import { CreditScoreCard } from "@/components/credit/CreditScoreCard";
import { CDPStatusPanel } from "@/components/lending/CDPStatusPanel";
import { BorrowPortal } from "@/components/lending/BorrowPortal";
import { DepositPortal } from "@/components/lending/DepositPortal";
import { CreditCardLimits } from "@/components/credit/CreditCardLimits";
import { CardTransactions } from "@/components/credit/CardTransactions";
import { CardBalanceStats } from "@/components/credit/CardBalanceStats";
import { FormulaExplainer } from "@/components/credit/FormulaExplainer";
import { useAccount } from "wagmi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getCreditProfile,
  saveProfileToLocalStorage,
  generateRandomCreditProfile,
} from "@/data/mock-credit-scores";
import { CreditDeclarationPanel } from "@/components/credit/CreditDeclarationPanel";
import { useGnosisCreditCard } from "@/hooks/useGnosisCreditCard";
import { useSafeStore } from "@/store/useSafeStore";
import SafeAuthConnect from "@/components/auth/SafeAuthConnect";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { WstETHMintPortal } from "@/components/lending/WstETHMintPortal";
import { OffChainTransactions } from "@/components/credit/OffChainTransactions";
import { OffChainPayment } from "@/components/credit/OffChainPayment";
import { MonthlyReminderBanner } from "@/components/credit/MonthlyReminderBanner";
import { OffChainTransactionHistory } from "@/components/credit/OffChainTransactionHistory";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

// Define currency type
type CurrencyType = "USDC" | "EURe";

const TOUR_STEPS: Step[] = [
  {
    target: "body",
    content: (
      <div className="p-4">
        <h3 className="text-xl font-black mb-2">
          Welcome to Gnosis Pay Credit Card!
        </h3>
        <p>Let's get you started with your decentralized credit journey.</p>
      </div>
    ),
    placement: "center",
    disableBeacon: true,
  },
  {
    target: '[data-tour="auth-section"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">1. Sign in with SafeAuth</h3>
        <p>
          Connect your Google account and MetaMask to create your Safe Smart
          Wallet instantly.
        </p>
        <p className="text-sm text-muted-foreground text-gray-400">
          A tiny $0.01 activation fee confirms you're ready to go.
        </p>
      </div>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="credit-score"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">2. Get Your Credit Score</h3>
        <p>
          We analyze your on-chain activity, DAO participation, and social
          footprint to generate your personalized credit limit.
        </p>
      </div>
    ),
    placement: "left",
  },
  {
    target: '[data-tour="borrow-section"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">3. Deposit & Borrow</h3>
        <p>Deposit wstETH as collateral and borrow stablecoins with 50% LTV.</p>
        <p className="text-sm text-muted-foreground text-gray-400">
          Monitor your Health Factor and borrow with confidence.
        </p>
      </div>
    ),
    placement: "right",
  },
  {
    target: '[data-tour="spend-section"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">4. Spend Anywhere, Worry-Free</h3>
        <p>
          Pay merchants with a click. Gnosis Pay handles the transaction and
          tracks your spending limits seamlessly.
        </p>
      </div>
    ),
    placement: "top",
  },
  {
    target: '[data-tour="repay-section"]',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">
          5. One-Click Repayment & Rewards
        </h3>
        <p>Review your statement and hit "Repay Now" to clear your balance.</p>
        <p className="text-sm text-muted-foreground text-gray-400">
          Earn $GNO cashback for every successful cycle!
        </p>
      </div>
    ),
    placement: "bottom",
  },
];

const stepTabMap: Record<number, string | undefined> = {
  4: "transactions", // Step 4: Spend
  5: "transactions", // Step 5: Repay
};

export default function Home() {
  const { address } = useAccount();
  const { userCredit } = useGnosisCreditCard();
  const { safeAddress } = useSafeStore();
  const [activeTab, setActiveTab] = useState<string>("card");
  const [creditProfileData, setCreditProfileData] = useState<any>(null);
  const [creditLimit, setCreditLimit] = useState("5,000");
  const [currency, setCurrency] = useState<CurrencyType>("USDC");
  const [run, setRun] = useState(true);

  useEffect(() => {
    if (address) {
      // First check for an existing credit profile
      const creditProfile = getCreditProfile(address);
      if (creditProfile) {
        setCreditProfileData(creditProfile);

        // Set credit limit based on total score
        if (creditProfile.totalScore >= 85) {
          setCreditLimit("15,000");
        } else if (creditProfile.totalScore >= 70) {
          setCreditLimit("10,000");
        } else if (creditProfile.totalScore >= 50) {
          setCreditLimit("5,000");
        } else if (creditProfile.totalScore >= 30) {
          setCreditLimit("3,000");
        } else {
          setCreditLimit("1,000");
        }
      } else {
        // Generate a random profile if none exists
        const randomProfile = generateRandomCreditProfile(
          address as `0x${string}`
        );
        try {
          saveProfileToLocalStorage(randomProfile);
        } catch (error) {
          console.error(
            "Failed to save credit profile to localStorage:",
            error
          );
          // Continue execution even if localStorage fails
        }
        setCreditProfileData(randomProfile);

        // Set credit limit for the random profile
        if (randomProfile.totalScore >= 85) {
          setCreditLimit("15,000");
        } else if (randomProfile.totalScore >= 70) {
          setCreditLimit("10,000");
        } else if (randomProfile.totalScore >= 50) {
          setCreditLimit("5,000");
        } else if (randomProfile.totalScore >= 30) {
          setCreditLimit("3,000");
        } else {
          setCreditLimit("1,000");
        }
      }
    }
  }, [address]);

  // Format date for expiry - 3 years from now
  const expiryDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 3);
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${date
      .getFullYear()
      .toString()
      .substr(2, 2)}`;
  };

  // Handle currency change from CreditCardLimits component
  const handleCurrencyChange = (newCurrency: CurrencyType) => {
    setCurrency(newCurrency);
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { index, type, status } = data;
    console.log("Joyride step", { index, type, tab: stepTabMap[index] });
    if (type === "step:before") {
      const tab = stepTabMap[index];
      if (tab) {
        setActiveTab(tab);
        setTimeout(() => {
          const step = TOUR_STEPS[index];
          if (step?.target) {
            const el = document.querySelector(step.target as string);
            if (!el) {
              console.warn(
                "🚨 Joyride element not found for step",
                index,
                step.target
              );
            } else {
              console.log("✅ Element found for step", index, step.target);
            }
          }
        }, 500);
      }
    }
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) setRun(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-300 dark:from-gray-900 dark:to-gray-800">
      <Joyride
        steps={TOUR_STEPS}
        run={true}
        continuous
        hideCloseButton
        scrollToFirstStep
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#6366f1",
          },
          tooltipContainer: {
            textAlign: "left",
          },
          buttonNext: {
            backgroundColor: "#6366f1",
          },
          buttonBack: {
            marginRight: 10,
          },
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header with Wallet Connect */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Gnosis Credit Card
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg mt-2">
              A self-custodial credit card powered by on-chain reputation
            </p>
          </div>
          <div className="flex gap-4 items-center" data-tour="auth-section">
            {/* <WalletConnect /> */}
            <SafeAuthConnect />
          </div>
        </div>

        {/* Monthly Payment Reminder */}
        {address && <MonthlyReminderBanner className="mb-6" />}

        {/* Main Content */}
        {!address ? (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-semibold mb-3">
              Connect your wallet to continue
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Access your credit card & borrowing dashboard
            </p>
            <div className="flex justify-center">
              <WalletConnect />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-5 order-1">
              <div className="space-y-8">
                {/* Credit Card Visual - Enhanced with subtle improvements */}
                <div className="relative">
                  <div className="relative aspect-[1.586/1] w-[95%] mx-auto perspective mb-2">
                    <div
                      className={`absolute inset-0 rounded-2xl shadow-2xl transform rotate-3d p-8 credit-card 
                      ${
                        !creditProfileData?.totalScore &&
                        "bg-gradient-to-tr from-violet-900 via-purple-800 to-indigo-700"
                      }
                      ${
                        creditProfileData?.totalScore >= 90 &&
                        "bg-gradient-to-tr from-violet-900 via-purple-800 to-indigo-700"
                      }
                      ${
                        creditProfileData?.totalScore >= 75 &&
                        creditProfileData?.totalScore < 90 &&
                        "bg-gradient-to-tr from-blue-900 via-blue-800 to-indigo-600"
                      }
                      ${
                        creditProfileData?.totalScore >= 60 &&
                        creditProfileData?.totalScore < 75 &&
                        "bg-gradient-to-tr from-emerald-800 via-green-700 to-teal-600"
                      }
                      ${
                        creditProfileData?.totalScore >= 40 &&
                        creditProfileData?.totalScore < 60 &&
                        "bg-gradient-to-tr from-amber-600 via-yellow-600 to-orange-500"
                      }
                      ${
                        creditProfileData?.totalScore < 40 &&
                        "bg-gradient-to-tr from-red-800 via-red-700 to-rose-600"
                      }
                    `}
                    >
                      <div className="h-full flex flex-col justify-between text-white">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xs font-light opacity-80">
                              Gnosis Pay
                            </div>
                            <div className="text-lg font-semibold tracking-widest mt-1">
                              CREDIT CARD
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-white/30 text-white/90 font-medium"
                          >
                            {creditProfileData?.totalScore
                              ? creditProfileData?.totalScore >= 90
                                ? "Level S – Sovereign"
                                : creditProfileData?.totalScore >= 75
                                ? "Level A – Ally"
                                : creditProfileData?.totalScore >= 60
                                ? "Level B – Builder"
                                : creditProfileData?.totalScore >= 40
                                ? "Level C – Citizen"
                                : "Level D – Dormant"
                              : "Standard"}
                          </Badge>
                        </div>

                        <div className="mt-6 flex items-center gap-3">
                          <div className="w-12 h-8 rounded-md bg-yellow-500/80 flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-white"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="text-xs opacity-70">
                            Secured by Gnosis
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="text-xs opacity-70 mb-1">
                            Card Number
                          </div>
                          <div className="text-xl tracking-widest font-light">
                            {address
                              ? `${address.substring(0, 4)} ${address.substring(
                                  4,
                                  8
                                )} ${address.substring(
                                  8,
                                  12
                                )} ${address.substring(12, 16)}`
                              : "0000 0000 0000 0000"}
                          </div>
                        </div>

                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-xs opacity-70">
                              Card Holder
                            </div>
                            <div className="text-sm font-medium mt-1">
                              Kay Yu
                            </div>
                          </div>
                          <div>
                            <div className="text-xs opacity-70">Expires</div>
                            <div className="text-sm font-medium mt-1">
                              {expiryDate()}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-white/80"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                              </svg>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-white/90"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Summary Info - Improved styling */}
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-md border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <span className="inline-block w-1.5 h-6 bg-purple-500 dark:bg-purple-400 mr-3 rounded-sm"></span>
                    Card Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-4 rounded-lg border border-purple-100 dark:border-purple-900/40">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-medium text-purple-800 dark:text-purple-300">
                          Credit Limit
                        </div>
                        <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-purple-600 dark:text-purple-300"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                            <path
                              fillRule="evenodd"
                              d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${creditLimit}
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                        Available for spending
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 p-4 rounded-lg border border-blue-100 dark:border-blue-900/40">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-medium text-blue-800 dark:text-blue-300">
                          Credit Score
                        </div>
                        <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-blue-600 dark:text-blue-300"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                          </svg>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {creditProfileData?.totalScore || "N/A"}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                        {creditProfileData?.totalScore
                          ? creditProfileData.totalScore >= 70
                            ? "Excellent rating"
                            : creditProfileData.totalScore >= 50
                            ? "Good standing"
                            : "Building credit history"
                          : "Needs activation"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Credit Declaration Panel */}
                <Card
                  className="border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden"
                  data-tour="credit-score"
                >
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900/80 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <span className="inline-block w-1.5 h-6 bg-green-500 dark:bg-green-400 mr-3 rounded-sm"></span>
                      Credit Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <CreditDeclarationPanel />
                  </CardContent>
                </Card>

                {/* Off-Chain Payments */}
                <Card
                  className="border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden"
                  data-tour="spend-section"
                >
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900/80 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <span className="inline-block w-1.5 h-6 bg-blue-500 dark:bg-blue-400 mr-3 rounded-sm"></span>
                      Off-Chain Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <OffChainPayment />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Card Details & Info - Takes up 7 columns on large screens */}
            <div className="lg:col-span-7 order-2">
              <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg border-gray-200 dark:border-gray-700 overflow-hidden">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <div className="border-b border-gray-200 dark:border-gray-800">
                    <TabsList className="w-full grid grid-cols-4 bg-transparent h-12">
                      <TabsTrigger
                        value="card"
                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-none rounded-none border-b-2 data-[state=active]:border-purple-500 dark:data-[state=active]:border-purple-400 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300"
                      >
                        Card Details
                      </TabsTrigger>
                      <TabsTrigger
                        value="score"
                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-none rounded-none border-b-2 data-[state=active]:border-purple-500 dark:data-[state=active]:border-purple-400 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300"
                      >
                        Credit Score
                      </TabsTrigger>
                      <TabsTrigger
                        value="transactions"
                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-none rounded-none border-b-2 data-[state=active]:border-purple-500 dark:data-[state=active]:border-purple-400 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300"
                      >
                        Transactions
                      </TabsTrigger>
                      <TabsTrigger
                        value="formulas"
                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-none rounded-none border-b-2 data-[state=active]:border-purple-500 dark:data-[state=active]:border-purple-400 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300"
                      >
                        Formulas
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="card" className="p-6">
                    <div className="space-y-8">
                      {!safeAddress && (
                        <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <AlertDescription className="text-amber-700 dark:text-amber-300">
                            Connect your Safe wallet to view card details and
                            manage borrowing.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                          Current Card Status
                        </h3>
                        <CreditCardLimits
                          currency={currency}
                          onCurrencyChange={handleCurrencyChange}
                        />
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                          Lending Position
                        </h3>
                        <CDPStatusPanel currency={currency} />
                      </div>

                      <div className="mt-8">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                          <span className="inline-block w-1.5 h-6 bg-purple-500 dark:bg-purple-400 mr-3 rounded-sm"></span>
                          Credit & Lending Actions
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                          <div className="space-y-10">
                            <div className="w-full max-w-xl mx-auto">
                              <div className="mb-3">
                                <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center">
                                  <span className="inline-block w-1 h-4 bg-blue-500 dark:bg-blue-400 mr-2 rounded-sm"></span>
                                  Step 1: Mint Test Tokens
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 ml-3">
                                  Get wstETH tokens to use as collateral
                                </p>
                              </div>
                              <WstETHMintPortal />
                            </div>

                            <div className="w-full max-w-xl mx-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                              <div className="mb-3">
                                <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center">
                                  <span className="inline-block w-1 h-4 bg-green-500 dark:bg-green-400 mr-2 rounded-sm"></span>
                                  Step 2: Deposit Collateral
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 ml-3">
                                  Supply wstETH to enable borrowing
                                </p>
                              </div>
                              <DepositPortal />
                            </div>

                            <div className="w-full max-w-xl mx-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                              <div className="mb-3">
                                <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center">
                                  <span className="inline-block w-1 h-4 bg-purple-500 dark:bg-purple-400 mr-2 rounded-sm"></span>
                                  Step 3: Borrow Funds
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 ml-3">
                                  Get stablecoins for your credit card
                                </p>
                              </div>
                              <div data-tour="borrow-section">
                                <BorrowPortal />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="score" style={{ display: "block" }}>
                    <div>
                      {address ? <CreditScoreCard /> : <div className="h-32" />}
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="transactions"
                    style={{ display: "block" }}
                  >
                    <div className="space-y-8">
                      {!safeAddress && (
                        <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                          <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <AlertDescription className="text-amber-700 dark:text-amber-300">
                            Connect your Safe wallet to view transaction
                            history.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                        <CardBalanceStats currency={currency} />
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                          Off-Chain Spending
                        </h3>
                        <div data-tour="repay-section">
                          {address ? (
                            <OffChainTransactions />
                          ) : (
                            <div className="h-32" />
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                          Off-Chain Transaction History
                        </h3>
                        <div>
                          {address ? (
                            <OffChainTransactionHistory />
                          ) : (
                            <div className="h-32" />
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                          On-Chain Transaction History
                        </h3>
                        <CardTransactions />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="formulas" className="p-6">
                    <FormulaExplainer />
                  </TabsContent>
                </Tabs>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
