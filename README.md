# Router Protocol Contract Deployment Scripts

This repository contains scripts and tools for deploying Router Protocol smart contracts across different blockchain networks. It supports both EVM and zkSync deployments.

## Prerequisites

- Node.js (v16 or higher)
- Yarn package manager
- Git
- Foundry (for contract compilation)

## Project Structure

```
.
├── contracts/               # Smart contract submodules
├── src/                    # Source code for deployment scripts
├── build.sh               # Build script for contract compilation
└── package.json          # Project dependencies and scripts
```

## Setup

1. Clone the repository and initialize submodules:
```bash
git submodule update --remote --merge                                                                                              
```

2. Install dependencies:
```bash
yarn install
```

3. Set up your environment variables:
   - Copy `.env.example` to `.env`
   - Add your private keys and other configuration

## Usage

### Building Contracts

To build the contracts for native EVM:
```bash
yarn build
```

To build for zkSync:
```bash
yarn build --zksync
```

### Deploying Contracts

1. Start the deployment process:
```bash
yarn start
```

2. Follow the CLI prompts to:
   - Import your private key
   - Select the network
   - Deploy contracts

## Available Scripts

- `yarn start`: Start the deployment process
- `yarn build`: Build contracts for native EVM
- `yarn build --zksync`: Build contracts for zkSync

## Dependencies

The project uses several key dependencies:
- @coral-xyz/anchor
- @ethersproject/abi
- @openzeppelin/upgrades-core
- @solana/web3.js
- ethers
- and more (see package.json for complete list)

## Security

Private keys are stored in the `./config/lrsc` folder and are encrypted with a password. This provides an additional layer of security for your sensitive credentials.

## License

MIT License


