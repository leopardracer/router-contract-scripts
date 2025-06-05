import path from "path";
import { CHAIN_TYPE } from "../../types/chains";
import { Client } from "../client";
import * as fs from "fs-extra";
import { Contract } from "ethers";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import { ContractVerifier } from "../../helper/utils/verify-contract";

export class AssetBridgeClient {
  client: Client;
  contractAddress: string;
  contract: any;
  vault: any;
  verifier: ContractVerifier;

  /// EVM ABI
  AssetBridgeUpgradeable = fs.readJsonSync(
    path.join(
      __dirname,
      "../../../router-contracts/asset-bridge-contracts/evm/artifacts/foundry/AssetBridgeUpgradeable.sol/AssetBridgeUpgradeable.json"
    ),
    "utf-8"
  );

  constructor(contractAddress: string, client: Client) {
    this.client = client;
    this.contractAddress = contractAddress;
    this.verifier = new ContractVerifier(
      client.chainInfo.chainType,
      client.chainInfo
    );
    switch (client.chainInfo.chainType) {
      case CHAIN_TYPE.EVM:
      case CHAIN_TYPE.ZK_EVM: {
        this.contract = new Contract(
          contractAddress,
          this.AssetBridgeUpgradeable.abi
        ).connect(client.wallet);
        break;
      }
      default:
        throw "not implemented yet";
    }
  }

  async verifyContract() {
    switch (this.client.chainInfo.chainType) {
      case CHAIN_TYPE.EVM:
      case CHAIN_TYPE.ZK_EVM: {
        // verify proxy
        {
          await this.verifier.verify(this.contractAddress, [], {
            cwd: path.join(
              __dirname,
              "../../../router-contracts/asset-bridge-contracts/evm"
            ),
            contractPath: `contracts/AssetBridgeUpgradeable.sol`,
            contractName: "AssetBridgeUpgradeable",
          });
        }

        // verify impl
        {
          const implementationContract = await getImplementationAddress(
            this.client.provider,
            this.contractAddress
          );
          await this.verifier.verify(implementationContract, [], {
            cwd: path.join(
              __dirname,
              "../../../router-contracts/asset-bridge-contracts/evm"
            ),
            contractPath: `contracts/AssetBridgeUpgradeable.sol`,
            contractName: "AssetBridgeUpgradeable",
          });
        }
        break;
      }
      default:
        throw "not implemented yet";
    }
  }
}
