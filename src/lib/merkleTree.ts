import { utils } from "ethers";
import { MerkleTree } from "merkletreejs";

export interface MerkleProof {
  root: string;
  proof: string[];
  leaf: string;
}

// Custom hash function using ethers
function hashFunction(data: Buffer): Buffer {
  return Buffer.from(utils.keccak256(data).slice(2), "hex");
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

    // Hash the transaction string using ethers
    return hashFunction(Buffer.from(txString));
  });

  // Create Merkle tree
  const tree = new MerkleTree(leaves, hashFunction, { sortPairs: true });

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
  const tree = new MerkleTree([Buffer.from(proof.leaf, "hex")], hashFunction, {
    sortPairs: true,
  });
  return tree.verify(proof.proof, Buffer.from(proof.leaf, "hex"), proof.root);
}
