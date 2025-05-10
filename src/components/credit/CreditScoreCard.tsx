"use client";

import { useEffect, useState, useRef } from "react";
import { useAccount } from "wagmi";
import {
  getCreditProfile,
  saveProfileToLocalStorage,
  generateRandomCreditProfile,
  getCreditLevelDetails,
  CreditProfile,
} from "@/data/mock-credit-scores";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGnosisCreditCard } from "@/hooks/useGnosisCreditCard";

export function CreditScoreCard() {
  const { address } = useAccount();
  const { userCredit, refetch } = useGnosisCreditCard();
  const [creditProfile, setCreditProfile] = useState<CreditProfile | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"score" | "breakdown">("score");
  const hasInitialized = useRef(false);
  const prevUserCreditRef = useRef<{
    creditSnapshot: string;
    creditSpent: string;
  } | null>(null);

  // Add debug logging for activeTab
  useEffect(() => {
    console.log("Active tab changed:", activeTab);
  }, [activeTab]);

  // Initialize credit profile when component mounts
  useEffect(() => {
    // Skip if we don't have an address or we've already initialized
    if (!address || hasInitialized.current) return;

    // Mark as initialized to prevent repeated calls
    hasInitialized.current = true;

    // Load or create profile
    let profile =
      getCreditProfile(address) ||
      getCreditProfile("0x1BaC47611FACa45E540F1c07c27bFEfD03bCEd16");

    if (!profile) {
      // Generate new profile if none exists
      profile = generateRandomCreditProfile(address as `0x${string}`);
      try {
        saveProfileToLocalStorage(profile);
      } catch (error) {
        console.error("Failed to save credit profile:", error);
      }
    }

    // Set initial profile
    setCreditProfile(profile);

    // Start polling for updates
    const intervalId = setInterval(() => {
      refetch().catch(console.error);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [address, refetch]);

  // Update credit profile when userCredit changes
  useEffect(() => {
    // Skip if we don't have address, profile, or credit data
    if (!address || !creditProfile || !userCredit) return;

    // Skip if userCredit hasn't changed
    if (
      prevUserCreditRef.current?.creditSnapshot === userCredit.creditSnapshot &&
      prevUserCreditRef.current?.creditSpent === userCredit.creditSpent
    ) {
      return;
    }

    // Update our ref with current credit data
    prevUserCreditRef.current = { ...userCredit };

    // Only process if we have valid credit data
    if (parseFloat(userCredit.creditSnapshot) > 0) {
      // Calculate credit usage ratio
      const creditAmount = parseFloat(userCredit.creditSnapshot);
      const usedAmount = parseFloat(userCredit.creditSpent);
      const usageRatio = usedAmount / creditAmount;

      // Calculate score adjustment based on usage
      let scoreAdjustment = 0;
      if (usageRatio < 0.3) {
        scoreAdjustment = 10; // boost for low utilization
      } else if (usageRatio < 0.5) {
        scoreAdjustment = 5; // moderate boost
      } else if (usageRatio > 0.8) {
        scoreAdjustment = -5; // penalty for high utilization
      }

      // Apply adjustment within bounds
      const baseFinancialScore = creditProfile.dimensions.financial.score;
      const adjustedFinancialScore = Math.min(
        100,
        Math.max(0, baseFinancialScore + scoreAdjustment)
      );

      // Create updated dimensions
      const updatedDimensions = {
        ...creditProfile.dimensions,
        financial: {
          ...creditProfile.dimensions.financial,
          score: adjustedFinancialScore,
        },
      };

      // Calculate new total score
      const newTotalScore = Math.round(
        adjustedFinancialScore * 0.4 +
          creditProfile.dimensions.governance.score * 0.3 +
          creditProfile.dimensions.social.score * 0.3
      );

      // Only update state if the score has actually changed
      if (newTotalScore !== creditProfile.totalScore) {
        setCreditProfile({
          ...creditProfile,
          dimensions: updatedDimensions,
          totalScore: newTotalScore,
        });
      }
    }
  }, [userCredit, address, creditProfile]);

  if (!address || !creditProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Credit Score</CardTitle>
          <CardDescription>
            Connect your wallet to view your credit score
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Extract scores from profile
  const financialScore = creditProfile.dimensions.financial.score;
  const governanceScore = creditProfile.dimensions.governance.score;
  const socialScore = creditProfile.dimensions.social.score;
  const { totalScore } = creditProfile;
  const level = getCreditLevelDetails(totalScore);

  // Set color class based on score
  let scoreClass = "text-red-500";
  if (totalScore >= 85) scoreClass = "text-green-600";
  else if (totalScore >= 70) scoreClass = "text-green-500";
  else if (totalScore >= 50) scoreClass = "text-yellow-500";
  else if (totalScore >= 30) scoreClass = "text-orange-500";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Your Credit Profile</CardTitle>
          <div className="flex space-x-2">
            <Button
              variant={activeTab === "score" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("score")}
            >
              Score
            </Button>
            <Button
              variant={activeTab === "breakdown" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("breakdown")}
            >
              Breakdown
            </Button>
          </div>
        </div>
        <CardDescription>
          {level.name} ({totalScore} / 100)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Score Tab Content */}
        {activeTab === "score" && (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-40 h-40 mb-4">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-4xl font-bold">{totalScore}</div>
              </div>
              <svg
                viewBox="0 0 100 100"
                className="transform -rotate-90 w-40 h-40"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={
                    totalScore >= 85
                      ? "#059669"
                      : totalScore >= 70
                      ? "#10b981"
                      : totalScore >= 50
                      ? "#f59e0b"
                      : totalScore >= 30
                      ? "#f97316"
                      : "#ef4444"
                  }
                  strokeWidth="10"
                  strokeDasharray={`${(totalScore / 100) * 283} 283`}
                />
              </svg>
            </div>

            <div className="text-center">
              <h3 className={`text-xl font-semibold ${scoreClass}`}>
                {level.name}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {level.description}
              </p>
            </div>

            <div className="w-full mt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Financial Trustworthiness (40%)</span>
                  <span
                    className={
                      financialScore >= 70
                        ? "text-green-600"
                        : financialScore >= 50
                        ? "text-yellow-500"
                        : "text-red-500"
                    }
                  >
                    {financialScore}
                  </span>
                </div>
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-500 transition-all"
                    style={{ width: `${financialScore}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-sm">
                  <span>DAO Participation (30%)</span>
                  <span
                    className={
                      governanceScore >= 70
                        ? "text-green-600"
                        : governanceScore >= 50
                        ? "text-yellow-500"
                        : "text-red-500"
                    }
                  >
                    {governanceScore}
                  </span>
                </div>
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-500 transition-all"
                    style={{ width: `${governanceScore}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 mt-3">
                <div className="flex justify-between text-sm">
                  <span>Social Connectivity (30%)</span>
                  <span
                    className={
                      socialScore >= 70
                        ? "text-green-600"
                        : socialScore >= 50
                        ? "text-yellow-500"
                        : "text-red-500"
                    }
                  >
                    {socialScore}
                  </span>
                </div>
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-500 transition-all"
                    style={{ width: `${socialScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-full">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <span>Borrowing Benefits</span>
                <span className={`text-sm font-bold ${scoreClass}`}>
                  Based on your credit score
                </span>
              </h4>
              <div className="space-y-2">
                <p className="text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
                  <span className="font-medium">Borrowing Limit:</span>
                  <span>{level.borrowingBoost}</span>
                </p>
                <p className="text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
                  <span className="font-medium">Interest Rate:</span>
                  <span>{level.interestTier}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Breakdown Tab Content */}
        {activeTab === "breakdown" && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-around items-center">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">
                  {financialScore}
                </div>
                <div className="text-sm">Financial</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600">
                  {governanceScore}
                </div>
                <div className="text-sm">Governance</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">
                  {socialScore}
                </div>
                <div className="text-sm">Social</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium mb-2 text-green-600">
                  Financial Trustworthiness ({financialScore}/100)
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Based on your DeFi activity, borrowing patterns, and
                  stablecoin usage.
                  {userCredit && parseFloat(userCredit.creditSnapshot) > 0 && (
                    <>
                      <br />
                      <br />
                      You have a credit limit of{" "}
                      <strong>
                        {parseFloat(userCredit.creditSnapshot).toFixed(2)}
                      </strong>{" "}
                      with{" "}
                      <strong>
                        {parseFloat(userCredit.creditSpent).toFixed(2)}
                      </strong>{" "}
                      spent.
                    </>
                  )}
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Credit Utilization</span>
                    <span>
                      {userCredit
                        ? Math.round(
                            (parseFloat(userCredit.creditSpent) /
                              parseFloat(userCredit.creditSnapshot || "1")) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{
                        width: `${
                          userCredit
                            ? Math.min(
                                (parseFloat(userCredit.creditSpent) /
                                  parseFloat(
                                    userCredit.creditSnapshot || "1"
                                  )) *
                                  100,
                                100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <ul className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc pl-4">
                    <li>No liquidations in the past 180 days</li>
                    <li>Consistent borrowing pattern detected</li>
                    <li>Multiple borrowing protocols used</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium mb-2 text-purple-600">
                  DAO Participation ({governanceScore}/100)
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Based on your activity with Gnosis DAO, voting history, and
                  GNO staking patterns.
                </p>
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between bg-gray-100 dark:bg-gray-700 p-1.5 rounded">
                      <span>Proposals Voted</span>
                      <span className="font-medium">
                        {Math.floor(governanceScore / 10)}
                      </span>
                    </div>
                    <div className="flex justify-between bg-gray-100 dark:bg-gray-700 p-1.5 rounded">
                      <span>GNO Staked</span>
                      <span className="font-medium">
                        {(governanceScore / 5).toFixed(1)} GNO
                      </span>
                    </div>
                  </div>
                  <ul className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc pl-4">
                    <li>Active voter on Snapshot</li>
                    <li>Participated in recent governance discussions</li>
                    <li>Consistent voting pattern</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium mb-2 text-blue-600">
                  Social Connectivity ({socialScore}/100)
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Based on your Safe multisig partners, verifiable credentials,
                  and on-chain social connections.
                </p>
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between bg-gray-100 dark:bg-gray-700 p-1.5 rounded">
                      <span>Safe Partners</span>
                      <span className="font-medium">
                        {Math.ceil(socialScore / 15)}
                      </span>
                    </div>
                    <div className="flex justify-between bg-gray-100 dark:bg-gray-700 p-1.5 rounded">
                      <span>Verified Credentials</span>
                      <span className="font-medium">
                        {Math.ceil(socialScore / 25)}
                      </span>
                    </div>
                  </div>
                  <ul className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc pl-4">
                    <li>Member of trusted multisigs</li>
                    <li>
                      Gitcoin Passport score: {Math.round(socialScore * 0.15)}
                    </li>
                    <li>Cross-chain reputation confirmed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
