import { Command } from "commander";
import inquirer from "inquirer";
import { Client } from "./client/client";
import { walletHandler } from "./helper/wallet/index.ts";
import { tokenHandler } from "./helper/tokens/index.ts";
import { gatewayHandler } from "./helper/gateway/index.ts";
import { assetBridgeHandler } from "./helper/asset-bridge/index.ts";

async function main() {
  try {
    const program = new Command();
    const client = new Client();
    handle(client, program);
    program.parse(process.argv);
  } catch (error) {
    throw error;
  }
}

// Catch unhandled rejections
process.on("unhandledRejection", (reason) => {
  if (
    reason &&
    reason instanceof Error &&
    (reason.message.includes("ExitPromptError") ||
      reason.name === "ExitPromptError" ||
      reason.message.includes("User force closed the prompt"))
  ) {
    console.log("\nOperation cancelled by user.");
    process.exit(0);
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
  if (
    error &&
    (error.message.includes("ExitPromptError") ||
      error.name === "ExitPromptError" ||
      error.message.includes("User force closed the prompt"))
  ) {
    console.log("\nOperation cancelled by user (ctrl + c).");
    process.exit(0);
  } else {
    console.error("An unexpected error occurred:", error);
  }
});

function handle(client: Client, command: Command) {
  command
    // .command("")
    .description("rsc handler")
    // .argument("<password>", "password to encrypt key")
    .action(async (password) => {
      try {
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
      } catch (error) {
        // if (
        //   error &&
        //   (error.message.includes("ExitPromptError") ||
        //     error.name === "ExitPromptError" ||
        //     error.message.includes("User force closed the prompt"))
        // ) {
        //   console.log("\nOperation cancelled by user.");
        //   process.exit(0);
        // }
        throw error;
      }
    });
}
