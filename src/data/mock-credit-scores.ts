import { Address } from "viem";

export interface CreditDimension {
  score: number;
  metrics: {
    name: string;
    value: boolean;
    impact: number;
  }[];
}

export interface CreditProfile {
  address: Address;
  dimensions: {
    financial: CreditDimension;
    governance: CreditDimension;
    social: CreditDimension;
  };
  totalScore: number;
  level: {
    name: string;
    description: string;
    borrowingBoost: string;
    interestTier: string;
  };
}

// Mock credit score data
export const mockCreditProfiles: CreditProfile[] = [
  {
    address: "0x1BaC47611FACa45E540F1c07c27bFEfD03bCEd16",
    dimensions: {
      financial: {
        score: 90,
        metrics: [
          { name: "Borrow & repay > 5 times", value: true, impact: 30 },
          { name: "Current Health Factor < 6", value: true, impact: 40 },
          { name: "Active Safe Wallet User", value: true, impact: 30 },
          { name: "Active Cow Swaps User", value: false, impact: 0 },
        ],
      },
      governance: {
        score: 70,
        metrics: [
          { name: ">10 Snapshot votes", value: true, impact: 40 },
          { name: "1–9 Snapshot votes", value: false, impact: 0 },
          { name: "Published at least 1 proposal", value: true, impact: 30 },
          { name: "Stakes GNO tokens", value: false, impact: 0 },
        ],
      },
      social: {
        score: 80,
        metrics: [
          {
            name: "Transfers with high-reputation wallets",
            value: true,
            impact: 40,
          },
          {
            name: "Multisig with known DAO addresses",
            value: true,
            impact: 30,
          },
          { name: "Uses identity protocols", value: false, impact: 0 },
        ],
      },
    },
    totalScore: 81, // (90*0.4 + 70*0.3 + 80*0.3) = 36 + 21 + 24 = 81
    level: {
      name: "Level A – Ally",
      description:
        "Strong reputation across multiple modules. Safe user & active voter.",
      borrowingBoost: "+20% borrowing limit",
      interestTier: "Standard low rate",
    },
  },
  {
    address: "0x998C92282223f4b15c9523D05E70f5ac7fDeBC71",
    dimensions: {
      financial: {
        score: 100,
        metrics: [
          { name: "Borrow & repay > 5 times", value: true, impact: 30 },
          { name: "Current Health Factor < 6", value: true, impact: 40 },
          { name: "Active Safe Wallet User", value: true, impact: 30 },
          { name: "Active Cow Swaps User", value: true, impact: 30 },
        ],
      },
      governance: {
        score: 100,
        metrics: [
          { name: ">10 Snapshot votes", value: true, impact: 40 },
          { name: "1–9 Snapshot votes", value: false, impact: 0 },
          { name: "Published at least 1 proposal", value: true, impact: 30 },
          { name: "Stakes GNO tokens", value: true, impact: 30 },
        ],
      },
      social: {
        score: 100,
        metrics: [
          {
            name: "Transfers with high-reputation wallets",
            value: true,
            impact: 40,
          },
          {
            name: "Multisig with known DAO addresses",
            value: true,
            impact: 30,
          },
          { name: "Uses identity protocols", value: true, impact: 30 },
        ],
      },
    },
    totalScore: 100, // (100*0.4 + 100*0.3 + 100*0.3) = 40 + 30 + 30 = 100
    level: {
      name: "Level S – Sovereign",
      description:
        "Top-tier trusted user. DAO-active, highly connected, and financially sound.",
      borrowingBoost: "+30% borrowing limit",
      interestTier: "Preferred (e.g. 1% APR)",
    },
  },
  {
    address: "0x099c927E0DC0cB85aC209d82F9ae2362B899bdD5",
    dimensions: {
      financial: {
        score: 40,
        metrics: [
          { name: "Borrow & repay > 5 times", value: false, impact: 0 },
          { name: "Current Health Factor < 6", value: false, impact: 0 },
          { name: "Active Safe Wallet User", value: true, impact: 30 },
          { name: "Active Cow Swaps User", value: false, impact: 0 },
        ],
      },
      governance: {
        score: 20,
        metrics: [
          { name: ">10 Snapshot votes", value: false, impact: 0 },
          { name: "1–9 Snapshot votes", value: true, impact: 20 },
          { name: "Published at least 1 proposal", value: false, impact: 0 },
          { name: "Stakes GNO tokens", value: false, impact: 0 },
        ],
      },
      social: {
        score: 70,
        metrics: [
          {
            name: "Transfers with high-reputation wallets",
            value: true,
            impact: 40,
          },
          {
            name: "Multisig with known DAO addresses",
            value: false,
            impact: 0,
          },
          { name: "Uses identity protocols", value: true, impact: 30 },
        ],
      },
    },
    totalScore: 43, // (40*0.4 + 20*0.3 + 70*0.3) = 16 + 6 + 21 = 43
    level: {
      name: "Level C – Citizen",
      description: "Limited reputation; newer or low activity user.",
      borrowingBoost: "-20% borrowing limit",
      interestTier: "Risk-adjusted (e.g. +1%)",
    },
  },
];

