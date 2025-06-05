import { CHAIN_ENVIRONMENT, CHAIN_TYPE } from "../types/chains";

export const CHAINS_ID = [
  "1",
  "solana",
  "137",
  "80002",
  "router_9600-1",
  "router_9607-1",
  "8453",
  "56",
  "solana",
  "80002",
  "43113",
  "11155111",
  "router_9605-1",
];
export const CHAIN_INFOS = {
  "1": {
    rpcs: ["https://eth-pokt.nodies.app", "https://eth.llamarpc.com"],
    chainType: CHAIN_TYPE.EVM,
    chainId: "1",
    env: CHAIN_ENVIRONMENT.MAINNET,
    name: "Ethereum",
    coingeckoPlatformId: "ethereum",
    symbol: "ETH",
    urls: {
      apiURL: "https://api.etherscan.io/api",
      browserURL: "https://etherscan.io",
    },
    decimals: 18,
  },
  "8453": {
    rpcs: ["https://base.llamarpc.com"],
    chainType: CHAIN_TYPE.EVM,
    chainId: "8453",
    env: CHAIN_ENVIRONMENT.MAINNET,
    coingeckoPlatformId: "base",
    name: "Base",
    symbol: "ETH",
    urls: {
      apiURL: "https://api.basescan.org/api",
      browserURL: "https://basescan.org/",
    },
    decimals: 18,
  },
  "137": {
    rpcs: ["https://polygon.blockpi.network/v1/rpc/public"],
    chainType: CHAIN_TYPE.EVM,
    chainId: "137",
    env: CHAIN_ENVIRONMENT.MAINNET,
    name: "Polygon",
    symbol: "POL",
    coingeckoPlatformId: "polygon",
    urls: {
      apiURL: "https://api.polygonscan.com/api",
      browserURL: "https://polygonscan.com",
    },
    decimals: 18,
  },
  "56": {
    rpcs: ["https://bsc-rpc.publicnode.com", "https://1rpc.io/bnb"],
    chainType: CHAIN_TYPE.EVM,
    chainId: "56",
    env: CHAIN_ENVIRONMENT.MAINNET,
    name: "Binance",
    symbol: "BNB",
    urls: {
      apiURL: "https://api.bscscan.com/api",
      browserURL: "https://bscscan.com",
    },
    decimals: 18,
  },

  "solana": {
    rpcs: [
      "https://solana-api.instantnodes.io/token-YUxNqNhRiT9oZTevwq4140JhdRgQXA9h",
      "https://api.mainnet-beta.solana",
    ],
    chainType: CHAIN_TYPE.SOLANA,
    chainId: "solana",
    symbol: "SOL",
    coingeckoPlatformId: "solana",
    env: CHAIN_ENVIRONMENT.MAINNET,
    name: "Solana Mainnet",
    decimals: 9,
  },
  "router_9600-1": {
    url: {
      explorerGql: "https://api.explorer.routerscan.io/gql/query",
      explorerGqlWs: "wss://api.explorer.routerscan.io/gql/query",
      lcdEndpoint: "https://sentry.lcd.routerprotocol.com",
      grpcEndpoint: "https://sentry.grpcweb.routerprotocol.com",
      tmEndpoint: "https://sentry.tm.rpc.routerprotocol.com",
      rpcEndpoint: "https://sentry.evm.rpc.routerprotocol.com",
    },
    chainType: CHAIN_TYPE.ROUTER,
    chainId: "router_9600-1",
    symbol: "ROUTE",
    env: CHAIN_ENVIRONMENT.MAINNET,
    name: "Router Chain Mainnet",
    decimals: 18,
  },

  //TESTNET
  "solana-devnet": {
    rpcs: ["https://api.devnet.solana.com"],
    chainType: CHAIN_TYPE.SOLANA,
    chainId: "solana-devnet",
    env: CHAIN_ENVIRONMENT.TESTNET,
    symbol: "SOL",
    name: "Solana Devnet",
    decimals: 9,
  },
  "80084": {
    rpcs: ["https://bartio.drpc.org"],
    chainType: CHAIN_TYPE.EVM,
    chainId: "80084",
    symbol: "BERA",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "Berachain bArtio",
    decimals: 18,
    urls: {
      apiURL: "https://api.routescan.io/v2",
      browserURL: "https://bartio.beratrail.io",
    },
  },
  "998": {
    rpcs: ["https://api.hyperliquid-testnet.xyz/evm"],
    chainType: CHAIN_TYPE.EVM,
    chainId: "998",
    symbol: "L99",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "Hyperliquid Testnet",
    decimals: 18,
    urls: {
      apiURL: "https://api.routescan.io/v2",
      browserURL: "https://bartio.beratrail.io",
    },
  },
  "80002": {
    rpcs: ["https://polygon-amoy.drpc.org"],
    chainType: CHAIN_TYPE.EVM,
    chainId: "80002",
    symbol: "POL",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "Amoy",
    decimals: 18,
  },
  "43113": {
    rpcs: [
      "https://avalanche-fuji-c-chain-rpc.publicnode.com",
      "https://endpoints.omniatech.io/v1/avax/fuji/public",
    ],
    chainType: CHAIN_TYPE.EVM,
    chainId: "43113",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "Avalanche Fuji Testnet",
    symbol: "AVAX",
    urls: {
      apiURL: "https://api-testnet.snowtrace.io/api",
      browserURL: "https://testnet.snowtrace.io",
    },
    decimals: 18,
    apiKey: "QAE2JD7XIBCYB6Z6GSKNJIHKZ8XGVYM8AI",
  },
  "router_9607-1": {
    url: {
      explorerGql: "https://explorer-api.routerchain.dev/gql/query",
      explorerGqlWs: "wss://explorer-api.routerchain.dev/gql/query",
      lcdEndpoint: "https://lcd.sentry.routerchain.dev",
      grpcEndpoint: "https://grpcweb.sentry.routerchain.dev",
      tmEndpoint: "https://tmrpc.sentry.routerchain.dev",
      rpcEndpoint: "https://evmrpc.sentry.routerchain.dev",
    },
    symbol: "ROUTE",
    decimals: 18,
    chainType: CHAIN_TYPE.ROUTER,
    chainId: "router_9607-1",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "Router Chain Testnet",
  },
  "11155111": {
    rpcs: [
      "https://ethereum-sepolia-rpc.publicnode.com",
      "https://1rpc.io/sepolia	",
    ],
    chainType: CHAIN_TYPE.EVM,
    chainId: "11155111",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "Sepolia",
    symbol: "ETH",
    decimals: 18,
    urls: {
      apiURL: "https://api-sepolia.etherscan.io/api",
      browserURL: "https://sepolia.etherscan.io",
    },
    apiKey: "2GCDSTNXT5YGH4NPGI6M97VQIC533R1MBZ",
  },
  // "100100": {
  //   rpcs: ["https://evmtestus1.testnet.romeprotocol.xyz"],
  //   chainType: CHAIN_TYPE.EVM,
  //   chainId: "100100",
  //   env: CHAIN_ENVIRONMENT.TESTNET,
  //   name: "Rome Testnet",
  //   urls: {
  //     apiURL: "",
  //     browserURL: "https://evmtestus1.testnet.romeprotocol.xyz:1000",
  //   },
  // },
  // "200001": {
  //   rpcs: ["https://rometestus1.testnet.romeprotocol.xyz"],
  //   chainType: CHAIN_TYPE.EVM,
  //   chainId: "200001",
  //   env: CHAIN_ENVIRONMENT.TESTNET,
  //   name: "Rome Testnet",
  //   symbol: "ROME",
  //   decimals: 18,
  //   urls: {
  //     apiURL: "",
  //     browserURL: "https://rometestus1.testnet.romeprotocol.xyz:1000",
  //   },
  // },

  // rome new one
  "200018": {
    rpcs: ["https://node1.testnet.romeprotocol.xyz"],
    chainType: CHAIN_TYPE.EVM,
    chainId: "200018",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "Rome Testnet",
    symbol: "ROME",
    decimals: 18,
    urls: {
      apiURL: "",
      browserURL: "https://node1.testnet.romeprotocol.xyz:1000",
    },
  },

  // rome layer 2
  "100001": {
    rpcs: ["http://foosol.devnet.romeprotocol.xyz:8545"],
    chainType: CHAIN_TYPE.EVM,
    chainId: "100001",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "Rome L2",
    symbol: "ROME",
    decimals: 18,
    urls: {
      apiURL: "",
      browserURL: "https://foosol.devnet.romeprotocol.xyz:1000",
    },
  },

  "6342": {
    rpcs: ["https://carrot.megaeth.com/rpc"],
    chainType: CHAIN_TYPE.EVM,
    chainId: "6342",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "MEGA Testnet",
    symbol: "ETH",
    decimals: 18,
    urls: {
      apiURL: "",
      browserURL: "https://megaexplorer.xyz",
    },
  },

  // private rpc
  "10143": {
    rpcs: [
      "https://testnet-rpc2.monad.xyz/9f92c80beba5052ee8b525882899af062e90cbef",
    ],
    chainType: CHAIN_TYPE.EVM,
    chainId: "10143",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "Monad Testnet",
    symbol: "MON",
    decimals: 18,
    urls: {
      apiURL: "https://explorer.monad-testnet.category.xyz/api",
      browserURL: "https://explorer.monad-testnet.category.xyz",
    },
  },

  "1516": {
    rpcs: [
      // "https://story-odyssey-evm.blockpi.network/v1/rpc/public"
      "https://story-testnet-evm.itrocket.net",
    ],
    chainType: CHAIN_TYPE.EVM,
    chainId: "1516",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "Story Odyssey",
    symbol: "IP",
    decimals: 18,
    urls: {
      apiURL: "https://odyssey.storyscan.xyz/api",
      browserURL: "https://odyssey.storyscan.xyz",
    },
  },
  "1301": {
    rpcs: ["https://unichain-sepolia-rpc.publicnode.com"],
    chainType: CHAIN_TYPE.EVM,
    chainId: "1301",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "Unichain Sepolia",
    symbol: "ETH",
    decimals: 18,
    urls: {
      apiURL: "https://unichain-sepolia.blockscout.com/api",
      browserURL: "https://unichain-sepolia.blockscout.com",
    },
  },

  "11124": {
    rpcs: ["https://api.testnet.abs.xyz"],
    chainType: CHAIN_TYPE.ZK_EVM,
    chainId: "11124",
    env: CHAIN_ENVIRONMENT.TESTNET,
    name: "Abstract Sepolia",
    symbol: "ETH",
    decimals: 18,
    urls: {
      apiURL: "https://api-testnet.abscan.org/api",
      browserURL: "https://sepolia.abscan.org",
    },
  },

  //Alpha
  "router_9605-1": {
    url: {
      explorerGql: "https://alpha-explorer-api.routerprotocol.com/gql/query",
      explorerGqlWs: "wss://alpha-explorer-api.routerprotocol.com/gql/query",
      lcdEndpoint: "https://devnet-alpha.lcd.routerprotocol.com",
      grpcEndpoint: "https://devnet-alpha.grpcweb.routerprotocol.com",
      tmEndpoint: "https://devnet-alpha.tm.routerprotocol.com",
      rpcEndpoint: "https://devnet-alpha.evm.rpc.routerprotocol.com",
    },
    chainType: CHAIN_TYPE.ROUTER,
    symbol: "ROUTE",
    chainId: "router_9605-1",
    decimals: 18,
    env: CHAIN_ENVIRONMENT.ALPHA,
    name: "Router Chain Alpha",
  },
};

