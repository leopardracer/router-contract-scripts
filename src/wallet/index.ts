import * as fs from "fs-extra";
import * as path from "path";
import { CHAIN_TYPE } from "../types/chains";
import { EncodedWalletType } from "../types/wallet";
import { decrypt, encrypt } from "../helper/utils/crypto";
import chalk from "chalk";
import inquirer from "inquirer";
import { ethers } from "ethers";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  askPasswordToDecryptData,
  askToSelectMountedUsb,
} from "../helper/asker/wallet";
// const bip39 = require("bip39");
import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { HDKey } from "micro-ed25519-hdkey";

export enum CONNECT_DEVICE {
  USB,
  LOCAL,
}

export class EncodedWallet {
  private wallet: EncodedWalletType;
  private password: string;
  private chain: CHAIN_TYPE;
  private connectedTo: CONNECT_DEVICE;
  private dpath: string = ".config/lrsc";
  private localKeyPairFolderPath = path.resolve(
    process.env.HOME || "~",
    this.dpath
  );
  private keyPairFolderPath = path.resolve(process.env.HOME || "~", this.dpath);

  private localKeyPairPath = `${this.localKeyPairFolderPath}/lrsc_wallet.json`;
  private localLedgerPath = `${this.localKeyPairFolderPath}/ledger.json`;

  private keyPairPath = `${this.keyPairFolderPath}/lrsc_wallet.json`;
  private ledgerPath = `${this.keyPairFolderPath}/ledger.json`;

  defaultData = {
    data: {},
    lastLogin: Date.now(),
  };
  defaultLedgerData = {
    trustedStick: {},
  };
  keypairExist: boolean = false;
  selectedPrivateKey: string;
  signer: any;
  address: string;

  constructor(chain: CHAIN_TYPE = CHAIN_TYPE.NONE) {
    this.chain = chain;
  }

  updateDirPath(directory: string) {
    this.keyPairFolderPath = path.resolve(directory, this.dpath);
    this.keyPairPath = `${this.keyPairFolderPath}/rsc_wallet.json`;
    this.ledgerPath = `${this.keyPairFolderPath}/ledger.json`;
  }

  async connect(chain: CHAIN_TYPE = this.chain): Promise<void> {
    this.chain = chain;
    const selectedUsbPath = await askToSelectMountedUsb(this);
    if (selectedUsbPath) {
      this.updateDirPath(selectedUsbPath);
      this.connectedTo = CONNECT_DEVICE.USB;
    } else this.connectedTo = CONNECT_DEVICE.LOCAL;
    this.loadLedgerInfo();
    const loadedData = this.loadKeyPair();
    if (
      typeof loadedData.data == "object" &&
      !Object.keys(loadedData.data).length
    ) {
      this.wallet = loadedData;
      console.log(chalk.redBright("Pls note no keypair found!"));
    } else {
      let decryptedWalletData = loadedData.data;
      if (typeof loadedData.data == "string") {
        const { password, decryptedData } = await askPasswordToDecryptData(
          loadedData.data
        );
        decryptedWalletData = decryptedData;
        this.password = password;
      }
      this.keypairExist = true;
      this.wallet = {
        ...loadedData,
        data:
          typeof decryptedWalletData == "object"
            ? decryptedWalletData
            : JSON.parse(decryptedWalletData),
      };
    }
  }

  getChainWallet(): any {
    switch (this.chain) {
      case CHAIN_TYPE.TRON:
      case CHAIN_TYPE.EVM:
        return new ethers.Wallet(this.selectedPrivateKey);
      case CHAIN_TYPE.SOLANA:
        return Keypair.fromSecretKey(ethers.getBytes(this.selectedPrivateKey));
    }
  }

  getChainPathAddress(): any {
    switch (this.chain) {
      case CHAIN_TYPE.EVM:
        return new ethers.Wallet(this.selectedPrivateKey);
    }
  }

