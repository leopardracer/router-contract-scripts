import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { Client } from "../../client/client";
import {
  CHAIN_ENVIRONMENT,
  CHAIN_TYPE,
  CHAIN_TYPE_FROM_STRING,
} from "../../types/chains";
import { EncodedWallet } from "../../wallet";
import { CHAIN_INFOS } from "../../config/chains";
import ora from "ora";
import { ContractVerifier } from "../utils/verify-contract";
import path from "path";
import { CONTRACT_TYPE } from "../../types/types";
import { askKeepPrivate, askShowPrivate } from "../asker/wallet";

export async function gatewayHandler(client: Client, command: Command) {
  const { option, chainType, rotuerChainEnvironment } = await inquirer.prompt([
    {
      type: "list",
      name: "option",
      message: "Select your options: ",
      choices: ["Deploy", "Verify", "Pause", "Unpause", "Validate Contract"],
    },
    {
      type: "list",
      name: "chainType",
      message: "Select your chain type: ",
      choices: ["EVM", "SOLANA", "SUBSTRATE", "TON", "SUI"],
    },
    {
      type: "list",
      name: "rotuerChainEnvironment",
      message: "Select router chain environment: ",
      choices: [
        { value: CHAIN_ENVIRONMENT.MAINNET, name: "Mainnet" },
        { value: CHAIN_ENVIRONMENT.TESTNET, name: "Testnet" },
        { value: CHAIN_ENVIRONMENT.ALPHA, name: "Alpha" },
      ],
    },
  ]);
  const { chainName } = await inquirer.prompt([
    {
      type: "list",
      name: "chainName",
      message: "Select your chain: ",
      choices: Object.values(CHAIN_INFOS)
        .filter((v) => v.chainType == CHAIN_TYPE_FROM_STRING(chainType))
        .map((v) => v.name),
    },
  ]);
  const chainInfo = Object.values(CHAIN_INFOS).filter(
    (v) => v.name == chainName
  )[0];
  switch (option) {
    case "Deploy":
      const { deployRoute } = await inquirer.prompt([
        {
          type: "confirm",
          name: "deployRoute",
          message: "New route token deployment required?",
          default: true,
        },
      ]);
      let routeTokenAddress: string = "";
      if (!deployRoute) {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "routeTokenAddress",
            message:
              "Enter current route token (keep it empty if not required)?",
          },
        ]);
        routeTokenAddress = answers.routeTokenAddress;
      }
      switch (chainType) {
        case "EVM": {
          const wallet = new EncodedWallet(CHAIN_TYPE.EVM);
          await wallet.connect();
          await wallet.selectWallet(await askShowPrivate());
          const { validators, powers, valsetNonce } =
            await client.fetchValsetUpdate(rotuerChainEnvironment);
          console.log({
            chainId: chainInfo.chainId,
            validators,
            powers,
            valsetNonce,
          });

          const {
            proxyContractAddress,
            implementationContractAddress,
            valsetUpdateAddress,
          } = await client.deployContract(
            {
              type: CONTRACT_TYPE.GATEWAY,
              chainInfo,
              args: [chainInfo.chainId, validators, powers, valsetNonce],
              deployRoute,
              routeTokenAddress,
            },
            wallet
          );
          console.log({
            proxyContractAddress,
            implementationContractAddress,
            valsetUpdateAddress,
          });
          break;
        }
        case "ZK_EVM": {
          const wallet = new EncodedWallet(CHAIN_TYPE.ZK_EVM);
          await wallet.connect();
          await wallet.selectWallet();
          const { validators, powers, valsetNonce } =
            await client.fetchValsetUpdate(rotuerChainEnvironment);
          console.log({
            chainId: chainInfo.chainId,
            validators,
            powers,
            valsetNonce,
          });

          const {
            proxyContractAddress,
            implementationContractAddress,
            valsetUpdateAddress,
          } = await client.deployContract(
            {
              type: CONTRACT_TYPE.GATEWAY,
              chainInfo,
              args: [chainInfo.chainId, validators, powers, valsetNonce],
              deployRoute,
              routeTokenAddress,
            },
            wallet
          );
          console.log({
            proxyContractAddress,
            implementationContractAddress,
            valsetUpdateAddress,
          });
          break;
        }
        case "SOLANA":
          break;
        case "SUBSTRATE":
          break;
        case "TON":
          break;
        case "SUI":
          break;
      }
      break;
    case "Verify":
      const { contractAddress } = await inquirer.prompt([
        {
          type: "input",
          name: "contractAddress",
          message: "Enter Gateway Address: ",
        },
      ]);
      const verifier = new ContractVerifier(
        CHAIN_TYPE_FROM_STRING(chainType),
        chainInfo
      );
      switch (chainType) {
        case "EVM":
          try {
            const response = await verifier.verify(contractAddress, [], {
              cwd: path.join(
                __dirname,
                "../../../contracts/router-gateway-contracts/evm"
              ),
              contractPath: `contracts/GatewayUpgradeable.sol`,
              contractName: "GatewayUpgradeable",
            });
            // const response = await verifier.verify(
            //   contractAddress,
            //   [
            //     "0xE6B9B347F4252C888c2b1Ab983742647C81245Aa",
            //     "0xb60bC1ed271E4031fAfF359Ee306CE4E1A1848E8",
            //   ],
            //   {
            //     cwd: path.join(
            //       __dirname,
            //       "../../../contracts/router-gateway-contracts/evm"
            //     ),
            //     contractPath: `contracts/AssetVault.sol`,
            //     contractName: "AssetVault",
            //   }
            // );
            console.log(response);
          } catch (error) {
            console.log(error);
          }
          break;
        case "SOLANA":
          break;
        case "SUBSTRATE":
          break;
        case "TON":
          break;
        case "SUI":
          break;
      }
      break;
    case "Pause":
      break;
    case "Unpause":
      break;
    case "Validate Contract": {
      const { gatewayProxyAddress } = await inquirer.prompt([
        {
          type: "input",
          name: "gatewayProxyAddress",
          message: "Enter deployed gateway proxy address...",
        },
      ]);
      switch (chainType) {
        case "EVM": {
          const wallet = new EncodedWallet(CHAIN_TYPE.EVM);
          await wallet.connect();
          await wallet.selectWallet(await askShowPrivate());
          const { validators, powers, valsetNonce } =
            await client.fetchValsetUpdate(rotuerChainEnvironment);
          const isValid = await client.validateDeployedContract(
            {
              type: CONTRACT_TYPE.GATEWAY,
              chainInfo,
              args: [chainInfo.chainId, validators, powers, valsetNonce],
              contractAddress: gatewayProxyAddress,
            },
            wallet
          );
          console.log("Contract is validated");
          break;
        }
        case "SOLANA":
          break;
        case "SUBSTRATE":
          break;
        case "TON":
          break;
        case "SUI":
          break;
      }

      break;
    }
  }
}
