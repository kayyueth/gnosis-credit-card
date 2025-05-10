import { ethers } from "ethers";
import GnosisCreditCardABI from "@/abis/GnosisCreditCard.json";

export const CONTRACT_ADDRESS = "0x08069fE12cE51755984ae0D466ECc897f4A7984D";

export async function getChainRoots(): Promise<{ [batchId: number]: string }> {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    GnosisCreditCardABI,
    provider
  );

  const batchId = await contract.currentBatchId();
  const roots: { [batchId: number]: string } = {};

  for (let i = 1; i <= batchId; i++) {
    const root = await contract.spendingRoots(i);
    roots[i] = root.toLowerCase();
  }

  return roots;
}

export async function verifySpending(
  proof: string[],
  leaf: string,
  batchId: number
): Promise<boolean> {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    GnosisCreditCardABI,
    provider
  );

  return contract.verifySpending(
    proof.map((p) => `0x${p}`),
    `0x${leaf}`,
    batchId
  );
}
