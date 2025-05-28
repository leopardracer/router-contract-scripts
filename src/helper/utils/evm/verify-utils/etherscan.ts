import type { Dispatcher } from "undici";
import {
  ContractStatusPollingError,
  ContractStatusPollingInvalidStatusCodeError,
  ContractVerificationRequestError,
  ContractVerificationMissingBytecodeError,
  ContractVerificationInvalidStatusCodeError,
  HardhatVerifyError,
  ContractStatusPollingResponseNotOkError,
  VerificationAPIUnexpectedMessageError,
} from "./errors";
import { sendGetRequest, sendPostRequest } from "./undici";
import { sleep } from "../../utils";

// Used for polling the result of the contract verification.
const VERIFICATION_STATUS_POLLING_TIME = 3000;
/**
 * Etherscan verification provider for verifying smart contracts.
 * It should work with other verification providers as long as the interface
 * is compatible with Etherscan's.
 */
export class Etherscan {
  /**
   * Create a new instance of the Etherscan verification provider.
   * @param apiKey - The Etherscan API key.
   * @param apiUrl - The Etherscan API URL, e.g. https://api.etherscan.io/api.
   * @param browserUrl - The Etherscan browser URL, e.g. https://etherscan.io.
   */
  constructor(
    public apiKey: string,
    public apiUrl: string,
    public browserUrl: string
  ) {}

  public static fromChainConfig(chainInfo: any) {
    const apiUrl = chainInfo.urls!.apiURL;
    const browserUrl = chainInfo.urls!.browserURL.trim().replace(/\/$/, "");
    return new Etherscan(chainInfo.apiKey, apiUrl, browserUrl);
  }

  /**
   * Check if a smart contract is verified on Etherscan.
   * @link https://docs.etherscan.io/api-endpoints/contracts#get-contract-source-code-for-verified-contract-source-codes
   * @param address - The address of the smart contract.
   * @returns True if the contract is verified, false otherwise.
   */
  public async isVerified(address: string) {
    const parameters = new URLSearchParams({
      apikey: this.apiKey,
      module: "contract",
      action: "getsourcecode",
      address,
    });

    const url = new URL(this.apiUrl);
    url.search = parameters.toString();

    const response = await sendGetRequest(url);
    const json: any = await response.body.json();

    if (json.message !== "OK") {
      return false;
    }

    const sourceCode = json?.result?.[0]?.SourceCode;
    return sourceCode !== undefined && sourceCode !== "";
  }

  /**
   * Verify a smart contract on Etherscan.
   * @link https://docs.etherscan.io/api-endpoints/contracts#verify-source-code
   * @param contractAddress - The address of the smart contract to verify.
   * @param sourceCode - The source code of the smart contract.
   * @param contractName - The name of the smart contract, e.g. "contracts/Sample.sol:MyContract"
   * @param compilerVersion - The version of the Solidity compiler used, e.g. `v0.8.19+commit.7dd6d404`
   * @param constructorArguments - The encoded constructor arguments of the smart contract.
   * @returns A promise that resolves to an `EtherscanResponse` object.
   * @throws {ContractVerificationRequestError} if there is an error on the request.
   * @throws {ContractVerificationInvalidStatusCodeError} if the API returns an invalid status code.
   * @throws {ContractVerificationMissingBytecodeError} if the bytecode is not found on the block explorer.
   * @throws {HardhatVerifyError} if the response status is not OK.
   */
  private async _verify(
    contractAddress: string,
    sourceCode: string,
    contractName: string,
    compilerVersion: string,
    constructorArguments: string
  ): Promise<EtherscanResponse> {
    const parameters = new URLSearchParams({
      apikey: this.apiKey,
      module: "contract",
      action: "verifysourcecode",
      contractaddress: contractAddress,
      sourceCode,
      codeformat: "solidity-standard-json-input",
      contractname: contractName,
      compilerversion: compilerVersion,
      constructorArguements: constructorArguments,
    });
    let response: Dispatcher.ResponseData;
    try {
      response = await sendPostRequest(
        new URL(this.apiUrl),
        parameters.toString()
      );
    } catch (error: any) {
      throw new ContractVerificationRequestError(this.apiUrl, error);
    }
    if (!(response.statusCode >= 200 && response.statusCode <= 299)) {
      // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
      const responseText = await response.body.text();
      throw new ContractVerificationInvalidStatusCodeError(
        this.apiUrl,
        response.statusCode,
        responseText
      );
    }
    const etherscanResponse = new EtherscanResponse(await response.body.json());
    if (etherscanResponse.isBytecodeMissingInNetworkError()) {
      throw new ContractVerificationMissingBytecodeError(
        this.apiUrl,
        contractAddress
      );
    }
    if (!etherscanResponse.isOk()) {
      throw new HardhatVerifyError(etherscanResponse.message);
    }
    return etherscanResponse;
  }

