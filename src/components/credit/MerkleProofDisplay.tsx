import { useEffect, useState } from "react";
import { generateMerkleTree } from "@/lib/merkleTree";
import { getTransactionHistory } from "@/lib/offChainSpendingService";
import { getChainRoots, verifySpending } from "@/lib/contracts";

interface MerkleProofDisplayProps {
  transaction: any;
  userAddress: string;
}

export function MerkleProofDisplay({
  transaction,
  userAddress,
}: MerkleProofDisplayProps) {
  const [matchedBatchId, setMatchedBatchId] = useState<number | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get all transactions up to the current one
  const allTransactions = getTransactionHistory(userAddress)
    .filter((tx) => tx.timestamp <= transaction.timestamp)
    .sort((a, b) => a.timestamp - b.timestamp);

  const merkleProof = generateMerkleTree(allTransactions);

  useEffect(() => {
    async function checkOnChainMatch() {
      try {
        setIsLoading(true);
        const roots = await getChainRoots();

        for (const [batchId, onChainRoot] of Object.entries(roots)) {
          if (`0x${merkleProof.root}`.toLowerCase() === onChainRoot) {
            setMatchedBatchId(Number(batchId));

            // Verify the spending proof
            const isValid = await verifySpending(
              merkleProof.proof,
              merkleProof.leaf,
              Number(batchId)
            );
            setIsVerified(isValid);
            break;
          }
        }
      } catch (error) {
        console.error("Error checking on-chain match:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkOnChainMatch();
  }, [merkleProof]);

  return (
    <div className="space-y-2">
      <p className="font-medium">Merkle Tree Details</p>
      <div className="text-xs space-y-1">
        <p>
          <span className="font-medium">Root:</span> {merkleProof.root}
        </p>
        <p>
          <span className="font-medium">Leaf:</span> {merkleProof.leaf}
        </p>
        <p>
          <span className="font-medium">Proof:</span>{" "}
          {merkleProof.proof.length > 0
            ? merkleProof.proof.join(", ")
            : "No proof available"}
        </p>

        {isLoading ? (
          <p className="text-gray-500">Checking on-chain status...</p>
        ) : matchedBatchId ? (
          <div className="space-y-1">
            <p className="text-green-600">
              ✅ This proof matches <b>batch #{matchedBatchId}</b> on-chain
            </p>
            {isVerified !== null && (
              <p className={isVerified ? "text-green-600" : "text-red-600"}>
                {isVerified ? "✅" : "❌"} Proof verification:{" "}
                <b>{isVerified ? "valid" : "invalid"}</b>
              </p>
            )}
          </div>
        ) : (
          <p className="text-yellow-600">
            ⚠️ This Merkle Root is not yet submitted to the contract
          </p>
        )}

        <p className="text-gray-500 mt-2">
          <span className="font-medium">Note:</span> This proof includes all
          transactions up to this one
        </p>
      </div>
    </div>
  );
}
