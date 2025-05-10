"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isAddress } from "ethers/lib/utils";
import { useSafeStore } from "@/store/useSafeStore";
import { ethers } from "ethers";

export function SafeWalletConnect() {
  const { address: walletAddress } = useAccount();
  const { safeAddress, setSafeAddress, getSafeForMetamask, mapMetamaskToSafe } =
    useSafeStore();
  const [inputAddress, setInputAddress] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing safe wallet on component mount or wallet change
  useEffect(() => {
    if (walletAddress) {
      const existingSafe = getSafeForMetamask(walletAddress);
      if (existingSafe) {
        setSafeAddress(existingSafe);
        console.log(
          `Loaded existing Safe wallet for ${walletAddress}: ${existingSafe}`
        );
      } else if (safeAddress) {
        // If we have a safeAddress but it doesn't match the current wallet,
        // this means the MetaMask account changed. Clear the current Safe.
        console.log(
          "MetaMask account changed, clearing previous Safe connection"
        );
        setSafeAddress("");
      }
    } else {
      // No wallet connected, clear Safe address
      setSafeAddress("");
    }
  }, [walletAddress, getSafeForMetamask, setSafeAddress, safeAddress]);

  const handleConnect = async () => {
    try {
      // Validate address format
      if (!isAddress(inputAddress)) {
        setError("Invalid Ethereum address format");
        return;
      }

      // Validate that this is a Safe address
      // In a real app, you'd check this against the Safe API
      // For simplicity, we're just validating format here

      // If user is connected with wallet, map this address to the wallet
      if (walletAddress) {
        mapMetamaskToSafe(walletAddress, inputAddress);
      }

      setSafeAddress(inputAddress);
      setIsDialogOpen(false);
      setError(null);
    } catch (err) {
      console.error("Failed to connect Safe wallet:", err);
      setError("Failed to connect Safe wallet");
    }
  };

  const handleDisconnect = () => {
    setSafeAddress("");
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  // Prevent interaction if wallet is not connected
  if (!walletAddress) {
    return (
      <Button variant="outline" disabled className="w-full">
        Connect wallet first
      </Button>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="w-full">
        {safeAddress ? (
          <div className="flex items-center justify-between p-2 border rounded-md">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-violet-100 dark:bg-violet-900 rounded-md flex items-center justify-center">
                <span className="text-violet-600 dark:text-violet-300 text-sm font-medium">
                  S
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">Connected Safe</p>
                <p className="text-xs text-gray-500">
                  {formatAddress(safeAddress)}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </div>
        ) : (
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              Connect Safe Wallet
            </Button>
          </DialogTrigger>
        )}
      </div>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Safe Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="safeAddress">Safe Wallet Address</Label>
            <Input
              id="safeAddress"
              placeholder="0x..."
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
            />
            {error && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <Button onClick={handleConnect} className="w-full">
            Connect Safe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
