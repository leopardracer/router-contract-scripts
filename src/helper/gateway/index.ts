import { Command } from "commander";
import inquirer from "inquirer";
import { Client } from "../../client/client";
import {
  CHAIN_ENVIRONMENT,
  CHAIN_TYPE,
  CHAIN_TYPE_FROM_STRING,
} from "../../types/chains";
import { EncodedWallet } from "../../wallet";
import { CHAIN_INFOS } from "../../config/chains";
import { CONTRACT_TYPE } from "../../types/types";
import { askShowPrivate } from "../asker/wallet";

export async function gatewayHandler(client: Client, command: Command) {
  const { option, chainType, rotuerChainEnvironment } = await inquirer.prompt([
    {
      type: "list",
      name: "option",
      message: "Select your options: ",
      choices: ["Deploy", "Verify", "Validate Contract", "Pause", "Unpause"],
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
        .filter(
          (v) =>
            v.chainType == CHAIN_TYPE_FROM_STRING(chainType) &&
            v.env == rotuerChainEnvironment
        )
        .map((v) => v.name),
    },
  ]);
  const chainInfo = Object.values(CHAIN_INFOS).filter(
    (v) => v.name == chainName
  )[0];
  await client.connect(chainInfo);

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

          await client.deployContract(
            {
              type: CONTRACT_TYPE.GATEWAY,
              chainInfo,
              args: [chainInfo.chainId, validators, powers, valsetNonce],
              deployRoute,
              routeTokenAddress,
            },
            wallet
          );
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

          await client.deployContract(
            {
              type: CONTRACT_TYPE.GATEWAY,
              chainInfo,
              args: [chainInfo.chainId, validators, powers, valsetNonce],
              deployRoute,
              routeTokenAddress,
            },
            wallet
          );
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
      await client.verifyContract({
        contractAddress,
        type: CONTRACT_TYPE.GATEWAY,
      });
      break;
    case "Validate Contract": {
      const { gatewayProxyAddress, roleShouldOnlyBeWith } =
        await inquirer.prompt([
          {
            type: "input",
            name: "gatewayProxyAddress",
            message: "Enter deployed gateway proxy address...",
          },
          {
            type: "input",
            name: "roleShouldOnlyBeWith",
            message: "Enter address for which role should have...",
          },
        ]);
      switch (chainType) {
        case "EVM": {
          await client.validateDeployedContract({
            contractAddress: gatewayProxyAddress,
            roleShouldOnlyBeWith,
            rotuerChainEnvironment,
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
    }
    case "Pause":
      break;
    case "Unpause":
      break;
  }
}
