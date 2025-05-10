import { create } from "zustand";
import { persist } from "zustand/middleware";

type AddressMapping = {
  [metamaskAddress: string]: string;
};

type SafeStore = {
  safeAddress: string;
  setSafeAddress: (address: string) => void;
  useFallbackAuth: boolean;
  setUseFallbackAuth: (useIt: boolean) => void;
  addressMappings: AddressMapping;
  mapMetamaskToSafe: (metamaskAddress: string, safeAddress: string) => void;
  getSafeForMetamask: (metamaskAddress: string) => string | undefined;
  resetMappings: () => void;
};

export const useSafeStore = create<SafeStore>()(
  persist(
    (set, get) => ({
      safeAddress: "",
      setSafeAddress: (address: string) => set({ safeAddress: address }),
      useFallbackAuth: false,
      setUseFallbackAuth: (useIt) => set({ useFallbackAuth: useIt }),
      addressMappings: {},
      mapMetamaskToSafe: (metamaskAddress: string, safeAddress: string) =>
        set((state) => ({
          addressMappings: {
            ...state.addressMappings,
            [metamaskAddress.toLowerCase()]: safeAddress,
          },
        })),
      getSafeForMetamask: (metamaskAddress: string) => {
        return get().addressMappings[metamaskAddress.toLowerCase()];
      },
      resetMappings: () => set({ addressMappings: {} }),
    }),
    {
      name: "safe-store",
    }
  )
);
