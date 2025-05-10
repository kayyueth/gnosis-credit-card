import { utils } from "ethers";
import { MerkleTree } from "merkletreejs";
import keccak256Hash from "keccak256";

export interface MerkleProof {
  root: string;
  proof: string[];
  leaf: string;
}

export function generateMerkleTree(transactions: any[]): MerkleProof {
  // Sort transactions by timestamp to ensure consistent ordering
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  // Create leaves by hashing each transaction
  const leaves = sortedTransactions.map((tx) => {
    // Create a deterministic string representation of the transaction
    const txString = JSON.stringify({
      id: tx.id,
      amount: tx.amount,
      merchant: tx.merchant,
      category: tx.category,
      description: tx.description,
      timestamp: tx.timestamp,
      currency: tx.currency,
      userAddress: tx.userAddress.toLowerCase(), // Normalize address
    });

    // Hash the transaction string using keccak256Hash directly
    return keccak256Hash(txString);
  });

  // Create Merkle tree
  const tree = new MerkleTree(leaves, keccak256Hash, { sortPairs: true });

  // Get root
  const root = tree.getRoot().toString("hex");

  // Generate proof for each leaf
  const proofs = leaves.map((leaf, index) => {
    const proof = tree.getProof(leaf, index);
    return {
      root,
      proof: proof.map((p) => p.data.toString("hex")),
      leaf: leaf.toString("hex"),
    };
  });

  return {
    root,
    proof: proofs[0].proof, // Return proof for the first transaction
    leaf: proofs[0].leaf, // Return leaf for the first transaction
  };
}

export function verifyMerkleProof(proof: MerkleProof): boolean {
  const tree = new MerkleTree([proof.leaf], keccak256Hash, { sortPairs: true });
  return tree.verify(proof.proof, proof.leaf, proof.root);
}
