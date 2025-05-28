import type { JsonFragment } from "@ethersproject/abi";
import path from "path";
import {
  ExclusiveConstructorArgumentsError,
  ImportingModuleError,
  InvalidConstructorArgumentsModuleError,
} from "./errors";

/**
 * Returns the list of constructor arguments from the constructorArgsModule
 * or the constructorArgsParams if the first is not defined.
 */
export async function resolveConstructorArguments(
  constructorArgsParams: string[],
  constructorArgsModule?: string
): Promise<string[]> {
  if (constructorArgsModule === undefined) {
    return constructorArgsParams;
  }

  if (constructorArgsParams.length > 0) {
    throw new ExclusiveConstructorArgumentsError();
  }

  const constructorArgsModulePath = path.resolve(
    process.cwd(),
    constructorArgsModule
  );

  try {
    const constructorArguments = (await import(constructorArgsModulePath))
      .default;

    if (!Array.isArray(constructorArguments)) {
      throw new InvalidConstructorArgumentsModuleError(
        constructorArgsModulePath
      );
    }

    return constructorArguments;
  } catch (error: any) {
    throw new ImportingModuleError("constructor arguments list", error);
  }
}

/**
 * Encodes the constructor arguments for a given contract.
 */
export async function encodeArguments(
  abi: JsonFragment[],
  constructorArguments: any[]
): Promise<string> {
  const { Interface } = await import("@ethersproject/abi");

  const contractInterface = new Interface(abi);
  let encodedConstructorArguments: string = "";
  try {
    encodedConstructorArguments = contractInterface
      .encodeDeploy(constructorArguments)
      .replace("0x", "");
  } catch (error) {
    throw error;
  }
  return encodedConstructorArguments;
}
