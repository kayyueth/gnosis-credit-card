import { useMemo } from "react";
import { useGnosisCreditCard } from "./useGnosisCreditCard";

export function useEffectiveCreditUsed() {
  const { userCredit } = useGnosisCreditCard();

  const effectiveCreditUsed = useMemo(() => {
    const onChainSpent = parseFloat(userCredit?.creditSpent || "0");
    const offChainSpent = parseFloat(userCredit?.offChainSpending || "0");
    return onChainSpent + offChainSpent;
  }, [userCredit]);

  return isNaN(effectiveCreditUsed) ? 0 : effectiveCreditUsed;
}
