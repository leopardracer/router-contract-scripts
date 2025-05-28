import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { Client } from "../../client/client";
import {
  CHAIN_ENVIRONMENT,
  CHAIN_TYPE,
  CHAIN_TYPE_FROM_STRING,
} from "../../types/chains";
import { CHAIN_INFOS } from "../../config/chains";
import { EncodedWallet } from "../../wallet";
import { CONTRACT_TYPE, InstructionPayload } from "../../types/types";
import { ethers } from "ethers";
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import {
  AssetForwarder,
  IDL as AssetForwarderIDL,
} from "../../../contracts/asset-forwarder-contracts/solana/target/types/asset_forwarder";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { getSwapInstructions } from "../dexspan/solana/dexspan";
import { sleep } from "../utils/utils";
import * as jito from "jito-ts";
import BigNumber from "bignumber.js";
import { TokenClient } from "../../client/helper/token";
import { askAddress, askAmount } from "../asker/token";
import { askShowPrivate } from "../asker/wallet";

export async function tokenHandler(client: Client, command: Command) {
  const { option } = await inquirer.prompt([
    {
      type: "list",
      name: "option",
      message: "Select your options:",
      loop: false,
      choices: ["Deploy", "Transfer", "Approve", "Mint", "Burn"],
    },
  ]);
  const { chainType } = await inquirer.prompt([
    {
      type: "list",
      name: "chainType",
      message: "Select your chain type: ",
      choices: ["EVM", "SOLANA", "SUBSTRATE", "TON", "SUI"],
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
  const wallet = new EncodedWallet(CHAIN_TYPE_FROM_STRING(chainType));
  await wallet.connect();
  await wallet.selectWallet(await askShowPrivate());
  const tokenClient = new TokenClient(client);

  await client.connect(chainInfo, wallet);

  switch (option) {
    case "Deploy":
      const { name, symbol, decimals, isMintable } = await inquirer.prompt([
        {
          type: "input",
          name: "name",
          message: `Enter name: `,
        },
        {
          type: "input",
          name: "symbol",
          message: `Enter symbol: `,
        },
        {
          type: "input",
          name: "decimals",
          message: `Enter decimals: `,
          default: "9",
          askAnswered: true,
        },
        {
          type: "confirm",
          name: "isMintable",
          message: "isMintable? ",
          default: false,
        },
      ]);
      let minter: string = "",
        supply: string = "";
      if (isMintable) {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "minter",
            message: `Enter minter: `,
            default: wallet.address,
          },
        ]);
        minter = answers.minter;
      } else {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "supply",
            message: `Enter supply: `,
            default: "1000000000",
          },
        ]);
        supply = answers.supply;
      }
      const { tokenAddress } = await client.deployContract(
        {
          type: CONTRACT_TYPE.TOKEN,
          chainInfo,
          args: [name, symbol, decimals, isMintable ? minter : supply],
          isMintable,
        },
        wallet
      );
      console.log({
        tokenAddress,
      });
      break;
    case "Transfer":
      {
        const tokenInfo = await tokenClient.selectToken(
          await tokenClient.getTokenHoldings(wallet.address)
        );
        const recipient = await askAddress(client.chainInfo.chainType);
        const amount = await askAmount();
        console.log(tokenInfo);
        const { hash } = await tokenClient.transfer(
          {
            token: tokenInfo.address,
            recipient,
            amount: new BigNumber(amount)
              .multipliedBy(
                new BigNumber(10).pow(new BigNumber(tokenInfo.decimal))
              )
              .toString(),
            chainInfo,
          },
          wallet
        );
        console.log(hash);
      }

      // 0x454dEce5Ee469460405275a5970c68EdC175e14e
      // await selectToken()
      // show all holdings
      // input recipient
      // amount

      // {
      //   const decimals = 9;
      //   const { hash } = await client.transfer(
      //     {
      //       token: "0x454dEce5Ee469460405275a5970c68EdC175e14e",
      //       recipient: "0x580e721a52744744fD760a2cbE0B2878261925e2",
      //       amount: new BigNumber(10000)
      //         .multipliedBy(new BigNumber(10).pow(new BigNumber(decimals)))
      //         .toString(),
      //       chainInfo,
      //     },
      //     wallet
      //   );
      //   console.log(`Token sent: `, hash);
      // }
      break;
    case "Approve":
      break;
    case "Mint":
      break;
  }
}
//0xc050608de965145ddad93030cad2972b6a4a17a1969caf633a4369997fddff3c
