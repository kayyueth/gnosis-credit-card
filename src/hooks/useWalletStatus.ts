import { useAccount, useConfig, useConnect } from "wagmi";

interface WalletStatusDebug {
  status: "connected" | "connecting" | "disconnected" | "reconnecting";
  isConnected: boolean;
  address?: string;
  connector?: string;
  chainId?: number;
  error?: string;
}

export function useWalletStatus(): WalletStatusDebug {
  const { status, isConnected, address, chainId, connector } = useAccount();

  const config = useConfig();
  const { error: connectError } = useConnect();

  const debug: WalletStatusDebug = {
    status,
    isConnected,
    address: address ? address : undefined,
    connector: connector?.name,
    chainId,
    error: connectError?.message,
  };

  return debug;
}