// {
//   network: "ink",
//   chainId: 57073,
//   urls: {
//       apiURL: "https://explorer.inkonchain.com/api",
//       browserURL: "https://explorer.inkonchain.com"
//   }
// },
// {
//   network: "morph",
//   chainId: 2818,
//   urls: {
//       apiURL: "https://explorer-api.morphl2.io/api",
//       browserURL: "https://explorer.morphl2.io"
//   }
// },
// {
//   network: "zora",
//   chainId: 7777777,
//   urls: {
//       apiURL: "https://explorer.zora.energy/api",
//       browserURL: "https://explorer.zora.energy"
//   }
// },
// {
//   network: "zero",
//   chainId: 543210,
//   urls: {
//       // apiURL: "https://zero-network.calderaexplorer.xyz/api",
//       // browserURL: "https://explorer.zero.network"

//       apiURL: "https://zero-network.calderaexplorer.xyz/api",
//       browserURL: "https://zero-network.calderaexplorer.xyz"
//   }
// },
// {
//   network: "worldChain",
//   chainId: 480,
//   urls: {
//       apiURL: "https://api.worldscan.org/api",
//       browserURL: "https://worldscan.org"
//   }
// },

// ink: {
//   saveDeployments: true,
//   accounts: [private_key],
//   chainId: 57073,
//   url: "https://rpc-qnd.inkonchain.com",
//   symbol: "ETH"
// },
// morph: {
//   saveDeployments: true,
//   accounts: [private_key],
//   chainId: 2818,
//   url: "https://rpc.morphl2.io",
//   symbol: "ETH"
// },
// zora: {
//   saveDeployments: true,
//   accounts: [private_key],
//   chainId: 7777777,
//   url: "https://zora.drpc.org",
//   symbol: "ETH"
// },
// zero: {
//   saveDeployments: true,
//   accounts: [private_key],
//   chainId: 543210,
//   url: "https://zero.drpc.org",
//   symbol: "ETH",
//   zksync: true,
//   ethNetwork: "mainnet"
// },
// worldChain: {
//   saveDeployments: true,
//   accounts: [private_key],
//   chainId: 480,
//   url: "https://worldchain.drpc.org",
//   symbol: "ETH"
// }
// worldChain: "97H5CE1VQNJRZZKNK2JHRDBQGFQYZU66JS"