export function getCreditProfile(address: string): CreditProfile | undefined {
  // First check if the address is in our mock data
  const mockProfile = mockCreditProfiles.find(
    (profile) => profile.address.toLowerCase() === address.toLowerCase()
  );

  if (mockProfile) {
    return mockProfile;
  }

  // Check if we have a profile in localStorage
  try {
    const storedProfiles = localStorage.getItem("gnosis_credit_profiles");
    if (storedProfiles) {
      const profiles = JSON.parse(storedProfiles);
      const profile = profiles.find(
        (p: CreditProfile) => p.address.toLowerCase() === address.toLowerCase()
      );
      if (profile) {
        return profile;
      }
    }
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    // Continue execution if localStorage fails
  }

  return undefined;
}

// Save a credit profile to localStorage
export function saveProfileToLocalStorage(profile: CreditProfile): void {
  try {
    // Get existing profiles
    const existingProfilesJSON = localStorage.getItem("gnosis_credit_profiles");
    let profiles: CreditProfile[] = [];

    if (existingProfilesJSON) {
      profiles = JSON.parse(existingProfilesJSON);
    }

    // Check if profile for this address already exists
    const existingIndex = profiles.findIndex(
      (p) => p.address.toLowerCase() === profile.address.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Update existing profile
      profiles[existingIndex] = profile;
    } else {
      // Add new profile
      profiles.push(profile);
    }

    // Save back to localStorage
    localStorage.setItem("gnosis_credit_profiles", JSON.stringify(profiles));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
    // Silently fail if localStorage is not available
  }
}

