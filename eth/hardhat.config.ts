import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

import "./tasks/deploy";
import "./tasks/admin";
import "./tasks/analysis";

const PUBLIC_MNEMONIC =
  "change typical hire slam amateur loan grid fix drama electric seed label";

const MNEMONIC = process.env.deployer_mnemonic || PUBLIC_MNEMONIC;

const HOLESKY_RPC = process.env.HOLESKY_RPC;

const config: HardhatUserConfig = {
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545/",
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 31337,
    },
    // Used when you dont specify a network on command line, like in tests
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      blockGasLimit: 16777215,
      mining: {
        auto: false,
        interval: 1000,
      },
    },
    holesky: {
      url: HOLESKY_RPC,
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 17000,
      gasPrice: 3000000000, // 3 Gwei fixed gas price
      gasMultiplier: 1.5, // Increased to 1.5x
      timeout: 120000, // 2 minutes timeout
    },
    pyrope: {
      url: process.env.PYROPE_RPC,
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 695569,
    },
  },
  solidity: {
    version: "0.6.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10,
      },
    },
  },
};

export default config;