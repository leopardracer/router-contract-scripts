import { TransactionInstruction } from "@solana/web3.js";

export enum CONTRACT_TYPE {
  GATEWAY,
  ASSET_FORWARDER,
  ASSET_BRIDGE,
  FEE_MANAGER,
  TOKEN,
  NONE,
}

export function contractTypeToString(type: CONTRACT_TYPE): string {
  switch (type) {
    case CONTRACT_TYPE.GATEWAY:
      return "GATEWAY";
    case CONTRACT_TYPE.ASSET_FORWARDER:
      return "VOYAGER";
    default:
      return "NONE";
  }
}

export function contractTypeFromString(type: string): CONTRACT_TYPE {
  switch (type) {
    case "GATEWAY":
      return CONTRACT_TYPE.GATEWAY;
    case "VOYAGER":
      return CONTRACT_TYPE.ASSET_FORWARDER;
    default:
      return CONTRACT_TYPE.NONE;
  }
}

export type InstructionPayload = {
  instructions: TransactionInstruction[];
  addressLookupTableAddresses?: string[];
};
