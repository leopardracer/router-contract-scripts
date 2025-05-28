export type Key = {
  key: string;
  name: string;
  private?: boolean;
};

export type Seed = {
  seed: string;
  name: string;
  private?: boolean;
};

export type ChainConfig = {
  keys: Key[];
  seeds: Seed[];
};

export type EncodedWalletType = {
  data: {
    common?: ChainConfig;
    solana?: ChainConfig;
    evm?: ChainConfig;
    sui?: ChainConfig;
    tron?: ChainConfig;
    ton?: ChainConfig;
    cosmos?: ChainConfig;
    router?: ChainConfig;
  };
  lastLogin: number;
};
