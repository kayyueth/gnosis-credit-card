"use client";

import * as React from "react";
import {
  RainbowKitProvider,
  getDefaultWallets,
  connectorsForWallets,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { defineChain, type Chain } from "viem";

// Define Gnosis Chain (mainnet)
const gnosisChain = defineChain({
  id: 100,
  name: "Gnosis Chain",
  nativeCurrency: {
    decimals: 18,
    name: "xDAI",
    symbol: "xDAI",
  },
  rpcUrls: {
    default: { http: ["https://rpc.gnosischain.com"] },
    public: { http: ["https://rpc.gnosischain.com"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://gnosisscan.io",
    },
  },
  testnet: false,
});

// Define Gnosis Chiado testnet
const chiadoTestnet = defineChain({
  id: 10200,
  name: "Gnosis Chiado",
  nativeCurrency: {
    decimals: 18,
    name: "xDAI",
    symbol: "xDAI",
  },
  rpcUrls: {
    default: { http: ["https://rpc.chiadochain.net"] },
    public: { http: ["https://rpc.chiadochain.net"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://blockscout.chiadochain.net",
    },
  },
  testnet: true,
});

// Use custom RPC URL from environment variable if available
const customRpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

// Validate project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!projectId || projectId === "YOUR_PROJECT_ID") {
  console.error(
    "WalletConnect project ID is missing or invalid. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env.local file."
  );
}

// Create a fallback configuration for development
const { wallets } = getDefaultWallets({
  appName: "Gnosis Credit Card",
  projectId: projectId || "YOUR_PROJECT_ID",
});

const connectors = connectorsForWallets(wallets, {
  projectId: projectId || "YOUR_PROJECT_ID",
  appName: "Gnosis Credit Card",
});

// Configure chains and transports
const chains = [gnosisChain, chiadoTestnet] as const;
const transports = {
  [gnosisChain.id]: http(customRpcUrl || "https://rpc.gnosischain.com"),
  [chiadoTestnet.id]: http("https://rpc.chiado.gnosis.gateway.fm"),
};

const config = createConfig({
  chains,
  transports,
  connectors,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {mounted && children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
