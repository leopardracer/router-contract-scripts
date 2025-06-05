import { Command } from "commander";
import inquirer from "inquirer";
import { Client } from "../../client/client";
import { CHAIN_INFOS } from "../../config/chains";
import {
  CHAIN_ENVIRONMENT,
  CHAIN_TYPE,
  CHAIN_TYPE_FROM_STRING,
} from "../../types/chains";
import { EncodedWallet } from "../../wallet";
import { CONTRACT_TYPE } from "../../types/types";
import { ethers } from "ethers";
import { askShowPrivate } from "../asker/wallet";

export async function assetBridgeHandler(client: Client, command: Command) {
  const prompts = inquirer.createPromptModule();

  const { option } = await prompts([
    {
      type: "list",
      name: "option",
      message: "Select your options:",
      choices: [
        "Deploy",
        "Verify",
        "SetDappMetadata",
        "Pause",
        "Unpause",
        "ITransfer",
        "ITransferWithInstruction",
        "Rescue",
      ],
    },
  ]);

  const { chainType, rotuerChainEnvironment } = await prompts([
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

  const { chainName } = await prompts([
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
  await client.connect(chainInfo);

  switch (option) {
    case "Deploy": {
      const wallet = new EncodedWallet(CHAIN_TYPE_FROM_STRING(chainType));
      await wallet.connect();
      await wallet.selectWallet(await askShowPrivate());

      const routerChainInfo: any = Object.values(CHAIN_INFOS).find(
        (v) =>
          v.chainType == CHAIN_TYPE.ROUTER && v.env == rotuerChainEnvironment
      );

      const [registeredGateway] = await client.fetchContractConfig(
        rotuerChainEnvironment,
        {
          contractType: CONTRACT_TYPE.ASSET_FORWARDER,
          chainId: chainInfo.chainId,
          isEnabled: true,
        }
      );
      const registeredMiddlewareAddress = await client.fetchMiddlewareAddress(
        rotuerChainEnvironment,
        CONTRACT_TYPE.ASSET_BRIDGE
      );

      const oldDexspan = "";
      const { dexSpanAddress, gatewayAddress, middlewareAddress, startNonce } =
        await prompts([
          {
            type: "input",
            name: "dexSpanAddress",
            message: `Enter dexspan address: ${`Leave empty for zero address`}`,
            default: oldDexspan ? oldDexspan : ethers.ZeroAddress,
            askAnswered: true,
          },
          {
            type: "input",
            name: "gatewayAddress",
            message: `Enter gateway address: ${
              registeredGateway
                ? `(Pass empty to proceed with already registered gateway ${registeredGateway.contractAddress})`
                : ""
            }`,
            default: registeredGateway ? registeredGateway.contractAddress : "",
            askAnswered: true,
            validate(value) {
              if (!registeredGateway) if (!value) return "Pass Gateway Address";
              return true;
            },
          },
          {
            type: "input",
            name: "middlewareAddress",
            message: `Enter middlewareAddress: ${
              registeredGateway
                ? `(Pass empty to proceed with already registered gateway ${registeredMiddlewareAddress})`
                : ""
            }`,
            default: registeredMiddlewareAddress,
            askAnswered: true,
            validate(value) {
              if (!registeredMiddlewareAddress)
                if (!value) return "Pass Gateway Address";
              return true;
            },
          },
          {
            type: "input",
            name: "startNonce",
            message: `Enter startNonce: `,
            default: "0",
            askAnswered: true,
          },
        ]);
      const { assetBridgeAddress } = await client.deployContract(
        {
          type: CONTRACT_TYPE.ASSET_BRIDGE,
          chainInfo,
          args: [
            dexSpanAddress,
            gatewayAddress,
            routerChainInfo.chainId,
            middlewareAddress,
            startNonce,
          ],
        },
        wallet
      );
      console.log({
        assetBridgeAddress,
      });
      break;
    }
    case "Verify": {
      const { contractAddress } = await inquirer.prompt([
        {
          type: "input",
          name: "contractAddress",
          message: "Enter Asset Bridge Address: ",
        },
      ]);
      await client.verifyContract({
        contractAddress,
        type: CONTRACT_TYPE.GATEWAY,
      });
      break;
    }
    case "SetDappMetadata":
      break;
    case "Pause":
      break;
    case "Unpause":
      break;
    case "ITransfer":
      break;
    case "ITransferWithInstruction":
      break;
    case "Rescue":
      break;
  }
}
