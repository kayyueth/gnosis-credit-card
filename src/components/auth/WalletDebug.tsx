import React from "react";
import { useWalletStatus } from "@/hooks/useWalletStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WalletDebug() {
  const walletStatus = useWalletStatus();

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Wallet Debug Info</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs font-mono space-y-1">
          <p>
            <span className="font-semibold">Status:</span> {walletStatus.status}
          </p>
          <p>
            <span className="font-semibold">Connected:</span>{" "}
            {walletStatus.isConnected ? "Yes" : "No"}
          </p>
          {walletStatus.address && (
            <p>
              <span className="font-semibold">Address:</span>{" "}
              {walletStatus.address}
            </p>
          )}
          {walletStatus.chainId && (
            <p>
              <span className="font-semibold">Chain ID:</span>{" "}
              {walletStatus.chainId}
            </p>
          )}
          {walletStatus.connector && (
            <p>
              <span className="font-semibold">Connector:</span>{" "}
              {walletStatus.connector}
            </p>
          )}
          {walletStatus.error && (
            <p className="text-red-500">
              <span className="font-semibold">Error:</span> {walletStatus.error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
