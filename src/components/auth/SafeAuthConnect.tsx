"use client";

import { useEffect, useState, useCallback } from "react";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3Auth } from "@web3auth/modal";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { Loader2, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as ethersLib from "ethers";
import { useSafeStore } from "@/store/useSafeStore";
import type { IProvider } from "@web3auth/base";

type Provider = IProvider | ethersLib.providers.Web3Provider;

// CSS for the custom animation
const fadeInDownAnimation = `
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translate3d(0, -20px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
`;

export default function SafeAuthConnect() {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [eoaAddress, setEoaAddress] = useState<string | null>(null);
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isWalletActivated, setIsWalletActivated] = useState(false);
  const {
    setSafeAddress: setGlobalSafeAddress,
    getSafeForMetamask,
    mapMetamaskToSafe,
    useFallbackAuth,
    setUseFallbackAuth,
    resetMappings,
  } = useSafeStore();
  const [isCopied, setIsCopied] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [showFallbackSuggestion, setShowFallbackSuggestion] = useState(false);

  // Inject the CSS animation
  useEffect(() => {
    // Create a style element
    const style = document.createElement("style");
    style.id = "safe-auth-animations";
    style.innerHTML = fadeInDownAnimation;

    // Add it to the document head
    document.head.appendChild(style);

    // Clean up on unmount
    return () => {
      const existingStyle = document.getElementById("safe-auth-animations");
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Auto-expand when connected
  useEffect(() => {
    if (provider) {
      setIsExpanded(true);
    }
  }, [provider]);

  // Initialize Web3Auth and restore session
  useEffect(() => {
    const initWeb3Auth = async () => {
      const chainConfig = {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId: "0x27d8", // Chiado Testnet
        rpcTarget: "https://rpc.chiadochain.net",
      };

      const privateKeyProvider = new EthereumPrivateKeyProvider({
        config: { chainConfig },
      });

      const web3authInstance = new Web3Auth({
        clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID!,
        web3AuthNetwork: "sapphire_devnet",
        privateKeyProvider,
      });

      const openloginAdapter = new OpenloginAdapter({
        adapterSettings: {
          uxMode: "popup",
          // Enable session persistence
          sessionTime: 86400, // 24 hours in seconds
          storageKey: "session", // Use the default session storage key
        },
      });

      web3authInstance.configureAdapter(openloginAdapter);

      await web3authInstance.initModal();
      setWeb3auth(web3authInstance);

      // Check if there's an existing session
      if (web3authInstance.connected) {
        console.log("Found existing Web3Auth session");
        const web3authProvider = await web3authInstance.connect();
        if (web3authProvider) {
          setProvider(web3authProvider);

          // Get the EOA address from the provider
          const accounts = (await web3authProvider.request({
            method: "eth_accounts",
          })) as string[];

          const address = accounts[0];
          console.log("Restored Web3Auth session with address:", address);

          // Restore Safe wallet mapping
          const existingSafe = getSafeForMetamask(address);
          if (existingSafe) {
            console.log("Restored existing Safe wallet:", existingSafe);
            setSafeAddress(existingSafe);
            setEoaAddress(address);
            setGlobalSafeAddress(existingSafe);
          }
        }
      }
    };

    initWeb3Auth();
  }, [getSafeForMetamask, setGlobalSafeAddress]);

  // Update global safe store when our local state changes
  useEffect(() => {
    if (safeAddress) {
      setGlobalSafeAddress(safeAddress);

      // Check if the Safe wallet is already activated by checking its balance
      const checkActivation = async () => {
        try {
          // Use public provider to avoid prompting user if not needed
          const provider = new ethersLib.providers.JsonRpcProvider(
            "https://rpc.chiadochain.net"
          );
          const balance = await provider.getBalance(safeAddress);

          if (!balance.isZero()) {
            console.log(
              "Safe already has balance of",
              ethersLib.utils.formatEther(balance)
            );
            setIsWalletActivated(true);
          }
        } catch (err) {
          console.error("Error checking Safe activation status:", err);
        }
      };

      checkActivation();
    }
  }, [safeAddress, setGlobalSafeAddress]);

  // Handle fallback connection with MetaMask directly
  const connectWithFallback = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Directly connect to MetaMask
      if (!window.ethereum) {
        throw new Error("MetaMask not detected. Please install MetaMask.");
      }

      const ethersProvider = new ethersLib.providers.Web3Provider(
        window.ethereum
      );
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const signer = ethersProvider.getSigner();
      const metamaskAddress = await signer.getAddress();

      console.log("Connecting with MetaMask address:", metamaskAddress);

      // Force clear any previous state to ensure we're not reusing anything
      setEoaAddress(null);
      setSafeAddress(null);
      setIsWalletActivated(false);
      setGlobalSafeAddress("");

      // Check if this MetaMask address already has a Safe wallet
      const existingSafe = getSafeForMetamask(metamaskAddress);
      console.log("Existing Safe for this address:", existingSafe || "None");

      let safeWalletAddress: string;

      if (existingSafe) {
        // If there's an existing Safe, use it
        console.log(
          `Using existing Safe wallet for address ${metamaskAddress}: ${existingSafe}`
        );
        setSafeAddress(existingSafe);
        safeWalletAddress = existingSafe;
      } else {
        // Generate truly unique Safe address for this MetaMask address
        // Add the address directly to the salt to ensure uniqueness
        const uniqueSalt = ethersLib.utils.keccak256(
          ethersLib.utils.toUtf8Bytes(
            `gnosis-pay-credit-card-${metamaskAddress.toLowerCase()}`
          )
        );

        console.log("Generated unique salt for address:", metamaskAddress);
        console.log("Salt:", uniqueSalt);

        const addressHash = ethersLib.utils.keccak256(
          ethersLib.utils.defaultAbiCoder.encode(
            ["address", "bytes32"],
            [metamaskAddress, uniqueSalt]
          )
        );

        // Use a deterministic address instead of deploying a real Safe
        const simulatedSafeAddress = "0x" + addressHash.slice(26);
        console.log("New Safe address generated:", simulatedSafeAddress);

        setSafeAddress(simulatedSafeAddress);
        safeWalletAddress = simulatedSafeAddress;

        // Map this MetaMask address to the new Safe address
        mapMetamaskToSafe(metamaskAddress, simulatedSafeAddress);
        console.log(
          `Created new Safe wallet for address ${metamaskAddress}: ${simulatedSafeAddress}`
        );
      }

      // Update EOA address after we've checked for existing mappings
      setEoaAddress(metamaskAddress);

      // Check if the wallet is already activated
      const balance = await ethersProvider.getBalance(safeWalletAddress);
      if (!balance.isZero()) {
        console.log(
          "Safe already has balance:",
          ethersLib.utils.formatEther(balance)
        );
        setIsWalletActivated(true);
      }

      setProvider(ethersProvider);
    } catch (err) {
      console.error("Fallback MetaMask connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [getSafeForMetamask, mapMetamaskToSafe, setGlobalSafeAddress]);

  // Use different connection method based on fallback setting
  useEffect(() => {
    if (useFallbackAuth && !isConnecting) {
      console.log(
        "Using fallback auth - attempting to connect with MetaMask directly"
      );
      connectWithFallback();
    }
  }, [useFallbackAuth, isConnecting, connectWithFallback]);

  // Listen for MetaMask account changes and update Safe wallet accordingly
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length > 0) {
          const newAddress = accounts[0];
          console.log("MetaMask account changed:", newAddress);

          // Clear current state when account changes
          if (
            eoaAddress &&
            newAddress.toLowerCase() !== eoaAddress.toLowerCase()
          ) {
            console.log("Different account detected, resetting connection");
            setProvider(null);
            setSafeAddress(null);
            setEoaAddress(null);
            setIsWalletActivated(false);

            // If we're using fallback auth, immediately reconnect with the new account
            if (useFallbackAuth) {
              setTimeout(() => connectWithFallback(), 100);
            }
          }
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
      };
    }
  }, [eoaAddress, useFallbackAuth, connectWithFallback]);

  // Function to track connection failure attempts and suggest fallback auth
  useEffect(() => {
    // Check localStorage for previous connection failures
    const connectionFailures = localStorage.getItem("web3auth_failures");
    // If there have been 3 or more failures, show the fallback suggestion
    if (
      connectionFailures &&
      parseInt(connectionFailures) >= 2 &&
      !useFallbackAuth
    ) {
      setShowFallbackSuggestion(true);
    }
  }, [useFallbackAuth]);

  const handleSignIn = async () => {
    if (useFallbackAuth) {
      connectWithFallback();
      return;
    }

    if (!web3auth) return;

    setIsConnecting(true);
    setShowFallbackSuggestion(false);

    try {
      const web3authProvider = await web3auth.connect();
      // If the user closed the modal, web3authProvider will be null
      if (!web3authProvider) {
        console.log("User closed the Web3Auth modal");

        // Increment the connection failure counter
        const connectionFailures =
          localStorage.getItem("web3auth_failures") || "0";
        const newFailureCount = parseInt(connectionFailures) + 1;
        localStorage.setItem("web3auth_failures", newFailureCount.toString());

        // If it's been closed multiple times, suggest the fallback
        if (newFailureCount >= 2) {
          setShowFallbackSuggestion(true);
        }

        setIsConnecting(false);
        return;
      }

      // Reset failure counter on successful connection
      localStorage.setItem("web3auth_failures", "0");

      setProvider(web3authProvider);

      // Get the EOA address from the provider
      const accounts = (await web3authProvider.request({
        method: "eth_accounts",
      })) as string[];

      const address = accounts[0];

      console.log("Web3Auth connected with address:", address);

      // Force clear previous state
      setEoaAddress(null);
      setSafeAddress(null);
      setIsWalletActivated(false);
      setGlobalSafeAddress("");

      // Check if this web3auth address already has a Safe wallet
      const existingSafe = getSafeForMetamask(address);
      console.log("Existing Safe for this address:", existingSafe || "None");

      if (existingSafe) {
        // If there's an existing Safe, use it
        console.log(
          `Using existing Safe wallet for address ${address}: ${existingSafe}`
        );
        setSafeAddress(existingSafe);
      } else {
        // Generate truly unique Safe address for this account
        // Add the address directly to the salt to ensure uniqueness
        const uniqueSalt = ethersLib.utils.keccak256(
          ethersLib.utils.toUtf8Bytes(
            `gnosis-pay-credit-card-${address.toLowerCase()}`
          )
        );

        console.log("Generated unique salt for address:", address);
        console.log("Salt:", uniqueSalt);

        const addressHash = ethersLib.utils.keccak256(
          ethersLib.utils.defaultAbiCoder.encode(
            ["address", "bytes32"],
            [address, uniqueSalt]
          )
        );

        // Use a deterministic address instead of deploying a real Safe
        const simulatedSafeAddress = "0x" + addressHash.slice(26);
        console.log("New Safe address generated:", simulatedSafeAddress);

        setSafeAddress(simulatedSafeAddress);

        // Map this address to the new Safe address
        mapMetamaskToSafe(address, simulatedSafeAddress);
        console.log(
          `Created new Safe wallet for address ${address}: ${simulatedSafeAddress}`
        );
      }

      // Update EOA address after we've checked for existing mappings
      setEoaAddress(address);
    } catch (err: Error | unknown) {
      console.error("Web3Auth sign-in failed:", err);
      const error = err as Error;

      // Increment the connection failure counter
      const connectionFailures =
        localStorage.getItem("web3auth_failures") || "0";
      const newFailureCount = parseInt(connectionFailures) + 1;
      localStorage.setItem("web3auth_failures", newFailureCount.toString());

      // Check for user closed modal error
      if (
        error?.message?.includes("modal closed") ||
        error?.message?.includes("User closed") ||
        error?.message === "Error: User closed the modal"
      ) {
        console.log("User closed the Web3Auth modal");

        // If this happens multiple times, suggest fallback
        if (newFailureCount >= 2) {
          setShowFallbackSuggestion(true);
        }
      } else if (error?.message?.includes("RPC Error")) {
        console.log("RPC connection error, consider using fallback auth");
        setShowFallbackSuggestion(true);
      }

      // Don't show alerts here as it creates a poor UX when user intentionally closes modal
    } finally {
      setIsConnecting(false);
    }
  };

  const handleActivateSafe = async () => {
    if (!safeAddress) return;

    // First check if we've already activated this wallet using window.ethereum
    try {
      const ethersProvider = new ethersLib.providers.Web3Provider(
        window.ethereum
      );
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const signer = ethersProvider.getSigner();
      const senderAddress = await signer.getAddress();
      console.log("Checking activation from MetaMask address:", senderAddress);

      // Check if this wallet already has a balance (meaning it's already activated)
      const balance = await ethersProvider.getBalance(safeAddress);
      if (!balance.isZero()) {
        console.log(
          "✅ Safe already activated - has balance:",
          ethersLib.utils.formatEther(balance)
        );
        setIsWalletActivated(true);
        return;
      }
    } catch (err) {
      console.error("Error checking Safe balance:", err);
    }

    setIsActivating(true);

    try {
      const ethersProvider = new ethersLib.providers.Web3Provider(
        window.ethereum
      );
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const signer = ethersProvider.getSigner();
      const senderAddress = await signer.getAddress();
      console.log("Activating Safe from MetaMask address:", senderAddress);

      const tx = await signer.sendTransaction({
        to: safeAddress,
        value: ethersLib.utils.parseEther("0.01"),
      });

      console.log("Tx sent:", tx.hash);

      await tx.wait();
      console.log("✅ Safe activated by xDAI transfer!");

      setIsWalletActivated(true);
    } catch (err: any) {
      console.error("Error activating Safe:", err);
      alert("Transaction failed: " + err.message);
    } finally {
      setIsActivating(false);
    }
  };

  const handleSignOut = async () => {
    if (!web3auth) return;
    await web3auth.logout();
    setProvider(null);
    setEoaAddress(null);
    setSafeAddress(null);
    setIsWalletActivated(false);
    setGlobalSafeAddress("");
  };

  const handleResetMappings = async () => {
    if (!eoaAddress) {
      console.log("No EOA address found to reset");
      return;
    }

    // Clear the Safe wallet mapping for this specific EOA
    resetMappings();
    console.log("✅ Cleared Safe wallet mapping for:", eoaAddress);

    // Reset Safe-related state
    setSafeAddress(null);
    setIsWalletActivated(false);
    setGlobalSafeAddress("");

    // Generate a new Safe wallet for the same EOA
    const uniqueSalt = ethersLib.utils.keccak256(
      ethersLib.utils.toUtf8Bytes(
        `gnosis-pay-credit-card-${eoaAddress.toLowerCase()}-${Date.now()}`
      )
    );

    console.log("Generated new unique salt for address:", eoaAddress);
    console.log("Salt:", uniqueSalt);

    const addressHash = ethersLib.utils.keccak256(
      ethersLib.utils.defaultAbiCoder.encode(
        ["address", "bytes32"],
        [eoaAddress, uniqueSalt]
      )
    );

    // Generate new Safe address
    const newSafeAddress = "0x" + addressHash.slice(26);
    console.log("New Safe address generated:", newSafeAddress);

    // Set the new Safe address
    setSafeAddress(newSafeAddress);
    setGlobalSafeAddress(newSafeAddress);

    // Map the EOA to the new Safe address
    mapMetamaskToSafe(eoaAddress, newSafeAddress);
    console.log(
      `Created new Safe wallet for address ${eoaAddress}: ${newSafeAddress}`
    );
  };

  // Handle copying address to clipboard
  const copyToClipboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (safeAddress) {
      navigator.clipboard.writeText(safeAddress);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  };

  // Toggle showing full address
  const toggleFullAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFullAddress(!showFullAddress);
  };

  // Collapsed view - just shows status and toggle
  const collapsedView = (
    <div
      className="w-full flex items-center justify-between p-3 cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      onClick={() => setIsExpanded(true)}
    >
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 512 512"
          className="h-4 w-4 text-purple-600"
        >
          <path
            fill="currentColor"
            d="M256 42.667c117.803 0 213.333 95.53 213.333 213.333S373.803 469.333 256 469.333 42.667 373.803 42.667 256 138.197 42.667 256 42.667zm0 42.666C161.898 85.333 85.333 161.898 85.333 256S161.898 426.667 256 426.667 426.667 350.102 426.667 256 350.102 85.333 256 85.333zm72.533 100.267l-89.6 89.6-44.8-44.8L172.8 251.733l66.133 66.134 111.734-111.734-22.134-20.533z"
          />
        </svg>

        <span className="text-sm font-medium">Safe Authentication</span>
      </div>

      <div className="flex items-center">
        {provider ? (
          <span className="mr-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            Connected
          </span>
        ) : (
          <span className="mr-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            Not Connected
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </div>
    </div>
  );

  // Expanded view - full component with absolute positioning
  const expandedView = (
    <div className="relative w-full">
      {/* Invisible placeholder to maintain the same height in the layout */}
      <div className="opacity-0 pointer-events-none">{collapsedView}</div>

      {/* Absolutely positioned modal */}
      <div
        className="absolute top-0 right-0 z-50 w-80 shadow-xl transform transition-all duration-300 ease-in-out"
        style={{ animation: "fadeInDown 0.3s ease-in-out" }}
      >
        <div
          id="safe-auth-expanded"
          className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
        >
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  className="h-5 w-5 text-purple-600"
                >
                  <path
                    fill="currentColor"
                    d="M256 42.667c117.803 0 213.333 95.53 213.333 213.333S373.803 469.333 256 469.333 42.667 373.803 42.667 256 138.197 42.667 256 42.667zm0 42.666C161.898 85.333 85.333 161.898 85.333 256S161.898 426.667 256 426.667 426.667 350.102 426.667 256 350.102 85.333 256 85.333zm72.533 100.267l-89.6 89.6-44.8-44.8L172.8 251.733l66.133 66.134 111.734-111.734-22.134-20.533z"
                  />
                </svg>
                Safe Authentication
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Connect securely with Web3Auth
            </p>
          </div>

          <div className="p-6">
            {provider ? (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Status
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 font-medium">
                      Connected
                    </span>
                  </div>

                  <div className="flex flex-col pt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Safe Address
                    </span>
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                      <code
                        className="text-xs font-mono bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded flex-1 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                        onClick={toggleFullAddress}
                        title={
                          showFullAddress
                            ? "Click to show shortened address"
                            : "Click to show full address"
                        }
                      >
                        {safeAddress &&
                          (showFullAddress
                            ? safeAddress
                            : `${safeAddress.substring(
                                0,
                                6
                              )}...${safeAddress.substring(
                                safeAddress.length - 4
                              )}`)}
                      </code>
                      <button
                        className={`ml-2 p-1 rounded text-sm transition-colors ${
                          isCopied
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                        onClick={copyToClipboard}
                        title={isCopied ? "Copied!" : "Copy address"}
                        disabled={isCopied}
                      >
                        {isCopied ? (
                          <div className="flex items-center">
                            <Check className="h-4 w-4 mr-1" />
                            <span className="text-xs">Copied</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <Copy className="h-4 w-4 mr-1" />
                            <span className="text-xs">Copy</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Wallet Status
                    </span>
                    <div className="flex items-center mt-1">
                      <div
                        className="w-2 h-2 rounded-full mr-2"
                        style={{
                          backgroundColor: isWalletActivated
                            ? "#10b981"
                            : "#f59e0b",
                        }}
                      ></div>
                      <span className="text-xs">
                        {isWalletActivated ? "Activated" : "Pending Activation"}
                      </span>
                    </div>
                  </div>
                </div>

                {!isWalletActivated && (
                  <>
                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                      <p className="mb-1 font-medium">Wallet Activation</p>
                      <p>
                        Clicking the button below will transfer 0.01 xDAI from
                        your connected wallet to your Safe wallet address. This
                        transaction is necessary to fund and activate your Safe
                        wallet.
                      </p>
                    </div>
                    <Button
                      onClick={handleActivateSafe}
                      disabled={isActivating}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                    >
                      {isActivating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Activating Safe Wallet...
                        </>
                      ) : (
                        "Activate Safe Wallet (0.01 xDAI)"
                      )}
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full border-gray-300 dark:border-gray-700 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors mb-2"
                >
                  Disconnect
                </Button>

                <Button
                  variant="outline"
                  onClick={handleResetMappings}
                  className="w-full border-gray-300 dark:border-gray-700 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-400 transition-colors text-sm"
                >
                  Reset Safe Wallet
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="text-center p-4 mb-2">
                  <div className="w-16 h-16 mx-auto bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-8 h-8 text-purple-600 dark:text-purple-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Connect with Web3Auth to generate your Safe wallet and
                    enable credit card functionality
                  </p>
                </div>

                <Button
                  onClick={handleSignIn}
                  disabled={!web3auth || isConnecting}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4 mr-2"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Connect Securely
                    </>
                  )}
                </Button>

                {showFallbackSuggestion && (
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-md w-full">
                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      Having trouble connecting?
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                      Web3Auth connection is failing. Try using simplified
                      wallet connection instead.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUseFallbackAuth(true);
                        // Reset the failure counter
                        localStorage.setItem("web3auth_failures", "0");
                        // Connect immediately using fallback
                        setTimeout(() => connectWithFallback(), 100);
                      }}
                      className="w-full text-xs border-amber-200 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800"
                    >
                      Use Simplified Connection
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-3 text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
            Powered by Safe Global & Web3Auth
          </div>
        </div>
      </div>
    </div>
  );

  // Add a click outside handler to close the expanded view
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExpanded) {
        const expandedElement = document.getElementById("safe-auth-expanded");
        if (
          expandedElement &&
          !expandedElement.contains(event.target as Node)
        ) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  return isExpanded ? expandedView : collapsedView;
}
