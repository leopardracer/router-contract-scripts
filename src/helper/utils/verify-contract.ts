import path from "path";
import { CHAIN_TYPE } from "../../types/chains";
import { Etherscan } from "./evm/verify-utils/etherscan";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs-extra";
import { encodeArguments } from "./evm/verify-utils/utilities";
import ora from "ora";
import chalk from "chalk";

const execASync = promisify(exec);

interface VerificationResponse {
  success: boolean;
  message: string;
}

export class ContractVerifier {
  verifier: any;
  spinner = ora();

  constructor(chainType: CHAIN_TYPE | undefined, chainInfo: any) {
    switch (chainType) {
      case CHAIN_TYPE.EVM:
        this.verifier = Etherscan.fromChainConfig(chainInfo);
        break;
      default:
        throw new Error(`${chainType} not handled yet!!`);
    }
  }

  async verify(
    contractAddress: string,
    constructorArgs: any[],
    {
      cwd,
      contractPath,
      contractName,
      libraries,
    }: {
      cwd: string;
      contractPath: string;
      contractName: string;
      libraries?: Object;
    }
  ) {
    this.spinner.start(`Verifiying Contract ${contractAddress}...`);
    const { stdout } = await execASync(
      `forge inspect ${cwd}/${contractPath}:${contractName} metadata`,
      {
        encoding: "utf8",
        cwd,
      }
    );
    const metadata = JSON.parse(stdout);
    const isVerified = await this.verifier.isVerified(contractAddress);
    if (isVerified) {
      const contractURL = this.verifier.getContractUrl(contractAddress);
      this.spinner.succeed(
        chalk.green(`The contract ${contractAddress} has already been verified.
    ${contractURL}`)
      );
      return;
    }
    const { abi } = await fs.readJSON(
      path.join(
        cwd,
        `/artifacts/foundry/${contractName}.sol/${contractName}.json`
      ),
      "utf-8"
    );
    const encodedConstructorArguments = await encodeArguments(
      abi,
      constructorArgs
    );
    const sources: any = {};
    // Process each source in metadata
    for (const [filePath, fileData] of Object.entries(metadata.sources)) {
      // @ts-ignore
      if (fileData.urls) {
        const content = getSourceContent(`${cwd}/${filePath}`);
        if (content) {
          sources[filePath] = { content };
        } else {
          throw new Error(`Error: Unable to retrieve content for ${filePath}`);
        }
      } else {
        // If URLs are not present, keep the original content (or handle as needed)
        //@ts-ignore
        sources[filePath] = { content: fileData.content };
      }
    }
    delete metadata.settings.compilationTarget;
    const {
      success: fullCompilerInputVerificationSuccess,
      message: verificationMessage,
    }: VerificationResponse = await this.verifier.verify(
      contractAddress,
      {
        language: metadata.language,
        sources,
        settings: {
          ...metadata.settings,
          evmVersion: "paris",
          metadata: { useLiteralContent: true },
          outputSelection: {
            "*": {
              "*": ["evm.bytecode.object", "abi"],
            },
          },
          libraries: libraries ? libraries : {},
        },
      },
      {
        contractPath,
        contractName,
        solcLongVersion: metadata.compiler.version,
      },
      encodedConstructorArguments
    );
    if (fullCompilerInputVerificationSuccess) {
      this.spinner.succeed(
        chalk.green(`Contract ${contractAddress} verified!`)
      );
      return;
    }
    this.spinner.fail(chalk.red(verificationMessage));
  }
}

function getSourceContent(filePath: any) {
  // Check if file exists in the local system (e.g., node_modules path)
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, "utf8");
  } else {
    console.warn(`Warning: File not found - ${filePath}`);
    return null;
  }
}
