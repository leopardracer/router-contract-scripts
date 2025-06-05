import { ethers } from "ethers";
import { CHAIN_TYPE } from "../constants";

export class EncodedWallet {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet | null = null;
  private chainType: CHAIN_TYPE;

  constructor(chainType: CHAIN_TYPE) {
    this.chainType = chainType;
  }

  async connect() {
    // Initialize provider based on chain type
    switch (this.chainType) {
      case CHAIN_TYPE.EVM:
      case CHAIN_TYPE.ZK_EVM:
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        break;
      default:
        throw new Error("Unsupported chain type");
    }
  }

  async selectWallet(showPrivate: boolean) {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }

    // Get private key from environment or user input
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("Private key not found in environment");
    }

    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  getProvider() {
    return this.provider;
  }

  getWallet() {
    return this.wallet;
  }
}
