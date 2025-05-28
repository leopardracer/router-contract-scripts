import inquirer from "inquirer";
import { CHAIN_TYPE } from "../../types/chains";

export async function askAddress(chainType: CHAIN_TYPE): Promise<string> {
  const { recipient } = await inquirer.prompt([
    {
      type: "input",
      name: "recipient",
      message: "enter recipient: ",
      validate(value) {
        //TODO: validate value for address
        switch (chainType) {
          case CHAIN_TYPE.EVM:
          // validate for evm
          case CHAIN_TYPE.SOLANA:
          // validate for solana
        }
        return true;
      },
    },
  ]);
  return recipient;
}

export async function askAmount(): Promise<string> {
  const { amount } = await inquirer.prompt([
    {
      type: "input",
      name: "amount",
      message: "enter amount: ",
    },
  ]);
  return amount;
}
