import path from "path";
import { CHAIN_TYPE } from "../../types/chains";
import { EncodedWallet } from "../../wallet";
import { Client } from "../client";
import { ethers } from "ethers";
import * as fs from "fs-extra";
import { PublicKey } from "@solana/web3.js";
import {
  getMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { AnchorProvider } from "@coral-xyz/anchor";
import chalk from "chalk";
import BigNumber from "bignumber.js";
import inquirer from "inquirer";

type TokenInfo = {
  address: string;
  decimal: number;
  symbol: string;
  name: string;
  tokenProgram?: PublicKey;
  balance: string;
  price: string;
};

export class TokenClient {
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async transfer(
    {
      token,
      amount,
      recipient,
      chainInfo,
    }: {
      token: string;
      chainInfo: any;
      amount: string;
      recipient: string;
    },
    wallet: EncodedWallet
  ): Promise<any> {
    const provider = await this.client.clientFromChainInfo(chainInfo);
    switch (chainInfo.chainType) {
      case CHAIN_TYPE.EVM: {
        const walletWithProvider = wallet.getChainWallet().connect(provider);
        const Token = await fs.readJSON(
          path.join(
            __dirname,
            `../../contracts/asset-forwarder-contracts/evm/artifacts/foundry/ERC20MintableToken.sol/ERC20MintableToken.json`
          ),
          "utf-8"
        );
        const TokenFactory = new ethers.ContractFactory(
          Token.abi,
          Token.bytecode,
          walletWithProvider
        );
        //@ts-ignore
        return await TokenFactory.attach(token).transfer(recipient, amount);
      }
      case CHAIN_TYPE.SOLANA: {
        if (isNative(token)) {
        } else {
        }
      }
      default:
        break;
    }
  }

  PATHS_PER_PAGE = 5; // Number of derivation paths to show per page
  async selectToken(tokenHoldings: TokenInfo[]): Promise<TokenInfo> {
    const { tokenInfo } = await inquirer.prompt([
      {
        type: "list",
        name: "tokenInfo",
        message: "Select account from wallet to proceed with: ",
        loop: false,
        choices: async (answers) => {
          return await this.getPaginatedTokenHoldingChoices(tokenHoldings);
        },
        pageSize: 20,
        // validate: (input) => {
        //   if (!input) {
        //     return "Please select an account to proceed.";
        //   }
        //   return true;
        // },
      },
    ]);
    return tokenInfo;
  }

  //TODO: opt later
  private getPaginatedTokenHoldingChoices(tokenHoldings: TokenInfo[]) {
    const holdings: any[] = [];
    holdings.push({
      name: chalk.redBright(
        `-------------------- Token Holdings --------------------`
      ),
      value: "",
    });
    for (const info of tokenHoldings) {
      const amount = new BigNumber(info.balance).dividedBy(
        new BigNumber(10).pow(info.decimal)
      );
      holdings.push({
        name: ` > [${info.symbol}](${
          info.address
        }): ${amount.toString()} ~ $${amount
          .multipliedBy(info.price)
          .toString()}`,
        value: info,
      });
    }
    return holdings;
  }

  async getTokenHoldings(
    account: any,
    provider: any = this.client.provider
  ): Promise<TokenInfo[]> {
    const tokenHoldings: TokenInfo[] = [];
    switch (this.client.chain) {
      case CHAIN_TYPE.EVM: {
        break;
      }
      case CHAIN_TYPE.SOLANA: {
        tokenHoldings.push({
          address: new PublicKey(0).toBase58(),
          tokenProgram: new PublicKey(0),
          decimal: this.client.chainInfo.decimals,
          symbol: this.client.chainInfo.symbol,
          name: this.client.chainInfo.name,
          balance: (
            await provider.connection.getBalance(new PublicKey(account))
          ).toString(),
          price: (await this.fetchTokenInformation(new PublicKey(0).toBase58()))
            .price,
        });
        tokenHoldings.push(
          ...(await this.getSplTokenHoldings(
            new PublicKey(account),
            TOKEN_PROGRAM_ID
          ))
        );
        tokenHoldings.push(
          ...(await this.getSplTokenHoldings(
            new PublicKey(account),
            TOKEN_2022_PROGRAM_ID
          ))
        );
        break;
      }
    }
    return tokenHoldings;
  }

  async getSplTokenHoldings(
    account: PublicKey,
    tokenProgramId: PublicKey = TOKEN_PROGRAM_ID,
    provider: AnchorProvider = this.client.provider
  ): Promise<TokenInfo[]> {
    const tokenHoldings: TokenInfo[] = [];
    // Fetch all token accounts owned by the provided address
    const tokenAccounts = await provider.connection.getTokenAccountsByOwner(
      account,
      {
        programId: tokenProgramId,
      }
    );
    // Iterate through token accounts to find token balances
    for (const { pubkey, account } of tokenAccounts.value) {
      const tokenAccountInfo = account.data;
      const parsedData = Buffer.from(tokenAccountInfo).toJSON().data;
      const mint = new PublicKey(parsedData.slice(0, 32)).toBase58();
      const mintInfo = await getMint(provider.connection, new PublicKey(mint));

      // Token amount is stored as an unsigned integer in the first 8 bytes (BigInt)
      const amount = Buffer.from(parsedData.slice(64, 72)).readBigUInt64LE();
      const { name, price, symbol } = await this.fetchTokenInformation(mint);
      tokenHoldings.push({
        address: mint.toString(),
        balance: amount.toString(),
        decimal: Number(mintInfo.decimals),
        symbol,
        name,
        price,
        tokenProgram: tokenProgramId,
      });
    }
    return tokenHoldings;
  }

  async fetchTokenInformation(address: string): Promise<any> {
    if (isNative(address)) {
      const nativeApi = `https://api.coingecko.com/api/v3/simple/price?ids=${this.client.chainInfo.coingeckoPlatformId}&vs_currencies=usd`;
      const res = await fetch(nativeApi);
      const pMp = await res.json();
      return {
        name: this.client.chainInfo.name,
        symbol: this.client.chainInfo.symbol,
        price: pMp[this.client.chainInfo.coingeckoPlatformId]
          ? pMp[this.client.chainInfo.coingeckoPlatformId].usd
          : "0",
      };
    }
    const res1 = await fetch(
      `https://api.coingecko.com/api/v3/coins/${this.client.chainInfo.coingeckoPlatformId}/contract/${address}`
    );
    const { symbol, name } = await res1.json();
    const res2 = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/${this.client.chainInfo.coingeckoPlatformId}?contract_addresses=${address}&vs_currencies=usd`
    );
    const pMp = await res2.json();
    return {
      symbol,
      name,
      price: pMp[address] ? pMp[address].usd : "0",
    };
  }
}

export const chainTypeToCoinGeckoKey = (chainType: CHAIN_TYPE) => {
  switch (chainType) {
    case CHAIN_TYPE.SOLANA:
      return "solana";
    case CHAIN_TYPE.EVM:
      return "ethereum";
    default:
      return CHAIN_TYPE.NONE;
  }
};

export function isNative(adr: string) {
  if (adr == "11111111111111111111111111111111") return true;
  if (
    adr.toLowerCase() ==
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE".toLowerCase()
  )
    return true;
  return false;
}

// https://api.coingecko.com/api/v3/coins/${chain}/contract/${address}
// https://api.coingecko.com/api/v3/simple/token_price/${chain}?contract_addresses=${address}&vs_currencies=usd
