export enum CHAIN_TYPE {
  SOLANA,
  EVM,
  ZK_EVM,
  SUI,
  ROUTER,
  TON,
  COSMOS,
  POLKADOT,
  TRON,
  NONE,
}

export enum CHAIN_ENVIRONMENT {
  TESTNET,
  MAINNET,
  ALPHA,
  NONE,
}

export const CHAIN_TYPE_FROM_STRING = (chainType: string) => {
  switch (chainType) {
    case "SOLANA":
      return CHAIN_TYPE.SOLANA;
    case "EVM":
      return CHAIN_TYPE.EVM;
    case "ZK_EVM":
      return CHAIN_TYPE.ZK_EVM;
    case "SUI":
      return CHAIN_TYPE.SUI;
    case "ROUTER":
      return CHAIN_TYPE.ROUTER;
    case "COSMOS":
      return CHAIN_TYPE.COSMOS;
    case "POLKADOT":
      return CHAIN_TYPE.POLKADOT;
    case "TRON":
      return CHAIN_TYPE.TRON;
    case "NONE":
      return CHAIN_TYPE.NONE;
    default:
      return CHAIN_TYPE.NONE;
  }
};