  public async verify(
    contractAddress: any,
    compilerInput: any,
    contractInformation: any,
    encodedConstructorArguments: any
  ) {
    const { message: guid } = await this._verify(
      contractAddress,
      JSON.stringify(compilerInput),
      `${contractInformation.contractPath}:${contractInformation.contractName}`,
      `v${contractInformation.solcLongVersion}`,
      encodedConstructorArguments
    );
    console.log(`Successfully submitted source code for contract
    ${contractInformation.contractPath}:${contractInformation.contractName} at ${contractAddress}
    for verification on the block explorer. Waiting for verification result...
    `);

    // Compilation is bound to take some time so there's no sense in requesting status immediately.
    await sleep(700);
    const verificationStatus = await this.getVerificationStatus(guid);
    console.log(verificationStatus);

    if (!(verificationStatus.isFailure() || verificationStatus.isSuccess())) {
      // Reaching this point shouldn't be possible unless the API is behaving in a new way.
      throw new VerificationAPIUnexpectedMessageError(
        verificationStatus.message
      );
    }
    if (verificationStatus.isSuccess()) {
      const contractURL = this.getContractUrl(contractAddress);
      console.log(`Successfully verified contract ${contractInformation.contractName} on the block explorer.
    ${contractURL}`);
    }
    return {
      success: verificationStatus.isSuccess(),
      message: verificationStatus.message,
    };
  }

  /**
   * Get the verification status of a smart contract from Etherscan.
   * This method performs polling of the verification status if it's pending.
   * @link https://docs.etherscan.io/api-endpoints/contracts#check-source-code-verification-submission-status
   * @param guid - The verification GUID to check.
   * @returns A promise that resolves to an `EtherscanResponse` object.
   * @throws {ContractStatusPollingError} if there is an error on the request.
   * @throws {ContractStatusPollingInvalidStatusCodeError} if the API returns an invalid status code.
   * @throws {ContractStatusPollingResponseNotOkError} if the response status is not OK.
   */
  public async getVerificationStatus(guid: string): Promise<EtherscanResponse> {
    const parameters = new URLSearchParams({
      apikey: this.apiKey,
      module: "contract",
      action: "checkverifystatus",
      guid,
    });
    const url = new URL(this.apiUrl);
    url.search = parameters.toString();

    let response: any;
    try {
      response = await sendGetRequest(url);
    } catch (error: any) {
      throw new ContractStatusPollingError(url.toString(), error);
    }

    if (!(response.statusCode >= 200 && response.statusCode <= 299)) {
      // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
      const responseText = await response.body.text();

      throw new ContractStatusPollingInvalidStatusCodeError(
        response.statusCode,
        responseText
      );
    }

    const etherscanResponse = new EtherscanResponse(await response.body.json());

    if (etherscanResponse.isPending()) {
      await sleep(VERIFICATION_STATUS_POLLING_TIME);
      return this.getVerificationStatus(guid);
    }

    if (etherscanResponse.isFailure()) {
      return etherscanResponse;
    }

    if (!etherscanResponse.isOk()) {
      throw new ContractStatusPollingResponseNotOkError(
        etherscanResponse.message
      );
    }

    return etherscanResponse;
  }

  /**
   * Get the Etherscan URL for viewing a contract's details.
   * @param address - The address of the smart contract.
   * @returns The URL to view the contract on Etherscan's website.
   */
  public getContractUrl(address: string) {
    return `${this.browserUrl}/address/${address}#code`;
  }
}

class EtherscanResponse {
  public readonly status: number;

  public readonly message: string;

  constructor(response: any) {
    this.status = parseInt(response.status, 10);
    this.message = response.result;
  }

  public isPending() {
    return this.message === "Pending in queue";
  }

  public isFailure() {
    return this.message === "Fail - Unable to verify";
  }

  public isSuccess() {
    return this.message === "Pass - Verified";
  }

  public isBytecodeMissingInNetworkError() {
    return this.message.startsWith("Unable to locate ContractCode at");
  }

  public isOk() {
    return this.status === 1;
  }
}
