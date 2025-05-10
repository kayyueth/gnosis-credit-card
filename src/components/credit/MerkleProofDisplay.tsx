import { generateMerkleTree } from "@/lib/merkleTree";
import {
  getTransactionHistory,
  OffChainTransactionHistory,
} from "@/lib/offChainSpendingService";

interface MerkleProofDisplayProps {
  transaction: OffChainTransactionHistory;
  userAddress: string;
}

export function MerkleProofDisplay({
  transaction,
  userAddress,
}: MerkleProofDisplayProps) {
  // Get all transactions up to the current one
  const allTransactions = getTransactionHistory(userAddress)
    .filter((tx) => tx.timestamp <= transaction.timestamp)
    .sort((a, b) => a.timestamp - b.timestamp);

  const merkleProof = generateMerkleTree(allTransactions);

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
        <p className="text-gray-500 mt-2">
          <span className="font-medium">Note:</span> This proof includes all
          transactions up to this one
        </p>
      </div>
    </div>
  );
}
