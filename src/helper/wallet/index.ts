import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { Client } from "../../client/client";
import { EncodedWallet } from "../../wallet";
import { CHAIN_TYPE, CHAIN_TYPE_FROM_STRING } from "../../types/chains";
import { exec } from "child_process";
import {
  listMountedUSBDrives,
  readFileOnUSB,
  writeFileToUSB,
} from "../utils/usb";
import {
  askChainType,
  askKeepPrivate,
  askKeyOrPhraseName,
  askNoOfSeedWords,
  askPrivateKey,
  askSeedPhrase,
  askShowPrivate,
} from "../asker/wallet";

export async function walletHandler(client: Client, command: Command) {
  const { option } = await inquirer.prompt([
    {
      type: "list",
      name: "option",
      message: "Select your options:",
      choices: [
        "Display Wallet",
        "Generate KeyPair",
        "Import From Seed",
        "Import From Private Key",
        "Change Password",
        "Export Wallet",
        "Reset Wallet",
      ],
    },
  ]);
  const wallet = new EncodedWallet();
  switch (option) {
    case "Display Wallet": {
      await wallet.connect(await askChainType(false));
      await wallet.selectWallet(await askShowPrivate());
      break;
    }
    case "Generate KeyPair": {
      await wallet.connect(await askChainType());
      await wallet.getKeyPair(
        await askNoOfSeedWords(),
        await askKeepPrivate(),
        await askKeyOrPhraseName()
      );
      break;
    }
    case "Import From Seed": {
      await wallet.connect(await askChainType());
      const seed = await askSeedPhrase(wallet);
      await wallet.storeKeyPair(
        seed,
        await askKeepPrivate(),
        await askKeyOrPhraseName()
      );
      break;
    }
    case "Import From Private Key": {
      await wallet.connect(await askChainType());
      const pk = await askPrivateKey(wallet);
      await wallet.storeKeyPair(
        pk.toString().startsWith("0x") ? pk : `0x${pk}`,
        await askKeepPrivate(),
        await askKeyOrPhraseName(),
        false
      );
      break;
    }
    case "Change Password": {
      await wallet.connect();
      await wallet.changePassword();
      break;
    }
    case "Export Wallet": {
      await wallet.connect();
      await wallet.export();
      break;
    }
    case "Reset Wallet": {
      await wallet.connect();
      const { confirmAction } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmAction",
          message: chalk.redBright(
            "Are you sure you want to reset your wallet?"
          ),
          default: false,
        },
      ]);
      if (confirmAction) await wallet.reset();
      break;
    }
  }
}
