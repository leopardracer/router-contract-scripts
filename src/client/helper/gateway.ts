import path from "path";
import { CHAIN_ENVIRONMENT, CHAIN_TYPE } from "../../types/chains";
import { Client } from "../client";
import * as fs from "fs-extra";
import { Contract, ethers } from "ethers";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import { ContractVerifier } from "../../helper/utils/verify-contract";
import { sleep } from "../../helper/utils/utils";
import { collectLibrariesAndLink } from "../utils/evm";

export class GatewayClient {
  client: Client;
  contractAddress: string;
  contract: any;
  vault: any;
  verifier: ContractVerifier;

  /// EVM ABI
  GatewayUpgradeable = fs.readJsonSync(
    path.join(
      __dirname,
      "../../../router-contracts/router-gateway-contracts/evm/artifacts/foundry/GatewayUpgradeable.sol/GatewayUpgradeable.json"
    ),
    "utf-8"
  );
  ValsetUpdate = fs.readJSONSync(
    path.join(
      __dirname,
      "../../../router-contracts/router-gateway-contracts/evm/artifacts/foundry/ValsetUpdate.sol/ValsetUpdate.json"
    ),
    "utf-8"
  );
  TestRoute = fs.readJSONSync(
    path.join(
      __dirname,
      "../../../router-contracts/router-gateway-contracts/evm/artifacts/foundry/TestRoute.sol/TestRoute.json"
    ),
    "utf-8"
  );
  AssetVault = fs.readJSONSync(
    path.join(
      __dirname,
      "../../../router-contracts/router-gateway-contracts/evm/artifacts/foundry/AssetVault.sol/AssetVault.json"
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
          this.GatewayUpgradeable.abi
        ).connect(client.wallet);
        break;
      }
      default:
        throw "not implemented yet";
    }
  }

  async getAssetVault(): Promise<string | null> {
    const assetVault = await this.contract.vault();
    if (assetVault == ethers.ZeroAddress.toString()) return null;
    return assetVault;
  }

  async getRouteAddress(): Promise<string | null> {
    const assetVault = await this.getAssetVault();
    if (!assetVault) return null;
    this.vault = new Contract(assetVault, this.AssetVault.abi).connect(
      this.client.wallet
    );
    return await this.vault.routeToken();
  }

  async getChainId(): Promise<string> {
    return await this.contract.chainId();
  }

  async getCurrentVersion(): Promise<string> {
    return await this.contract.currentVersion();
  }

  async getEventNonce(): Promise<string> {
    return await this.contract.eventNonce();
  }

  async getStateLastValsetCheckpoint(): Promise<string> {
    return await this.contract.stateLastValsetCheckpoint();
  }

  async getISendDefaultFee(): Promise<string> {
    return await this.contract.iSendDefaultFee();
  }

  async validateContract(
    roleShouldOnlyBeWith: string,
    env: CHAIN_ENVIRONMENT
  ): Promise<{
    isValid: boolean;
    message?: string;
  }> {
    switch (this.client.chainInfo.chainType) {
      case CHAIN_TYPE.EVM:
      case CHAIN_TYPE.ZK_EVM: {
        const implementationContract = await getImplementationAddress(
          this.client.provider,
          this.contractAddress
        );

        // 1. Validate proxy bytecode
        const proxyBytecode = await this.client.provider.getCode(
          this.contractAddress
        );

        // if (!proxyBytecode == this.contract.abi) {
        //   return {
        //     isValid: false,
        //     message: "Invalid proxy bytecode",
        //   };
        // }

        // 2. Validate implementation bytecode
        const implBytecode = await this.client.provider.getCode(
          implementationContract
        );
        console.log(implBytecode);

        const valsetUpdateAddress =
          this.getValsetLibraryAddressFromCode(implBytecode);
        const expectedBytecode = await collectLibrariesAndLink(
          {
            contractName: "GatewayUpgradeable",
            bytecode: this.GatewayUpgradeable.bytecode.object,
            linkReferences: this.GatewayUpgradeable.bytecode.linkReferences,
          },
          {
            ValsetUpdate: valsetUpdateAddress,
          }
        );
        console.log();

        console.log(expectedBytecode);

        if (implBytecode === "0x") {
          return {
            isValid: false,
            message: "Implementation contract not found",
          };
        }

        // 3. Validate contract state
        const contract = new ethers.Contract(
          this.contractAddress,
          this.GatewayUpgradeable.abi,
          this.client.provider
        );

        // Check chainId
        const chainId = await contract.chainId();
        if (chainId !== this.client.chainInfo.chainId) {
          return {
            isValid: false,
            message: `Invalid chainId. Expected ${this.client.chainInfo.chainId}, got ${chainId}`,
          };
        }

        // Check eventNonce
        const eventNonce = await contract.eventNonce();
        if (eventNonce !== 1n) {
          return {
            isValid: false,
            message: `Invalid eventNonce. Expected 1, got ${eventNonce}`,
          };
        }

        // Check currentVersion
        const currentVersion = await contract.currentVersion();
        if (currentVersion !== 1n) {
          return {
            isValid: false,
            message: `Invalid currentVersion. Expected 1, got ${currentVersion}`,
          };
        }

        // Check iSendDefaultFee
        const iSendDefaultFee = await contract.iSendDefaultFee();
        if (iSendDefaultFee !== 0n) {
          return {
            isValid: false,
            message: `Invalid iSendDefaultFee. Expected 0, got ${iSendDefaultFee}`,
          };
        }

        // 4. Validate access control
        const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
        const RESOURCE_SETTER_ROLE = await contract.RESOURCE_SETTER();
        const PAUSER_ROLE = await contract.PAUSER();

        // Check admin role
        const hasAdminRole = await contract.hasRole(
          DEFAULT_ADMIN_ROLE,
          roleShouldOnlyBeWith
        );
        if (!hasAdminRole) {
          return {
            isValid: false,
            message: `Address ${roleShouldOnlyBeWith} does not have admin role`,
          };
        }

        // Check resource setter role
        const hasResourceSetterRole = await contract.hasRole(
          RESOURCE_SETTER_ROLE,
          roleShouldOnlyBeWith
        );
        if (!hasResourceSetterRole) {
          return {
            isValid: false,
            message: `Address ${roleShouldOnlyBeWith} does not have resource setter role`,
          };
        }

        // Check pauser role
        const hasPauserRole = await contract.hasRole(
          PAUSER_ROLE,
          roleShouldOnlyBeWith
        );
        if (!hasPauserRole) {
          return {
            isValid: false,
            message: `Address ${roleShouldOnlyBeWith} does not have pauser role`,
          };
        }

        // 5. Verify contract is not paused
        const isPaused = await contract.paused();
        if (isPaused) {
          return {
            isValid: false,
            message: `Contract is paused`,
          };
        }

        // 6. Verify validator set
        const stateLastValsetNonce = await contract.stateLastValsetNonce();
        if (stateLastValsetNonce === 0n) {
          return {
            isValid: false,
            message: `Validator set not initialized`,
          };
        }

        const { validators, powers, valsetNonce } =
          await this.client.fetchValsetUpdate(env);

        const stateLastValsetCheckpoint =
          await contract.stateLastValsetCheckpoint();
        if (
          stateLastValsetCheckpoint ===
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        ) {
          return {
            isValid: false,
            message: `Validator set checkpoint not initialized`,
          };
        }

        return {
          isValid: true,
          message: `Contract is validated..`,
        };
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
              "../../../router-contracts/router-gateway-contracts/evm"
            ),
            contractPath: `contracts/GatewayUpgradeable.sol`,
            contractName: "GatewayUpgradeable",
          });
        }
        await sleep(1000);

        // verify impl
        {
          const implementationContract = await getImplementationAddress(
            this.client.provider,
            this.contractAddress
          );
          await this.verifier.verify(implementationContract, [], {
            cwd: path.join(
              __dirname,
              "../../../router-contracts/router-gateway-contracts/evm"
            ),
            contractPath: `contracts/GatewayUpgradeable.sol`,
            contractName: "GatewayUpgradeable",
            libraries: {
              "contracts/libraries/ValsetUpdate.sol": {
                "ValsetUpdate": await this.getValsetLibraryAddress(
                  implementationContract
                ),
              },
            },
          });
        }
        break;
      }
      default:
        throw "not implemented yet";
    }
  }

  async getValsetLibraryAddress(address: string): Promise<string> {
    const code = await this.client.provider.getCode(address);
    return this.getValsetLibraryAddressFromCode(code);
  }

  getValsetLibraryAddressFromCode(code: string): string {
    const bytecode = code.slice(2);
    const updateValsetIndex = 7234;
    const hexAddress = bytecode.slice(
      updateValsetIndex,
      updateValsetIndex + 40
    );
    return "0x" + hexAddress;
  }
}
