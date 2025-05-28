import { ethers, JsonRpcProvider } from "ethers";
import { EncodedWallet } from "../wallet";
import {
  CHAIN_ENVIRONMENT,
  CHAIN_TYPE,
  CHAIN_TYPE_FROM_STRING,
} from "../types/chains";
import {
  abi as ERC1967ProxyAbi,
  bytecode as ERC1967ProxyBytecode,
} from "@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol/ERC1967Proxy.json";
import { collectLibrariesAndLink } from "./utils/evm";
import * as fs from "fs-extra";
import path from "path";
import { CHAIN_INFOS } from "../config/chains";
import { CONTRACT_TYPE, contractTypeToString } from "../types/types";
import chalk from "chalk";
import ora from "ora";
import { ContractVerifier } from "../helper/utils/verify-contract";
import { sleep } from "../helper/utils/utils";
import * as anchor from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";

export class Client {
  verifier: ContractVerifier;
  provider: any;
  wallet: any;
  chain: CHAIN_TYPE;
  chainInfo: any;

  constructor() {}

  async connect(chainInfo: any, wallet: EncodedWallet) {
    this.chainInfo = chainInfo;
    this.chain = chainInfo.chainType;
    switch (chainInfo.chainType) {
      case CHAIN_TYPE.EVM:
        this.verifier = new ContractVerifier(chainInfo.chainType, chainInfo);
        this.provider = new ethers.JsonRpcProvider(chainInfo.rpcs[0]);
        this.wallet = wallet.getChainWallet().connect(this.provider);
        break;
      case CHAIN_TYPE.SOLANA:
        // this.verifier = null;
        this.wallet = wallet.getChainWallet();
        this.provider = new anchor.AnchorProvider(
          new Connection(chainInfo.rpcs[0]),
          this.wallet,
          {
            commitment: "confirmed",
            maxRetries: 2,
          }
        );
        break;
      default:
        throw "not defined yet!";
    }
  }

  // wallet: EncodedWallet
  async clientFromChainInfo(chainInfo: any): Promise<any> {
    switch (chainInfo.chainType) {
      case CHAIN_TYPE.EVM:
        this.verifier = new ContractVerifier(chainInfo.chainType, chainInfo);
        return new ethers.JsonRpcProvider(chainInfo.rpcs[0]);
      case CHAIN_TYPE.SOLANA:
        // this.verifier = null;
        return new anchor.AnchorProvider(
          new Connection(chainInfo.rpcs[0]),
          new anchor.Wallet(Keypair.generate()),
          {
            commitment: "confirmed",
            maxRetries: 2,
          }
        );
    }
  }

  async deployContract(
    {
      type,
      args,
      chainInfo,
      deployRoute,
      routeTokenAddress,
      isMintable,
    }: {
      type: CONTRACT_TYPE;
      args: any;
      chainInfo: any;
      deployRoute?: boolean;
      routeTokenAddress?: string;
      isMintable?: boolean;
    },
    wallet: EncodedWallet
  ): Promise<any> {
    //NOTE: for now only evm
    const provider = await this.clientFromChainInfo(chainInfo);
    // console.log(await (provider as JsonRpcProvider).getTransaction("0x243335a266269718c9a133306960868361c395f1a782bea2aaa211524ee98aff"));
    // return
    const walletWithProvider = wallet.getChainWallet().connect(provider);

    switch (type) {
      case CONTRACT_TYPE.GATEWAY:
        return await this.deployGateway(
          walletWithProvider,
          args,
          routeTokenAddress,
          deployRoute
        );
      case CONTRACT_TYPE.ASSET_FORWARDER:
        return await this.deployAssetForwarder(walletWithProvider, args);
      case CONTRACT_TYPE.ASSET_BRIDGE:
        return await this.deployAssetBridge(walletWithProvider, args);
      case CONTRACT_TYPE.TOKEN:
        return await this.deployToken(walletWithProvider, args, isMintable);
      default:
        break;
    }
  }

  async fetchMiddlewareAddress(
    chainEnv: CHAIN_ENVIRONMENT,
    contractType: CONTRACT_TYPE
  ) {
    const network =
      chainEnv == CHAIN_ENVIRONMENT.ALPHA
        ? "alpha-devnet"
        : chainEnv == CHAIN_ENVIRONMENT.TESTNET
        ? "testnet"
        : "mainnet";
    const type =
      contractType == CONTRACT_TYPE.ASSET_FORWARDER
        ? "assetForwarder"
        : contractType == CONTRACT_TYPE.ASSET_BRIDGE
        ? "assetBridge"
        : "feeManager";
    const address = await (
      await fetch(
        `https://api.poap-nft.routerprotocol.com/${type}/${
          contractType != CONTRACT_TYPE.FEE_MANAGER
            ? "middleware"
            : "feeManager"
        }?network=${network}`
      )
    ).text();
    return address;
  }