  getAddress(): any {
    switch (this.chain) {
      case CHAIN_TYPE.TRON:
      case CHAIN_TYPE.EVM:
        return this.getChainWallet().address;
      case CHAIN_TYPE.SOLANA:
        return this.getChainWallet().publicKey;
    }
  }

  PATHS_PER_PAGE = 5; // Number of derivation paths to show per page
  async selectWallet(displayPrivateAccounts: boolean = true): Promise<void> {
    const { privateKey } = await inquirer.prompt([
      {
        type: "list",
        name: "privateKey",
        message: "Select account from wallet to proceed with: ",
        loop: false,
        choices: async (answers) => {
          return await this.getPaginatedChoices(displayPrivateAccounts);
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
    this.selectedPrivateKey = privateKey;
    this.signer = this.getChainWallet();
    this.address = this.getAddress();
  }

  //TODO: opt later
  private async getPaginatedChoices(displayPrivateAccounts: boolean = true) {
    let seeds = this.wallet.data.common?.seeds;
    seeds = seeds ? seeds : [];

    let keys = this.wallet.data.common?.keys;
    keys = keys ? keys : [];

    const seedAccounts: any[] = [];
    switch (this.chain) {
      case CHAIN_TYPE.NONE:
      case CHAIN_TYPE.EVM: {
        // for evm
        seeds = [
          ...seeds,
          ...(this.wallet.data.evm?.seeds ? this.wallet.data.evm?.seeds : []),
        ];
        keys = [
          ...keys,
          ...(this.wallet.data.evm?.keys ? this.wallet.data.evm?.keys : []),
        ];
        seeds = seeds.filter((seed) => displayPrivateAccounts || !seed.private);
        keys = keys.filter((key) => displayPrivateAccounts || !key.private);

        for (let idx = 0; idx < seeds?.length!; idx++) {
          const { seed, name } = seeds![idx];
          seedAccounts.push({
            name: chalk.redBright(
              `-------------------- [EVM Seed]: ${name} --------------------`
            ),
            // value: "[seed]_",
            value: "",
          });
          Array.from({ length: this.PATHS_PER_PAGE }, (_, i) => {
            const path = `m/44'/60'/0'/0/${i}`;
            const wallet = ethers.HDNodeWallet.fromPhrase(seed, "", path);
            seedAccounts.push({
              name: ` > ${path ? path + ":" : ""} ${chalk.green(
                wallet.address
              )}`,
              value: wallet.signingKey.privateKey,
            });
          });
        }

        if (keys.length) {
          seedAccounts.push({
            name: chalk.redBright(
              `-------------------- Private Keys --------------------`
            ),
            value: "",
          });
          keys.map(({ key, name }) => {
            const wallet = new ethers.Wallet(
              key.startsWith("0x") ? key : "0x" + key
            );
            seedAccounts.push({
              name: ` > ${name ? name + ":" : ""} ${chalk.green(
                wallet.address
              )}`,
              value: wallet.signingKey.privateKey,
            });
          }) ?? [];
        }
        break;
      }
      case CHAIN_TYPE.TRON: {
        // for tron
        seeds = [
          ...seeds,
          ...(this.wallet.data.tron?.seeds ? this.wallet.data.tron?.seeds : []),
        ];
        keys = [
          ...keys,
          ...(this.wallet.data.tron?.keys ? this.wallet.data.tron?.keys : []),
        ];
        seeds = seeds.filter((seed) => displayPrivateAccounts || !seed.private);
        keys = keys.filter((key) => displayPrivateAccounts || !key.private);

        for (let idx = 0; idx < seeds?.length!; idx++) {
          const { seed, name } = seeds![idx];
          seedAccounts.push({
            name: chalk.redBright(
              `-------------------- [Tron Seed]: ${name} --------------------`
            ),
            // value: "[seed]_",
            value: "",
          });
          Array.from({ length: this.PATHS_PER_PAGE }, (_, i) => {
            const path = `m/44'/60'/0'/0/${i}`;
            const wallet = ethers.HDNodeWallet.fromPhrase(seed, "", path);
            seedAccounts.push({
              name: ` > ${path ? path + ":" : ""} ${chalk.green(
                wallet.address
              )}`,
              value: wallet.signingKey.privateKey,
            });
          });
        }

        if (keys.length) {
          seedAccounts.push({
            name: chalk.redBright(
              `-------------------- Private Keys --------------------`
            ),
            value: "",
          });
          keys.map(({ key, name }) => {
            const wallet = new ethers.Wallet(key);
            seedAccounts.push({
              name: ` > ${name ? name + ":" : ""} ${chalk.green(
                wallet.address
              )}`,
              value: wallet.signingKey.privateKey,
            });
          }) ?? [];
        }
        break;
      }
      case CHAIN_TYPE.SOLANA: {
        seeds = [
          ...seeds,
          ...(this.wallet.data.solana?.seeds
            ? this.wallet.data.solana?.seeds
            : []),
        ];
        keys = [
          ...keys,
          ...(this.wallet.data.solana?.keys
            ? this.wallet.data.solana?.keys
            : []),
        ];
        seeds = seeds.filter((seed) => displayPrivateAccounts || !seed.private);
        keys = keys.filter((key) => displayPrivateAccounts || !key.private);

        for (let idx = 0; idx < seeds?.length!; idx++) {
          const { seed, name } = seeds![idx];
          seedAccounts.push({
            name: chalk.redBright(
              `-------------------- [Solana Seed]: ${name} --------------------`
            ),
            // value: "[seed]_",
            value: "",
          });
          try {
            const accountsWithBalance = await getAccountsWithBalance(seed);
            accountsWithBalance.forEach(({ keypair, path }) => {
              seedAccounts.push({
                name: ` > ${path ? path + ":" : ""} ${chalk.green(
                  keypair.publicKey
                )}`,
                value: ethers.hexlify(keypair.secretKey),
              });
            });
            // Array.from({ length: this.PATHS_PER_PAGE }, (_, i) => {
            //   const wallet = ethers.HDNodeWallet.fromPhrase(
            //     seed,
            //     "",
            //     `m/44'/60'/0'/0/${i}`
            //   );
            //   seedAccounts.push({
            //     name: ` > ${chalk.green(wallet.address)}`,
            //     value: wallet.signingKey.privateKey,
            //   });
            // });

            // Fd77VyBgq1hXc92F9CCUjU7ffBvt65WyTGTnPDiq7xJY
            // const keyPair = Keypair.fromSeed(
            //   bip39.mnemonicToSeedSync(seed, "").slice(0, 32)
            // );
            // seedAccounts.push({
            //   name: ` > ${chalk.green(keyPair.publicKey)}`,
            //   value: ethers.hexlify(keyPair.secretKey),
            // });
          } catch (error) {}
        }

        if (keys.length) {
          seedAccounts.push({
            name: chalk.redBright(
              `-------------------- Private Keys --------------------`
            ),
            value: "",
          });
          keys.map(({ key, name }) => {
            try {
              const keyPair = Keypair.fromSecretKey(
                ethers.getBytes(key.startsWith("0x") ? key : `0x${key}`)
              );
              seedAccounts.push({
                name: ` > ${name ? name + ":" : ""} ${chalk.green(
                  keyPair.publicKey
                )}`,
                value: key.startsWith("0x") ? key : `0x${key}`,
              });
            } catch (error) {}
          }) ?? [];
        }
        break;
      }
    }
    return seedAccounts;
  }

  private loadKeyPair(): any {
    if (!fs.pathExistsSync(this.keyPairFolderPath))
      fs.ensureDirSync(this.keyPairFolderPath);
    if (fs.existsSync(this.keyPairPath)) {
      const fileData = fs.readFileSync(this.keyPairPath, "utf8");
      return JSON.parse(fileData);
    } else {
      fs.writeJSONSync(this.keyPairPath, this.defaultData);
      return this.defaultData;
    }
  }

  private loadLedgerInfo(): any {
    if (!fs.pathExistsSync(this.keyPairFolderPath))
      fs.ensureDirSync(this.keyPairFolderPath);
    if (fs.existsSync(this.ledgerPath)) {
      return JSON.parse(fs.readFileSync(this.ledgerPath, "utf8"));
    } else {
      fs.writeJSONSync(this.ledgerPath, this.defaultLedgerData);
      return this.defaultLedgerData;
    }
  }

  async storeKeyPair(
    seedOrPk: string,
    keepPrivate: boolean,
    name: string,
    isSeed: boolean = true,
    chainType: CHAIN_TYPE = this.chain
  ): Promise<void> {
    //TODO: handle pk for different chains if necessary
    this.fillDefault();
    const chainKey = {
      [CHAIN_TYPE.EVM]: "evm",
      [CHAIN_TYPE.SOLANA]: "solana",
      [CHAIN_TYPE.SUI]: "sui",
      [CHAIN_TYPE.ROUTER]: "router",
      [CHAIN_TYPE.NONE]: "common",
    }[chainType];
    this.wallet.data[chainKey] ||= { seeds: [], keys: [] };
    const chainData = this.wallet.data[chainKey];
    const targetArray = isSeed ? chainData.seeds : chainData.keys;
    targetArray.push(
      isSeed
        ? { seed: seedOrPk, private: keepPrivate, name }
        : { key: seedOrPk, private: keepPrivate, name }
    );

    let password: string = "";
    if (!this.keypairExist) {
      await inquirer.prompt([
        {
          type: "password",
          name: "password",
          message:
            "Enter password to encrypt the seed (leave empty to skip encryption): ",
          mask: "*",
          validate(value) {
            password = value;
            return true;
          },
        },
        {
          type: "password",
          name: "confirmPassword",
          message: "Confirm password: ",
          mask: "*",
          validate(value) {
            if (value !== password) {
              return chalk.red(
                "Passwords do not match. Please try again (leave empty to skip encryption): "
              );
            }
            return true;
          },
        },
      ]);
      this.password = password;
    }
    if (this.password)
      //@ts-ignore
      this.wallet.data = encrypt(
        JSON.stringify(this.wallet.data),
        this.password
      );
    await fs.writeJSON(this.keyPairPath, this.wallet);
  }

  public async export(): Promise<any> {
    if (this.connectedTo != CONNECT_DEVICE.USB)
      throw new Error("Not connected to usb!");

    let wallet = await fs.readJSON(this.localKeyPairPath);
    let backupPassword: string = this.password;
    if (typeof wallet.data == "object" && !Object.keys(wallet.data).length) {
      throw new Error(chalk.redBright("Pls note no keypair found!"));
    } else if (typeof wallet.data == "string") {
      const { password, decryptedData } = await askPasswordToDecryptData(
        wallet.data
      );
      if (!backupPassword) backupPassword = password;
      wallet = {
        ...wallet,
        data: decryptedData,
      };
    }
    const newDataToSave = this.wallet.data ? this.wallet.data : {};
    const keys = Object.keys(wallet.data);
    for (let idx = 0; idx < keys.length; idx++) {
      const { seeds: sseeds, keys: skeys } = wallet.data[keys[idx]];
      if (sseeds)
        for (const oseed of sseeds) {
          if (!newDataToSave[keys[idx]]) newDataToSave[keys[idx]] = {};
          if (!newDataToSave[keys[idx]].seeds)
            newDataToSave[keys[idx]].seeds = [];
          const index = newDataToSave[keys[idx]]?.seeds.findIndex(
            ({ seed }) => seed == oseed.seed
          );
          if (index == -1) newDataToSave[keys[idx]]?.seeds.push(oseed);
        }
      if (skeys)
        for (const okey of skeys) {
          if (!newDataToSave[keys[idx]]) newDataToSave[keys[idx]] = {};
          if (!newDataToSave[keys[idx]].keys)
            newDataToSave[keys[idx]].keys = [];
          const index = newDataToSave[keys[idx]]?.keys.findIndex(
            ({ key }) => key == okey.key
          );
          if (index == -1) newDataToSave[keys[idx]]?.keys.push(okey);
        }
    }
    await fs.writeJSON(this.keyPairPath, {
      ...wallet,
      data: backupPassword
        ? encrypt(JSON.stringify(newDataToSave), backupPassword)
        : newDataToSave,
    });
    console.log(chalk.green("File Exported SuccessFully!!"));
  }

  public async getKeyPair(
    wordLength: number = 24,
    keepPrivate: boolean,
    name: string
  ): Promise<void> {
    let seed: string;
    switch (this.chain) {
      case CHAIN_TYPE.SOLANA:
      case CHAIN_TYPE.TON:
      case CHAIN_TYPE.TRON:
      case CHAIN_TYPE.COSMOS:
      case CHAIN_TYPE.EVM:
      case CHAIN_TYPE.NONE:
        seed = bip39.generateMnemonic(wordLength == 12 ? 128 : 256);
        await this.storeKeyPair(seed, keepPrivate, name);
        //TODO: print all address for each chain and seed properly
        console.log(
          `Multi-Chain ${seed.split(" ").length} Length Words seed: `,
          seed
        );
        break;
      default:
        throw new Error(`Unsupported chain: ${this.chain}: Not Handled Yet`);
    }
  }

  async changePassword(): Promise<void> {
    this.fillDefault();
    let password: string = "";
    await inquirer.prompt([
      {
        type: "password",
        name: "password",
        message:
          "Enter new password to encrypt the seed (leave empty to skip encryption): ",
        mask: "*",
        validate(value) {
          password = value;
          return true;
        },
      },
      {
        type: "password",
        name: "confirmPassword",
        message: "Confirm new password: ",
        mask: "*",
        validate(value) {
          if (value !== password) {
            return chalk.red(
              "Passwords do not match. Please try again (leave empty to skip encryption): "
            );
          }
          return true;
        },
      },
    ]);
    this.password = password;
    if (this.password)
      //@ts-ignore
      this.wallet.data = encrypt(
        JSON.stringify(this.wallet.data),
        this.password
      );
    await fs.writeJSON(this.keyPairPath, this.wallet);
  }

  public async reset(): Promise<void> {
    await fs.writeJSON(this.keyPairPath, this.defaultData);
  }

  //////////////////////////////////////////////////////////////////////////////////////////
  /// USB
  //////////////////////////////////////////////////////////////////////////////////////////

  async getAllMountedUSB(): Promise<string[]> {
    try {
      const volumesPath = "/Volumes";
      const volumes = fs.readdirSync(volumesPath);

      const usbDrives = volumes.filter((volume) => {
        const volumePath = path.join(volumesPath, volume);

        // Ensure it's a directory and filter out system-specific volumes
        return (
          fs.lstatSync(volumePath).isDirectory() &&
          !["Macintosh HD", "Recovery", "Preboot", "VM"].includes(volume)
        );
      });
      if (usbDrives.length === 0)
        // console.log("No USB drives connected.");
        return [];
      // console.log("Connected USB drives:");
      return usbDrives.map((drive) => path.join(volumesPath, drive));
    } catch (err) {
      return [];
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////
  /// USB
  //////////////////////////////////////////////////////////////////////////////////////////

  private fillDefault() {
    if (!this.wallet.data) this.wallet.data = {};
    //@ts-ignore
    if (!this.wallet.data.common) this.wallet.data.common = {};
    // @ts-ignore
    if (!this.wallet.data.common.seeds) this.wallet.data.common.seeds = [];
    //@ts-ignore
    if (!this.wallet.data.common.seeds) this.wallet.data.common.seeds = [];
    //@ts-ignore
    if (!this.wallet.data.common.keys) this.wallet.data.common.keys = [];
  }

  isAlreadyExist(seedOrPk: string, isSeed: boolean = true): boolean {
    this.fillDefault();
    if (isSeed)
      return (
        this.wallet.data.common?.seeds.findIndex(
          (v) => v.seed.toLowerCase() == seedOrPk.toLowerCase()
        ) != -1
      );
    return (
      this.wallet.data.common?.keys.findIndex(
        (v) => v.key.toLowerCase() == seedOrPk.toLowerCase()
      ) != -1
    );
  }
}

// 0xfEC7CA6D0e6c5eD86cA7DDFe76234FB309B83574

async function getAccountsWithBalance(mnemonic: string) {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const hd = HDKey.fromMasterSeed(seed.toString("hex"));

  const keyPairs: ({
    keypair: Keypair;
    path: string;
  } | null)[] = [];
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  // basic
  // basic
  //Filter WIth Balance: keyPairs.push(await filterWithBalance(Keypair.fromSeed(seed.slice(0, 32))));
  keyPairs.push({
    keypair: Keypair.fromSeed(seed.slice(0, 32)),
    path: "",
  });
  const paths = [
    "m/44'/501'/0'", // for trust
  ];
  await Promise.all(
    paths.map(async (path) => {
      const keypair = Keypair.fromSeed(hd.derive(path).privateKey);
      keyPairs.push(await filterWithBalance(keypair, path));
    })
  );
  await findFundedAccounts();

  function deriveKeypair(seed, path: string) {
    const derivedSeed = derivePath(path, seed.toString("hex")).key;
    return Keypair.fromSeed(derivedSeed);
  }

  async function findFundedAccounts(maxEmptyAccounts: number = 5) {
    const fundedAccounts = [];
    let consecutiveEmpty = 0;
    let index = 0;
    while (consecutiveEmpty < maxEmptyAccounts) {
      const path = `m/44'/501'/${index}'/0'`;
      const keypair = deriveKeypair(seed, path);
      const withBalance = await filterWithBalance(keypair, path);
      if (withBalance) {
        keyPairs.push(withBalance);
        consecutiveEmpty = 0;
      } else consecutiveEmpty += 1;
      index += 1;
    }
    return fundedAccounts;
  }

  // Function to check if an account is funded
  async function accountBalance(publicKey) {
    try {
      const balance = await connection.getBalance(new PublicKey(publicKey));
      return balance;
    } catch (error) {
      console.error("Error checking account balance:", error);
      return 0;
    }
  }

  async function filterWithBalance(keypair: Keypair, path: string = "") {
    const balance = await accountBalance(keypair.publicKey.toBase58());
    if (balance)
      return {
        keypair,
        path,
      };
    return null;
  }

  // keyPairs
  //   .filter((v) => v != null)
  //   .map(({ keypair, path }) => {
  //     console.log(`${path}: ${keypair.publicKey.toBase58()}`);
  //   });
  return keyPairs.filter((v) => v != null);
}

async function getTokenHoldings(connection: Connection, account: PublicKey) {
  // Fetch all token accounts owned by the provided address
  const tokenAccounts = await connection.getTokenAccountsByOwner(account, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // SPL Token Program ID
  });
  console.log(
    `Native Sol: ${new PublicKey(
      0
    ).toBase58()}, Amount: ${await connection.getBalance(account)}`
  );
  // Iterate through token accounts to find token balances
  for (const { pubkey, account } of tokenAccounts.value) {
    const tokenAccountInfo = account.data;
    const parsedData = Buffer.from(tokenAccountInfo).toJSON().data;
    // Token amount is stored as an unsigned integer in the first 8 bytes (BigInt)
    const amount = Buffer.from(parsedData.slice(64, 72)).readBigUInt64LE();
    // Get mint address to identify the token
    const mint = new PublicKey(parsedData.slice(0, 32)).toBase58();
    console.log(`Token Mint: ${mint}, Amount: ${amount}`);
  }
}