export function getScoreClass(score: number): string {
  if (score >= 90) return "text-emerald-500";
  if (score >= 75) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

/**
 * Gets credit level details based on the total score
 */
export function getCreditLevelDetails(score: number): {
  name: string;
  description: string;
  borrowingBoost: string;
  interestTier: string;
} {
  if (score >= 90) {
    return {
      name: "Level S – Sovereign",
      description:
        "Top-tier trusted user. DAO-active, highly connected, and financially sound.",
      borrowingBoost: "+30% borrowing limit",
      interestTier: "0.8x Aave base rate",
    };
  } else if (score >= 75) {
    return {
      name: "Level A – Ally",
      description:
        "Strong reputation across multiple modules. Safe user & active voter.",
      borrowingBoost: "+20% borrowing limit",
      interestTier: "1x Aave base rate",
    };
  } else if (score >= 60) {
    return {
      name: "Level B – Builder",
      description: "Average DeFi user, some participation, low-risk borrower.",
      borrowingBoost: "Normal limit (base level)",
      interestTier: "1.2x Aave base rate",
    };
  } else if (score >= 40) {
    return {
      name: "Level C – Citizen",
      description: "Limited reputation; newer or low activity user.",
      borrowingBoost: "-20% borrowing limit",
      interestTier: "1.5x Aave base rate",
    };
  } else {
    return {
      name: "Level D – Dormant",
      description:
        "High risk or unknown user. No governance history or social proof.",
      borrowingBoost: "-50% limit or ineligible",
      interestTier: "1.8x Aave base rate",
    };
  }
}

/**
 * Generates a random credit profile for a new user with an average score above 70
 */
export function generateRandomCreditProfile(address: Address): CreditProfile {
  // Define minimum dimension scores to ensure average is above 70
  const minFinancialScore = 70;
  const minGovernanceScore = 60;
  const minSocialScore = 75;

  // Generate random scores with minimums
  let financialScore =
    Math.floor(Math.random() * (100 - minFinancialScore + 1)) +
    minFinancialScore;
  let governanceScore =
    Math.floor(Math.random() * (100 - minGovernanceScore + 1)) +
    minGovernanceScore;
  let socialScore =
    Math.floor(Math.random() * (100 - minSocialScore + 1)) + minSocialScore;

  // Define all possible metrics
  const financialMetrics = [
    { name: "Borrow & repay > 5 times", value: false, impact: 30 },
    { name: "Current Health Factor < 6", value: false, impact: 40 },
    { name: "Active Safe Wallet User", value: false, impact: 30 },
    { name: "Active Cow Swaps User", value: false, impact: 30 },
  ];

  const governanceMetrics = [
    { name: ">10 Snapshot votes", value: false, impact: 40 },
    { name: "1–9 Snapshot votes", value: false, impact: 20 },
    { name: "Published at least 1 proposal", value: false, impact: 30 },
    { name: "Stakes GNO tokens", value: false, impact: 30 },
  ];

  const socialMetrics = [
    {
      name: "Transfers with high-reputation wallets",
      value: false,
      impact: 40,
    },
    { name: "Multisig with known DAO addresses", value: false, impact: 30 },
    { name: "Uses identity protocols", value: false, impact: 30 },
  ];

  // Adjust metrics based on target scores
  adjustMetricsBasedOnScore(financialMetrics, financialScore);
  adjustMetricsBasedOnScore(governanceMetrics, governanceScore);
  adjustMetricsBasedOnScore(socialMetrics, socialScore);

  // Recalculate dimension scores based on enabled metrics for accuracy
  financialScore = recalculateDimensionScore(financialMetrics);
  governanceScore = recalculateDimensionScore(governanceMetrics);
  socialScore = recalculateDimensionScore(socialMetrics);

  // Calculate total score using the weights from the formula
  const totalScore = Math.round(
    financialScore * 0.4 + governanceScore * 0.3 + socialScore * 0.3
  );

  // Ensure total score is at least 70
  let attemptCount = 0;
  let adjustedFinancialScore = financialScore;
  let adjustedGovernanceScore = governanceScore;
  let adjustedSocialScore = socialScore;
  let adjustedTotalScore = totalScore;

  // If score is below 70, boost it by enabling more metrics
  while (adjustedTotalScore < 70 && attemptCount < 3) {
    attemptCount++;

    // Choose the dimension with the lowest score to boost
    if (
      adjustedFinancialScore <= adjustedGovernanceScore &&
      adjustedFinancialScore <= adjustedSocialScore
    ) {
      // Boost financial by enabling more metrics
      const disabledMetrics = financialMetrics.filter((m) => !m.value);
      if (disabledMetrics.length > 0) {
        const index = Math.floor(Math.random() * disabledMetrics.length);
        disabledMetrics[index].value = true;
        adjustedFinancialScore = recalculateDimensionScore(financialMetrics);
      }
    } else if (adjustedGovernanceScore <= adjustedSocialScore) {
      // Boost governance
      const disabledMetrics = governanceMetrics.filter((m) => !m.value);
      if (disabledMetrics.length > 0) {
        const index = Math.floor(Math.random() * disabledMetrics.length);
        disabledMetrics[index].value = true;
        adjustedGovernanceScore = recalculateDimensionScore(governanceMetrics);
      }
    } else {
      // Boost social
      const disabledMetrics = socialMetrics.filter((m) => !m.value);
      if (disabledMetrics.length > 0) {
        const index = Math.floor(Math.random() * disabledMetrics.length);
        disabledMetrics[index].value = true;
        adjustedSocialScore = recalculateDimensionScore(socialMetrics);
      }
    }

    // Recalculate total score
    adjustedTotalScore = Math.round(
      adjustedFinancialScore * 0.4 +
        adjustedGovernanceScore * 0.3 +
        adjustedSocialScore * 0.3
    );
  }

  // If we still don't have 70+, directly adjust dimension scores
  if (adjustedTotalScore < 70) {
    const deficit = 70 - adjustedTotalScore;
    const adjustment = Math.ceil(deficit / 0.4); // Financial has the highest weight
    adjustedFinancialScore = Math.min(100, adjustedFinancialScore + adjustment);
    adjustedTotalScore = Math.round(
      adjustedFinancialScore * 0.4 +
        adjustedGovernanceScore * 0.3 +
        adjustedSocialScore * 0.3
    );
  }

  // Get level details based on the final total score
  const level = getCreditLevelDetails(adjustedTotalScore);

  return {
    address,
    dimensions: {
      financial: {
        score: adjustedFinancialScore,
        metrics: financialMetrics,
      },
      governance: {
        score: adjustedGovernanceScore,
        metrics: governanceMetrics,
      },
      social: {
        score: adjustedSocialScore,
        metrics: socialMetrics,
      },
    },
    totalScore: adjustedTotalScore,
    level,
  };
}

/**
 * Calculate dimension score based on the sum of enabled metrics' impacts
 */
function recalculateDimensionScore(
  metrics: { name: string; value: boolean; impact: number }[]
): number {
  const totalPossibleImpact = metrics.reduce((sum, m) => sum + m.impact, 0);
  const actualImpact = metrics
    .filter((m) => m.value)
    .reduce((sum, m) => sum + m.impact, 0);

  // Calculate percentage of impact achieved, convert to score
  return totalPossibleImpact > 0
    ? Math.round((actualImpact / totalPossibleImpact) * 100)
    : 0;
}

/**
 * Helper function to adjust metric values to better match dimension scores
 */
function adjustMetricsBasedOnScore(
  metrics: { name: string; value: boolean; impact: number }[],
  dimensionScore: number
): void {
  // Calculate total possible impact
  const totalPossibleImpact = metrics.reduce(
    (sum, metric) => sum + metric.impact,
    0
  );

  // Sort metrics by impact (highest first)
  metrics.sort((a, b) => b.impact - a.impact);

  // Reset all metrics to false
  metrics.forEach((metric) => {
    metric.value = false;
  });

  // Calculate how many metrics we need to enable to reach the dimension score
  let currentImpact = 0;
  const targetImpact = (dimensionScore / 100) * totalPossibleImpact;

  // Enable metrics until we reach or exceed the target impact
  for (const metric of metrics) {
    // Add some randomness - for higher scores, more likely to enable metrics
    const enableProbability = dimensionScore / 100;
    const shouldEnable = Math.random() < enableProbability;

    if (shouldEnable && currentImpact < targetImpact) {
      metric.value = true;
      currentImpact += metric.impact;
    }
  }

  // Ensure at least one metric is enabled for non-zero scores
  if (dimensionScore > 0 && !metrics.some((m) => m.value)) {
    metrics[0].value = true;
  }

  // Shuffle the array to randomize the order again
  for (let i = metrics.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [metrics[i], metrics[j]] = [metrics[j], metrics[i]];
  }
}
