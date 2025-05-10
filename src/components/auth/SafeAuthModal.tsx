"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaApple, FaEnvelope } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import { useSafeStore } from "@/store/useSafeStore";

export type LoginProvider = "google" | "facebook" | "apple" | "email";

export interface SafeAuthModalProps {
  onConnect: (provider?: LoginProvider) => Promise<void>;
  isConnecting: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function SafeAuthModal({
  onConnect,
  isConnecting,
  disabled = false,
  children,
}: SafeAuthModalProps) {
  const [open, setOpen] = useState(false);
  const [connectingProvider, setConnectingProvider] =
    useState<LoginProvider | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const { useFallbackAuth, setUseFallbackAuth } = useSafeStore();

  const handleConnect = async (provider: LoginProvider) => {
    setConnectingProvider(provider);
    setConnectError(null);

    console.log(`Modal: Attempting to connect with ${provider}`);

    try {
      // In fallback mode, we want to use MetaMask
      if (useFallbackAuth) {
        // The onConnect handler will detect the fallback mode and use MetaMask directly
        await onConnect(provider);
        console.log(`Modal: Successfully connected with fallback auth`);
        setOpen(false);
        return;
      }

      // Regular flow - connect with the provider
      await onConnect(provider);
      console.log(`Modal: Successfully connected with ${provider}`);
      setOpen(false);
    } catch (error: unknown) {
      console.error(`Error connecting with ${provider}:`, error);
      // Handle empty error objects that might indicate connection issues
      if (
        error &&
        typeof error === "object" &&
        Object.keys(error).length === 0
      ) {
        setConnectError(
          "Connection to authentication service failed. Please try simplified mode."
        );
        // Automatically enable fallback mode after connection failure
        setUseFallbackAuth(true);
      } else if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("RPC Error")
      ) {
        setConnectError(
          "Network connection issue with authentication service. Please try simplified mode."
        );
        // Automatically enable fallback mode after connection failure
        setUseFallbackAuth(true);
      } else {
        const errorMessage =
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
            ? error.message
            : `Failed to connect with ${provider}. Please try again.`;
        setConnectError(errorMessage);
      }
    } finally {
      setConnectingProvider(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            className="w-full"
            disabled={disabled || isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect with SafeAuth"
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {useFallbackAuth
              ? "Connect Safe Wallet (Simplified)"
              : "Connect with SafeAuth"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            {useFallbackAuth
              ? "Continue with simplified connection"
              : "Choose your preferred login method"}
          </DialogDescription>
        </DialogHeader>

        {useFallbackAuth ? (
          <div className="flex flex-col space-y-4 py-4">
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2"
              onClick={() => handleConnect("google")}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Connect Wallet"
              )}
            </Button>

            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                Using simplified mode due to connectivity issues with SafeAuth
                service.
              </p>
              <p>
                This will create a simulated Safe wallet address based on your
                connected wallet.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-4 py-4">
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2"
              onClick={() => handleConnect("google")}
              disabled={isConnecting || Boolean(connectingProvider)}
            >
              {connectingProvider === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FcGoogle className="h-5 w-5 mr-2" />
              )}
              Continue with Google
            </Button>

            <Button
              variant="outline"
              className="flex items-center justify-center gap-2"
              onClick={() => handleConnect("facebook")}
              disabled={isConnecting || Boolean(connectingProvider)}
            >
              {connectingProvider === "facebook" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FaFacebook className="h-5 w-5 mr-2 text-blue-600" />
              )}
              Continue with Facebook
            </Button>

            <Button
              variant="outline"
              className="flex items-center justify-center gap-2"
              onClick={() => handleConnect("apple")}
              disabled={isConnecting || Boolean(connectingProvider)}
            >
              {connectingProvider === "apple" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FaApple className="h-5 w-5 mr-2" />
              )}
              Continue with Apple
            </Button>

            <Button
              variant="outline"
              className="flex items-center justify-center gap-2"
              onClick={() => handleConnect("email")}
              disabled={isConnecting || Boolean(connectingProvider)}
            >
              {connectingProvider === "email" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FaEnvelope className="h-5 w-5 mr-2" />
              )}
              Continue with Email
            </Button>

            {connectError && (
              <p className="text-sm text-red-500 mt-2">{connectError}</p>
            )}

            <div className="text-sm text-muted-foreground mt-4">
              <p className="mb-2">Benefits of using SafeAuth:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>No seed phrases to remember</li>
                <li>Login with familiar social accounts</li>
                <li>Enhanced security with smart contract wallet</li>
                <li>Recover wallet access easily</li>
              </ul>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
