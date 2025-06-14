import {
  ABIArgumentLengthErrorType,
  ABIArgumentOverflowErrorType,
  ABIArgumentTypeErrorType,
} from "./abi-validation-extras";

export class HardhatVerifyError {
  constructor(message: string, parent?: Error) {}
}

export class MissingAddressError extends HardhatVerifyError {
  constructor() {
    super(
      "You didn’t provide any address. Please re-run the 'verify' task with the address of the contract you want to verify."
    );
  }
}

export class InvalidAddressError extends HardhatVerifyError {
  constructor(address: string) {
    super(`${address} is an invalid address.`);
  }
}

export class InvalidContractNameError extends HardhatVerifyError {
  constructor(contractName: string) {
    super(`A valid fully qualified name was expected. Fully qualified names look like this: "contracts/AContract.sol:TheContract"
Instead, this name was received: ${contractName}`);
  }
}

export class MissingApiKeyError extends HardhatVerifyError {
  constructor(network: string) {
    super(`You are trying to verify a contract in '${network}', but no API token was found for this network. Please provide one in your hardhat config. For example:

{
  ...
  etherscan: {
    apiKey: {
      ${network}: 'your API key'
    }
  }
}

See https://etherscan.io/apis`);
  }
}

export class ExclusiveConstructorArgumentsError extends HardhatVerifyError {
  constructor() {
    super(
      "The parameters constructorArgsParams and constructorArgsModule are exclusive. Please provide only one of them."
    );
  }
}

export class InvalidConstructorArgumentsModuleError extends HardhatVerifyError {
  constructor(constructorArgsModulePath: string) {
    super(`The module ${constructorArgsModulePath} doesn't export a list. The module should look like this:

module.exports = [ arg1, arg2, ... ];`);
  }
}

export class InvalidLibrariesModuleError extends HardhatVerifyError {
  constructor(librariesModulePath: string) {
    super(`The module ${librariesModulePath} doesn't export a dictionary. The module should look like this:

module.exports = { lib1: "0x...", lib2: "0x...", ... };`);
  }
}

export class ImportingModuleError extends HardhatVerifyError {
  constructor(module: string, parent: Error) {
    super(
      `Importing the module for the ${module} failed.
Reason: ${parent.message}`,
      parent
    );
  }
}

export class HardhatNetworkNotSupportedError extends HardhatVerifyError {
  constructor() {
    super(
      `The selected network is "hardhat", which is not supported for contract verification. Please choose a network supported by Etherscan.

If you intended to use a different network, ensure that you provide the --network parameter when running the command.

For example: npx hardhat verify --network <network-name>`
    );
  }
}

export class ChainConfigNotFoundError extends HardhatVerifyError {
  constructor(chainId: number) {
    super(`Trying to verify a contract in a network with chain id ${chainId}, but the plugin doesn't recognize it as a supported chain.

You can manually add support for it by following these instructions: https://hardhat.org/verify-custom-networks

To see the list of supported networks, run this command:

  npx hardhat verify --list-networks`);
  }
}

export class ContractVerificationRequestError extends HardhatVerifyError {
  constructor(url: string, parent: Error) {
    super(
      `Failed to send contract verification request.
Endpoint URL: ${url}
Reason: ${parent.message}`,
      parent
    );
  }
}

export class ContractVerificationInvalidStatusCodeError extends HardhatVerifyError {
  constructor(url: string, statusCode: number, responseText: string) {
    super(`Failed to send contract verification request.
Endpoint URL: ${url}
The HTTP server response is not ok. Status code: ${statusCode} Response text: ${responseText}`);
  }
}

export class ContractVerificationMissingBytecodeError extends HardhatVerifyError {
  constructor(url: string, contractAddress: string) {
    super(`Failed to send contract verification request.
Endpoint URL: ${url}
Reason: The Etherscan API responded that the address ${contractAddress} does not have bytecode.
This can happen if the contract was recently deployed and this fact hasn't propagated to the backend yet.
Try waiting for a minute before verifying your contract. If you are invoking this from a script,
try to wait for five confirmations of your contract deployment transaction before running the verification subtask.`);
  }
}

export class ContractStatusPollingError extends HardhatVerifyError {
  constructor(url: string, parent: Error) {
    super(
      `Failure during etherscan status polling. The verification may still succeed but
should be checked manually.
Endpoint URL: ${url}
Reason: ${parent.message}`,
      parent
    );
  }
}

