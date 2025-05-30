#!/bin/bash

# # https://docs.abs.xyz/build-on-abstract/smart-contracts/foundry
# curl -L https://raw.githubusercontent.com/matter-labs/foundry-zksync/main/install-foundry-zksync | bash

set -e
# echo "Fetching submodules"
# git submodule update --init --remote --recursive

# cd contracts/asset-forwarder-contracts/evm
# yarn install --ignore-optional
# forge compile

# cd ../..
# cd router-gateway-contracts/evm
# yarn install --ignore-optional
# forge compile 

# cd ../..
# cd asset-bridge-contracts/evm
# yarn install --ignore-optional
# forge compile 



# https://docs.abs.xyz/build-on-abstract/smart-contracts/foundry
# curl -L https://raw.githubusercontent.com/matter-labs/foundry-zksync/main/install-foundry-zksync | bash

# Parse arguments
IS_ZKSYNC=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --zksync) IS_ZKSYNC=true ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "Fetching submodules"
# git submodule update --init --remote --recursive

# Set output directory based on the compilation target
if [ "$IS_ZKSYNC" = true ]; then
    echo "Compiling for zkSync..."
else
    echo "Compiling for native EVM..."
fi

# Function to compile contracts
compile_contracts() {
    local CONTRACT_DIR=$1

    echo "Compiling contracts in $CONTRACT_DIR..."

    cd "$CONTRACT_DIR"
    yarn install --ignore-optional

    # If zkSync compilation, move files to the desired OUT_DIR
    if [ "$IS_ZKSYNC" = true ]; then
        forge build --zksync
        forge compile --zksync
        echo "Moving zkSync artifacts to $OUT_DIR"
        rm -rf "artifacts/zk-foundry"
        mkdir -p "artifacts/zk-foundry"
        mv zkout/* "artifacts/zk-foundry/" || echo "No files to move."
        rmdir zkout || echo "zkout directory not found."
    else
        forge compile
    fi

    cd ../../..
}

# Compile each contract package
compile_contracts "router-contracts/router-gateway-contracts/evm"
compile_contracts "router-contracts/asset-bridge-contracts/evm"
