import inquirer from "inquirer";
import { EncodedWallet } from "../../wallet";
import { decrypt } from "../utils/crypto";
import {
  uniqueNamesGenerator,
  Config,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";
import { CHAIN_TYPE, CHAIN_TYPE_FROM_STRING } from "../../types/chains";

export async function askKeepPrivate(): Promise<boolean> {
  const { keepPrivate } = await inquirer.prompt([
    {
      type: "confirm",
      name: "keepPrivate",
      message: "do you want to keep it private! (default to n)",
      default: false,
      askAnswered: true,
    },
  ]);
  return keepPrivate;
}

export async function askShowPrivate(): Promise<boolean> {
  const { showPrivate } = await inquirer.prompt([
    {
      type: "confirm",
      name: "showPrivate",
      message: "do you want to view private accounts: (default to n)",
      default: false,
      askAnswered: true,
    },
  ]);
  return showPrivate;
}

export async function askKeyOrPhraseName(): Promise<string> {
  const customConfig: Config = {
    dictionaries: [adjectives, colors],
    separator: "-",
    length: 2,
  };
  //   const randomName: string = uniqueNamesGenerator({
  //     dictionaries: [adjectives, colors, animals],
  //   }); // big_red_donkey
  const { name } = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "give a unique name: ",
      default: uniqueNamesGenerator(customConfig),
      askAnswered: true,
    },
  ]);
  return name;
}

export async function askPrivateKey(wallet: EncodedWallet): Promise<string> {
  const { pk } = await inquirer.prompt([
    {
      type: "password",
      name: "pk",
      message: "Enter private key to import: ",
      validate(value) {
        if (wallet.isAlreadyExist(value, false))
          return "Seed already imported!";
        return true;
      },
      mask: "*",
    },
  ]);
  return pk;
}

export async function askSeedPhrase(wallet: EncodedWallet): Promise<string> {
  const { seed } = await inquirer.prompt([
    {
      type: "password",
      name: "seed",
      message: "Enter seed to import: ",
      mask: "*",
      validate(value) {
        if (!value) value = "24";
        if (![12, 15, 18, 21, 24].includes(value.split(" ").length))
          return "Please enter a valid seed with length (12, 15, 18, 21, or 24)";
        if (wallet.isAlreadyExist(value)) return "Seed already imported!";
        return true;
      },
    },
  ]);
  return seed;
}

export async function askNoOfSeedWords(): Promise<number> {
  const { noOfwords } = await inquirer.prompt([
    {
      type: "input",
      name: "noOfwords",
      message: "Enter no of words for seed(default 24): ",
      validate(value) {
        if (!value) value = "24";
        const numberValue = parseInt(value, 10);
        if (isNaN(numberValue)) {
          return "Please enter a valid number";
        }
        if (![12, 15, 18, 21, 24].includes(numberValue)) {
          return "Please enter a valid word count (12, 15, 18, 21, or 24)";
        }
        return true;
      },
    },
  ]);
  return Number(noOfwords);
}

export async function askToSelectMountedUsb(
  wallet: EncodedWallet
): Promise<string | null> {
  const usbPaths = await wallet.getAllMountedUSB();
  if (!usbPaths.length) return null;
  const { useUsb } = await inquirer.prompt([
    {
      type: "confirm",
      message: "do you want to use connect usb?",
      default: false,
      name: "useUsb",
    },
  ]);
  if (!useUsb) return null;
  const { path } = await inquirer.prompt([
    {
      type: "list",
      name: "path",
      message: "Select your usb:",
      loop: false,
      choices: usbPaths,
    },
  ]);
  return path;
}

export async function askPasswordToDecryptData(data: string): Promise<{
  password: string;
  decryptedData: any;
}> {
  let decryptedData: any;
  const { password } = await inquirer.prompt([
    {
      type: "password",
      name: "password",
      message: "Enter password to unlock the wallet: ",
      mask: "*",
      validate(value) {
        try {
          decryptedData = JSON.parse(decrypt(data, value));
          return true;
        } catch (error) {
          return "Incorrect password. Please try again.";
        }
      },
    },
  ]);
  return { password, decryptedData };
}

export async function askChainType(
  giveNoneOption: boolean = true
): Promise<CHAIN_TYPE> {
  const chainTypes = ["EVM", "SOLANA", "SUBSTRATE", "TON", "SUI"];
  const { chainType } = await inquirer.prompt([
    {
      type: "list",
      name: "chainType",
      message: "Select your chain type: ",
      choices: giveNoneOption ? ["NONE", ...chainTypes] : chainTypes,
      default: giveNoneOption ? "NONE" : "EVM",
      askAnswered: true,
    },
  ]);
  return CHAIN_TYPE_FROM_STRING(chainType);
}