export class ContractStatusPollingInvalidStatusCodeError extends HardhatVerifyError {
  constructor(statusCode: number, responseText: string) {
    super(
      `The HTTP server response is not ok. Status code: ${statusCode} Response text: ${responseText}`
    );
  }
}

export class ContractStatusPollingResponseNotOkError extends HardhatVerifyError {
  constructor(message: string) {
    super(`The Etherscan API responded with a failure status.
The verification may still succeed but should be checked manually.
Reason: ${message}`);
  }
}

export class EtherscanVersionNotSupportedError extends HardhatVerifyError {
  constructor() {
    super(`Etherscan only supports compiler versions 0.4.11 and higher.
See https://etherscan.io/solcversions for more information.`);
  }
}

export class DeployedBytecodeNotFoundError extends HardhatVerifyError {
  constructor(address: string, network: string) {
    super(`The address ${address} has no bytecode. Is the contract deployed to this network?
The selected network is ${network}.`);
  }
}

export class CompilerVersionsMismatchError extends HardhatVerifyError {
  constructor(
    configCompilerVersions: string[],
    inferredCompilerVersion: string,
    network: string
  ) {
    const versionDetails =
      configCompilerVersions.length > 1
        ? `versions are: ${configCompilerVersions.join(", ")}`
        : `version is: ${configCompilerVersions[0]}`;

    super(`The contract you want to verify was compiled with solidity ${inferredCompilerVersion}, but your configured compiler ${versionDetails}.

Possible causes are:
- You are not in the same commit that was used to deploy the contract.
- Wrong compiler version selected in hardhat config.
- The given address is wrong.
- The selected network (${network}) is wrong.`);
  }
}

export class ContractNotFoundError extends HardhatVerifyError {
  constructor(contractFQN: string) {
    super(`The contract ${contractFQN} is not present in your project.`);
  }
}

export class BuildInfoNotFoundError extends HardhatVerifyError {
  constructor(contractFQN: string) {
    super(`The contract ${contractFQN} is present in your project, but we couldn't find its sources.
Please make sure that it has been compiled by Hardhat and that it is written in Solidity.`);
  }
}

export class BuildInfoCompilerVersionMismatchError extends HardhatVerifyError {
  constructor(
    contractFQN: string,
    compilerVersion: string,
    isVersionRange: boolean,
    buildInfoCompilerVersion: string,
    network: string
  ) {
    const versionDetails = isVersionRange
      ? `a solidity version in the range ${compilerVersion}`
      : `the solidity version ${compilerVersion}`;

    super(`The contract ${contractFQN} is being compiled with ${buildInfoCompilerVersion}.
However, the contract found in the address provided as argument has its bytecode marked with ${versionDetails}.

Possible causes are:
- Solidity compiler version settings were modified after the deployment was executed.
- The given address is wrong.
- The selected network (${network}) is wrong.`);
  }
}

export class DeployedBytecodeMismatchError extends HardhatVerifyError {
  constructor(network: string, contractFQN?: string) {
    const contractDetails =
      typeof contractFQN === "string"
        ? `the contract ${contractFQN}.`
        : `any of your local contracts.`;
    super(`The address provided as argument contains a contract, but its bytecode doesn't match ${contractDetails}

Possible causes are:
  - The artifact for that contract is outdated or missing. You can try compiling the project again with the --force flag before re-running the verification.
  - The contract's code changed after the deployment was executed. Sometimes this happens by changes in seemingly unrelated contracts.
  - The solidity compiler settings were modified after the deployment was executed (like the optimizer, target EVM, etc.)
  - The given address is wrong.
  - The selected network (${network}) is wrong.`);
  }
}

export class InvalidLibraryAddressError extends HardhatVerifyError {
  constructor(
    contractName: string,
    libraryName: string,
    libraryAddress: string
  ) {
    super(
      `You gave a link for the contract ${contractName} with the library ${libraryName}, but provided this invalid address: ${libraryAddress}`
    );
  }
}

export class DuplicatedLibraryError extends HardhatVerifyError {
  constructor(libraryName: string, libraryFQN: string) {
    super(
      `The library names ${libraryName} and ${libraryFQN} refer to the same library and were given as two entries in the libraries dictionary.
Remove one of them and review your libraries dictionary before proceeding.`
    );
  }
}

