export interface ChainConfig {
  name: string;
  rpcUrl: string;
  wstETHAddress: string;
  lendingPoolAddress: string;
  safeAddress: string;
  stablecoinAddresses: {
    USDC: string;
    EURe: string;
  };
  gnoPointsAddress: string;
  gnosisCreditCardAddress: string;
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  10200: {
    // Gnosis Chiado testnet
    name: "Gnosis Chiado",
    rpcUrl: "https://rpc.chiado.gnosis.gateway.fm",
    wstETHAddress: "0x9fa52f7c3a19a066a9b7f2ebca4bc6340366518f",
    lendingPoolAddress: "0xF1D00F6c7E7Fc7Eda00fCe95583b8d6DD4716572",
    safeAddress: "0x2dC3fB1f38b0E88a98929F256b0967175eAE9e56",
    stablecoinAddresses: {
      USDC: "0x969a2c1c858da82fb48627df8f5726c1fe0a2e94",
      EURe: "0x137e7a3c32993cd0c15dfdf3020875322da145cd",
    },
    gnoPointsAddress: "0x70630625dCc6FDb9EFD00466A47E7d3883E6F5d5",
    gnosisCreditCardAddress: "0xd443055C84Eb7ed7134586ED4605B17072A1025f",
  },
};
