import { formatEther } from "viem";
import { CHAIN_CONFIGS } from "@/config/chain";

// Default to Gnosis Chiado testnet
const DEFAULT_CHAIN_ID = 10200;
const { gnosisCreditCardAddress } = CHAIN_CONFIGS[DEFAULT_CHAIN_ID];

// Contract ABI (partial, just the functions we need)
const CREDIT_CARD_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "userCredits",
    outputs: [
      { internalType: "uint256", name: "creditSnapshot", type: "uint256" },
      { internalType: "uint256", name: "creditSpent", type: "uint256" },
      { internalType: "uint256", name: "offChainSpending", type: "uint256" },
      { internalType: "uint256", name: "lastUpdated", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function getCreditSnapshot(address: string): Promise<bigint> {
  // This is a mock implementation. In a real app, this would call the contract
  return BigInt("1000000000000000000"); // 1 ETH in wei
}

export async function getCreditSpent(address: string): Promise<bigint> {
  // This is a mock implementation. In a real app, this would call the contract
  return BigInt("500000000000000000"); // 0.5 ETH in wei
}