  async fetchContractConfig(
    chainEnv: CHAIN_ENVIRONMENT,
    {
      contractType,
      chainId,
      isEnabled,
    }: {
      contractType: CONTRACT_TYPE;
      isEnabled: boolean;
      chainId: string;
    }
  ) {
    const chainInfo: any = Object.values(CHAIN_INFOS).find(
      (v) => v.chainType == CHAIN_TYPE.ROUTER && v.env == chainEnv
    );
    const { contractConfig } = await (
      await fetch(
        `${chainInfo.url.lcdEndpoint}/router-protocol/router-chain/multichain/contract_config`
      )
    ).json();
    return contractConfig.filter(
      (v: any) =>
        v.contractType == contractTypeToString(contractType) &&
        v.chainId == chainId &&
        v.contract_enabled == isEnabled
    );
  }

  async fetchValsetUpdate(
    chainEnv: CHAIN_ENVIRONMENT,
    nonce?: number
  ): Promise<{
    validators: string[];
    powers: number[];
    valsetNonce: string;
  }> {
    const chainInfo: any = Object.values(CHAIN_INFOS).find(
      (v) => v.chainType == CHAIN_TYPE.ROUTER && v.env == chainEnv
    );
    const { valset } = await (
      await fetch(
        `${chainInfo.url.lcdEndpoint}/router-protocol/router-chain/attestation/latest_valset`
      )
    ).json();
    return {
      validators: valset.members.map((v: any) => v.ethereumAddress),
      powers: valset.members.map((v: any) => Number(v.power)),
      valsetNonce: valset.nonce,
    };
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////
  /// Internals
  ////////////////////////////////////////////////////////////////////////////////////////////////////

  async deployGateway(
    walletWithProvider: any,
    args: any[],
    routeTokenAddress?: string,
    deployRoute: boolean = true
  ) {
    const GatewayUpgradeable = await fs.readJSON(
      path.join(
        __dirname,
        "../../contracts/router-gateway-contracts/evm/artifacts/foundry/GatewayUpgradeable.sol/GatewayUpgradeable.json"
      ),
      "utf-8"
    );
    const ValsetUpdate = await fs.readJSON(
      path.join(
        __dirname,
        "../../contracts/router-gateway-contracts/evm/artifacts/foundry/ValsetUpdate.sol/ValsetUpdate.json"
      ),
      "utf-8"
    );
    const TestRoute = await fs.readJSON(
      path.join(
        __dirname,
        "../../contracts/router-gateway-contracts/evm/artifacts/foundry/TestRoute.sol/TestRoute.json"
      ),
      "utf-8"
    );
    const TestRouteFactory = new ethers.ContractFactory(
      TestRoute.abi,
      TestRoute.bytecode,
      walletWithProvider
    );
    const AssetVault = await fs.readJSON(
      path.join(
        __dirname,
        "../../contracts/router-gateway-contracts/evm/artifacts/foundry/AssetVault.sol/AssetVault.json"
      ),
      "utf-8"
    );
    const AssetVaultFactory = new ethers.ContractFactory(
      AssetVault.abi,
      AssetVault.bytecode,
      walletWithProvider
    );

    const spinner = ora();

    // Deploy Route Token If Required
    if (deployRoute) {
      spinner.start("Deploying Route Token...");
      const routeToken = await TestRouteFactory.deploy({
        // gasLimit: 500000,
        // gasPrice: "30000000000",
      });
      await routeToken.waitForDeployment();
      routeTokenAddress = await routeToken.getAddress();
      spinner.succeed(
        chalk.green(`Route Token deployed at: ${routeTokenAddress}`)
      );
    }
    if (!routeTokenAddress) routeTokenAddress = ethers.ZeroAddress;

    // Deploy Update Valset
    spinner.start("Deploying Valset Update...");
    const ValsetUpdateFactory = new ethers.ContractFactory(
      ValsetUpdate.abi,
      ValsetUpdate.bytecode,
      walletWithProvider
    );
    const valsetUpdate = await ValsetUpdateFactory.deploy();
    await valsetUpdate.waitForDeployment();
    const valsetUpdateAddress = await valsetUpdate.getAddress();

    // const valsetUpdateAddress = "0x4356592b6CB360c25EfC2f6AFC2bB55266A1ab7E";
    spinner.succeed(
      chalk.green(`Valset Update deployed at: ${valsetUpdateAddress}`)
    );

    // Deploy Gateway
    spinner.start("Deploying Gateway...");
    const ImplementationFactory = new ethers.ContractFactory(
      GatewayUpgradeable.abi,
      await collectLibrariesAndLink(
        {
          contractName: "GatewayUpgradeable",
          bytecode: GatewayUpgradeable.bytecode.object,
          linkReferences: GatewayUpgradeable.bytecode.linkReferences,
        },
        {
          ValsetUpdate: valsetUpdateAddress,
        }
      ),
      walletWithProvider
    );
    const implementationContract = await ImplementationFactory.deploy();
    await implementationContract.waitForDeployment();
    const implementationContractAddress =
      await implementationContract.getAddress();
    // const implementationContractAddress =
    //   "0x9Eec6b4234b021be35502F7Ec872969352F56882";
    spinner.succeed(
      chalk.green(
        `Gateway Implementation deployed at: ${implementationContractAddress}`
      )
    );

    const initData = ImplementationFactory.interface.encodeFunctionData(
      "initialize",
      args
    );

    // Deploy Proxy
    spinner.start("Deploying Proxy...");
    const ProxyFactory = new ethers.ContractFactory(
      ERC1967ProxyAbi,
      ERC1967ProxyBytecode,
      walletWithProvider
    );
    const proxyContract = await ProxyFactory.deploy(
      implementationContractAddress,
      initData
    );
    const tx = await proxyContract.waitForDeployment();
    const proxyContractAddress = await proxyContract.getAddress();

    spinner.succeed(
      chalk.green(
        `Proxy deployed at: ${proxyContractAddress} | BlockNumber: ${
          tx.deploymentTransaction()?.blockNumber
        }`
      )
    );

    // AssetVault
    let assetVaultAddress: string =
      "0x0000000000000000000000000000000000000000";
    if (deployRoute && routeTokenAddress != ethers.ZeroAddress) {
      spinner.start("Deploying Asset Vault...");
      const assetVault = await AssetVaultFactory.deploy(
        proxyContractAddress,
        routeTokenAddress
      );
      await assetVault.waitForDeployment();
      assetVaultAddress = await assetVault.getAddress();
      spinner.succeed(
        chalk.green(`Asset Vault deployed at: ${assetVaultAddress}`)
      );

      // Setting up vault address
      spinner.start("Setting up vault address...");
      const tx = await ImplementationFactory.attach(
        proxyContractAddress
        //@ts-ignore
      ).setVault(assetVaultAddress);
      await tx.wait(4);
      spinner.succeed(
        chalk.green(`Vault address set successfully with tx hash: ${tx.hash}`)
      );

      // Granting Route Minter role
      spinner.start("Granting Route Minter role to AssetVault...");
      const MINTER_ROLE =
        "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";
      const testRoute = TestRouteFactory.attach(routeTokenAddress);
      //@ts-ignore
      const grantRoleTx = await testRoute.grantRole(
        MINTER_ROLE,
        assetVaultAddress
      );
      await grantRoleTx.wait(4);
      spinner.succeed(
        chalk.green(
          `Route Minter role granted to AssetVault: ${grantRoleTx.hash}`
        )
      );
    }

    return {
      proxyContractAddress,
      implementationContractAddress,
      valsetUpdateAddress,
      assetVaultAddress,
    };
  }

  async deployAssetForwarder(
    walletWithProvider: any,
    args: any[]
  ): Promise<any> {
    const AssetForwarder = await fs.readJSON(
      path.join(
        __dirname,
        "../../contracts/asset-forwarder-contracts/evm/artifacts/foundry/AssetForwarder.sol/AssetForwarder.json"
      ),
      "utf-8"
    );
    const AssetForwarderFactory = new ethers.ContractFactory(
      AssetForwarder.abi,
      AssetForwarder.bytecode,
      walletWithProvider
    );
    const spinner = ora();
    spinner.start("Deploying Asset Forwarder...");
    const assetForwarder = await AssetForwarderFactory.deploy(...args);
    const tx = await assetForwarder.waitForDeployment();
    const assetForwarderAddress = await assetForwarder.getAddress();
    spinner.succeed(
      chalk.green(
        `Asset Forwarder deployed at: ${assetForwarderAddress} |  BlockNumber: ${
          tx.deploymentTransaction()?.blockNumber
        }`
      )
    );
    // verify
    await sleep(6000);
    await this.verifier.verify(assetForwarderAddress, args, {
      cwd: path.join(
        __dirname,
        "../../contracts/asset-forwarder-contracts/evm"
      ),
      contractPath: `contracts/AssetForwarder.sol`,
      contractName: "AssetForwarder",
    });
    spinner.succeed(
      chalk.green(`Asset Forwarder ${assetForwarderAddress} verified!`)
    );
    return {
      assetForwarderAddress,
    };
  }

  async deployAssetBridge(walletWithProvider: any, args: any[]): Promise<any> {
    const AssetBridgeUpgradeable = await fs.readJSON(
      path.join(
        __dirname,
        "../../contracts/asset-bridge-contracts/evm/artifacts/foundry/AssetBridgeUpgradeable.sol/AssetBridgeUpgradeable.json"
      ),
      "utf-8"
    );
    const spinner = ora();
    spinner.start("Deploying Asset Bridge...");
    const ImplementationFactory = new ethers.ContractFactory(
      AssetBridgeUpgradeable.abi,
      AssetBridgeUpgradeable.bytecode,
      walletWithProvider
    );
    const implementationContract = await ImplementationFactory.deploy();
    await implementationContract.waitForDeployment();
    const implementationContractAddress =
      await implementationContract.getAddress();
    spinner.succeed(
      chalk.green(
        `Asset Bridge Implementation deployed at: ${implementationContractAddress}`
      )
    );

    const initData = ImplementationFactory.interface.encodeFunctionData(
      "initialize",
      args
    );

    // Deploy Proxy
    spinner.start("Deploying Proxy...");
    const ProxyFactory = new ethers.ContractFactory(
      ERC1967ProxyAbi,
      ERC1967ProxyBytecode,
      walletWithProvider
    );
    const proxyContract = await ProxyFactory.deploy(
      implementationContractAddress,
      initData
    );
    const tx = await proxyContract.waitForDeployment();
    const proxyContractAddress = await proxyContract.getAddress();

    spinner.succeed(
      chalk.green(
        `Proxy deployed at: ${proxyContractAddress} | BlockNumber: ${
          tx.deploymentTransaction()?.blockNumber
        }`
      )
    );

    await sleep(6000);
    await this.verifier.verify(proxyContractAddress, args, {
      cwd: path.join(__dirname, "../../contracts/asset-bridge-contracts/evm"),
      contractPath: `contracts/AssetBridgeUpgradeable.sol`,
      contractName: "AssetBridgeUpgradeable",
    });

    // const AssetBridge = await fs.readJSON(
    //   path.join(
    //     __dirname,
    //     "../../contracts/asset-bridge-contracts/evm/artifacts/foundry/AssetBridge.sol/AssetBridge.json"
    //   ),
    //   "utf-8"
    // );
    // const AssetBridgeFactory = new ethers.ContractFactory(
    //   AssetBridge.abi,
    //   AssetBridge.bytecode,
    //   walletWithProvider
    // );
    // const spinner = ora();
    // spinner.start("Deploying Asset Bridge...");
    // const assetBridge = await AssetBridgeFactory.deploy(...args);
    // await assetBridge.waitForDeployment();
    // const assetBridgeAddress = await assetBridge.getAddress();
    // spinner.succeed(
    //   chalk.green(`Asset Bridge deployed at: ${assetBridgeAddress}`)
    // );
    // // verify
    // await sleep(6000);
    // await this.verifier.verify(assetBridgeAddress, args, {
    //   cwd: path.join(__dirname, "../../contracts/asset-bridge-contracts/evm"),
    //   contractPath: `contracts/AssetBridge.sol`,
    //   contractName: "AssetBridge",
    // });
    // spinner.succeed(
    //   chalk.green(`Asset Bridge ${assetBridgeAddress} verified!`)
    // );
    return {
      assetBridgeAddress: proxyContract,
    };
  }

  async deployToken(
    walletWithProvider: any,
    args: any[],
    isMintable: boolean = false
  ): Promise<any> {
    const Token = await fs.readJSON(
      path.join(
        __dirname,
        `../../contracts/asset-forwarder-contracts/evm/artifacts/foundry/${
          !isMintable ? "ERC20Token" : "ERC20MintableToken"
        }.sol/${!isMintable ? "ERC20Token" : "ERC20MintableToken"}.json`
      ),
      "utf-8"
    );
    const TokenFactory = new ethers.ContractFactory(
      Token.abi,
      Token.bytecode,
      walletWithProvider
    );
    const spinner = ora();
    spinner.start("Deploying Token...");
    const token = await TokenFactory.deploy(...args);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    spinner.succeed(chalk.green(`Token deployed at: ${tokenAddress}`));
    // verify
    await sleep(6000);
    await this.verifier.verify(tokenAddress, args, {
      cwd: path.join(
        __dirname,
        "../../contracts/asset-forwarder-contracts/evm"
      ),
      contractPath: `contracts/${
        !isMintable ? "ERC20Token" : "ERC20MintableToken"
      }.sol`,
      contractName: !isMintable ? "ERC20Token" : "ERC20MintableToken",
    });
    spinner.succeed(chalk.green(`Token ${tokenAddress} verified!`));
    return {
      tokenAddress,
    };
  }

  async validateDeployedContract(
    {
      type,
      args,
      chainInfo,
      contractAddress,
    }: {
      type: CONTRACT_TYPE;
      args: any;
      chainInfo: any;
      contractAddress: boolean;
    },
    wallet: EncodedWallet
  ): Promise<boolean> {
    return true;
  }
}