export class LibraryNotFoundError extends HardhatVerifyError {
  constructor(
    contractName: string,
    libraryName: string,
    allLibraries: string[],
    detectableLibraries: string[],
    undetectableLibraries: string[]
  ) {
    const contractLibrariesDetails = `This contract uses the following external libraries:
${undetectableLibraries.map((x) => `  * ${x}`).join("\n")}
${detectableLibraries.map((x) => `  * ${x} (optional)`).join("\n")}
${
  detectableLibraries.length > 0
    ? "Libraries marked as optional don't need to be specified since their addresses are autodetected by the plugin."
    : ""
}`;

    super(`You gave an address for the library ${libraryName} in the libraries dictionary, which is not one of the libraries of contract ${contractName}.
${
  allLibraries.length > 0
    ? contractLibrariesDetails
    : "This contract doesn't use any external libraries."
}`);
  }
}

export class LibraryMultipleMatchesError extends HardhatVerifyError {
  constructor(contractName: string, libraryName: string, fqnMatches: string[]) {
    super(`The library name ${libraryName} is ambiguous for the contract ${contractName}.
It may resolve to one of the following libraries:
${fqnMatches.map((x) => `  * ${x}`).join("\n")}

To fix this, choose one of these fully qualified library names and replace it in your libraries dictionary.`);
  }
}

export class MissingLibrariesError extends HardhatVerifyError {
  constructor(
    contractName: string,
    allLibraries: string[],
    mergedLibraries: string[],
    undetectableLibraries: string[]
  ) {
    const missingLibraries = allLibraries.filter(
      (lib) => !mergedLibraries.some((mergedLib) => lib === mergedLib)
    );

    super(`The contract ${contractName} has one or more library addresses that cannot be detected from deployed bytecode.
This can occur if the library is only called in the contract constructor. The missing libraries are:
${missingLibraries.map((x) => `  * ${x}`).join("\n")}

${
  missingLibraries.length === undetectableLibraries.length
    ? "Visit https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify#libraries-with-undetectable-addresses to learn how to solve this."
    : "To solve this, you can add them to your --libraries dictionary with their corresponding addresses."
}`);
  }
}

export class LibraryAddressesMismatchError extends HardhatVerifyError {
  constructor(
    conflicts: Array<{
      library: string;
      detectedAddress: string;
      inputAddress: string;
    }>
  ) {
    super(`The following detected library addresses are different from the ones provided:
${conflicts
  .map(
    ({ library, inputAddress, detectedAddress }) =>
      `  * ${library}
given address: ${inputAddress}
detected address: ${detectedAddress}`
  )
  .join("\n")}

You can either fix these addresses in your libraries dictionary or simply remove them to let the plugin autodetect them.`);
  }
}

export class UnexpectedNumberOfFilesError extends HardhatVerifyError {
  constructor() {
    super(
      "The plugin found an unexpected number of files for this contract. Please report this issue to the Hardhat team."
    );
  }
}

export class ABIArgumentLengthError extends HardhatVerifyError {
  constructor(
    sourceName: string,
    contractName: string,
    error: ABIArgumentLengthErrorType
  ) {
    const { types: requiredArgs, values: providedArgs } = error.count;
    super(
      `The constructor for ${sourceName}:${contractName} has ${requiredArgs} parameters
but ${providedArgs} arguments were provided instead.`,
      error
    );
  }
}

export class ABIArgumentTypeError extends HardhatVerifyError {
  constructor(error: ABIArgumentTypeErrorType) {
    const { value: argValue, argument: argName, reason } = error;
    super(
      `Value ${argValue} cannot be encoded for the parameter ${argName}.
Encoder error reason: ${reason}`,
      error
    );
  }
}

export class ABIArgumentOverflowError extends HardhatVerifyError {
  constructor(error: ABIArgumentOverflowErrorType) {
    const { value: argValue, fault: reason, operation } = error;
    super(
      `Value ${argValue} is not a safe integer and cannot be encoded.
Use a string instead of a plain number.
Encoder error reason: ${reason} fault in ${operation}`,
      error
    );
  }
}

export class VerificationAPIUnexpectedMessageError extends HardhatVerifyError {
  constructor(message: string) {
    super(`The API responded with an unexpected message.
Please report this issue to the Hardhat team.
Contract verification may have succeeded and should be checked manually.
Message: ${message}`);
  }
}

export class ContractVerificationFailedError extends HardhatVerifyError {
  constructor(message: string, undetectableLibraries: string[]) {
    super(`The contract verification failed.
Reason: ${message}
${
  undetectableLibraries.length > 0
    ? `
This contract makes use of libraries whose addresses are undetectable by the plugin.
Keep in mind that this verification failure may be due to passing in the wrong
address for one of these libraries:
${undetectableLibraries.map((x) => `  * ${x}`).join("\n")}`
    : ""
}`);
  }
}
