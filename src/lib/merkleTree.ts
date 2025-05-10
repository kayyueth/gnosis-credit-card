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
  if (!transactions || transactions.length === 0) {
    console.warn("No transactions provided to generateMerkleTree");
    return { root: "", proof: [], leaf: "" };
  }

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
      userAddress: tx.userAddress?.toLowerCase() || "", // Normalize address
    });

    console.log("Transaction string:", txString);
    const leaf = hashFunction(Buffer.from(txString));
    console.log("Generated leaf:", leaf.toString("hex"));
    return leaf;
  });

  // Create Merkle tree
  const tree = new MerkleTree(leaves, hashFunction, { sortPairs: true });

  // Get root
  const root = tree.getRoot().toString("hex");
  console.log("Merkle root:", root);

  // Generate proof for each leaf
  const proofs = leaves.map((leaf, index) => {
    const proof = tree.getProof(leaf);
    const proofHex = proof.map((p) => p.data.toString("hex"));
    console.log(`Proof for leaf ${index}:`, proofHex);
    return {
      root,
      proof: proofHex,
      leaf: leaf.toString("hex"),
    };
  });

  const result = {
    root,
    proof: proofs[0].proof,
    leaf: proofs[0].leaf,
  };
  console.log("Final Merkle proof:", result);
  return result;
}

export function verifyMerkleProof(proof: MerkleProof): boolean {
  if (!proof.root || !proof.leaf || !proof.proof.length) {
    console.warn("Invalid proof provided to verifyMerkleProof");
    return false;
  }

  const leafBuffer = Buffer.from(proof.leaf, "hex");
  const tree = new MerkleTree([leafBuffer], hashFunction, { sortPairs: true });
  const proofBuffers = proof.proof.map((p) => Buffer.from(p, "hex"));
  const isValid = tree.verify(proofBuffers, leafBuffer, proof.root);
  console.log("Proof verification result:", isValid);
  return isValid;
}
