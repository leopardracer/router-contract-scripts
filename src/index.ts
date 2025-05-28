import { Command } from "commander";
import inquirer from "inquirer";
import { Client } from "./client/client";
import { walletHandler } from "./helper/wallet/index.ts";
import { tokenHandler } from "./helper/tokens/index.ts";
import { gatewayHandler } from "./helper/gateway/index.ts";
import { assetBridgeHandler } from "./helper/asset-bridge/index.ts";

async function main() {
  const program = new Command();
  const client = new Client();
  handle(client, program);
  program.parse(process.argv);
}

// Catch unhandled rejections
process.on("unhandledRejection", (reason) => {
  if (
    reason &&
    reason instanceof Error &&
    reason.message.includes("ExitPromptError")
  ) {
    console.log("\nPrompt exited by user.");
  } else {
    console.error("Unhandled rejection:", reason);
  }
});

// Catch ctrl + c and exit gracefully
process.on("SIGINT", () => {
  console.log("\nPrompt exited by user (ctrl + c).");
  process.exit(0);
});

// Run the main function and catch any other errors
main().catch((error) => {
  if (error && error.message.includes("ExitPromptError")) {
    console.log("\nPrompt closed by user.");
  } else {
    console.error("An unexpected error occurred:", error);
  }
});

function handle(client: Client, command: Command) {
  command
    // .command("")
    .description("rsc handler")
    // .argument("<password>", "password to encrpt key")
    .action(async (password) => {
      //@ts-ignore
      let answers = await inquirer.prompt([
        {
          type: "list",
          name: "option",
          message: "Select your options:",
          choices: ["Wallet", "Tokens", "Gateway", "Asset Bridge"],
        },
      ]);
      switch (answers.option) {
        case "Wallet":
          await walletHandler(client, command);
          break;
        case "Tokens":
          await tokenHandler(client, command);
          break;
        case "Gateway":
          await gatewayHandler(client, command);
          break;
        case "Asset Bridge":
          await assetBridgeHandler(client, command);
          break;
      }
    });
}
