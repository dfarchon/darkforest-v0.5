import * as fs from "fs";
import { subtask, task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment, Libraries } from "hardhat/types";
import * as path from "path";
import * as prettier from "prettier";
import { promisify } from "util";
import { exec as rawExec } from "child_process";
import dotenv from "dotenv";

dotenv.config();

// ============= Utility Functions =============

/**
 * Writes environment variables to a file
 * @param filename - The path to the file to write to
 * @param dict - Record of key-value pairs to write as environment variables
 */
const writeEnv = (filename: string, dict: Record<string, string>): void => {
    const str = Object.entries(dict)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n");
    fs.writeFileSync(filename, str);
};

/**
 * Executes a shell command and returns its output
 * @param command - The shell command to execute
 * @returns Promise resolving to the command's stdout output
 * @throws Will throw an error if the command fails
 */
const exec = async (command: string): Promise<string> => {
    try {
        // Use promisify to convert rawExec into a promise-based function
        const { stdout, stderr } = await promisify(rawExec)(command);
        console.log(">> ", command);

        // Log stderr if it exists, though the command may still succeed
        if (stderr) {
            console.error(`Command ${command} produced stderr: ${stderr}`);
        }

        // Return the trimmed stdout result
        return stdout.trim();
    } catch (error) {
        // Log the error and rethrow it to allow handling by the caller
        console.error(`Command ${command} failed with error ${error}`);
        throw error;
    }
};

// ============================================

const isProd = process.env.NODE_ENV === "production";

enum Network {
    xDAI = "xdai",
    Ropsten = "ropsten",
    Development = "development",
    PersonalGanache = "personalGanache",
    Holeksy = "holeksy",
}

task("deploy", "deploy all contracts")
    .addOptionalParam("whitelist", "override the whitelist", true, types.boolean)
    .setAction(deploy);

async function deploy(
    args: { whitelist: boolean; fund: number },
    hre: HardhatRuntimeEnvironment,
) {
    const isDev =
        hre.network.name === "hardhat" || hre.network.name === "localhost";

    const NETWORK: Network = process.env.network as Network;
    const PROJECT_ID = process.env.project_id;
    const DEPLOYER_MNEMONIC = process.env.deployer_mnemonic;
    const CORE_CONTROLLER_MNEMONIC = process.env.core_controller_mnemonic;
    const WHITELIST_CONTROLLER_MNEMONIC =
        process.env.whitelist_controller_mnemonic;
    const OZ_ADMIN_MNEMONIC = process.env.oz_admin_mnemonic;
    const DISABLE_ZK_CHECKS =
        process.env.DISABLE_ZK_CHECKS === undefined
            ? undefined
            : process.env.DISABLE_ZK_CHECKS === "true";

    if (
        !NETWORK ||
        !PROJECT_ID ||
        !DEPLOYER_MNEMONIC ||
        !CORE_CONTROLLER_MNEMONIC ||
        !WHITELIST_CONTROLLER_MNEMONIC ||
        !OZ_ADMIN_MNEMONIC ||
        DISABLE_ZK_CHECKS === undefined
    ) {
        console.error("environment variables not found!");
        console.log(NETWORK);
        console.log(PROJECT_ID);
        console.log(DEPLOYER_MNEMONIC);
        console.log(CORE_CONTROLLER_MNEMONIC);
        console.log(WHITELIST_CONTROLLER_MNEMONIC);
        console.log(OZ_ADMIN_MNEMONIC);
        console.log(DISABLE_ZK_CHECKS);
        throw "";
    }

    let network_url = "http://localhost:8545";

    if (NETWORK === Network.Ropsten) {
        network_url = `https://ropsten.infura.io/v3/${PROJECT_ID}`;
    } else if (NETWORK === Network.xDAI) {
        network_url = "https://dai.poa.network/";
    } else if (NETWORK === Network.PersonalGanache) {
        network_url = "https://dark-forest.online:8545";
    } else if (NETWORK === Network.Holeksy) {
        const HOLESKY_RPC = process.env.HOLESKY_RPC;
        if (HOLESKY_RPC) {
            network_url = HOLESKY_RPC;
        } else {
            throw "HOLESKY_RPC is not set";
        }
    }

    let whitelistEnabled: boolean;
    if (typeof args.whitelist === "undefined") {
        // `whitelistEnabled` defaults to `false` in dev but `true` in prod
        whitelistEnabled = isDev ? false : true;
    } else {
        whitelistEnabled = args.whitelist;
    }

    console.log("whitelistEnabled:", whitelistEnabled);

    if (DISABLE_ZK_CHECKS) {
        console.log("WARNING: ZK checks disabled.");
    }

    // need to force a compile for tasks
    await hre.run("compile");

    // Were only using one account, getSigners()[0], the deployer. Becomes the ProxyAdmin
    const [deployer] = await hre.ethers.getSigners();
    // give contract administration over to an admin adress if was provided, or use deployer
    const controllerWalletAddress = deployer.address;

    const requires = hre.ethers.parseEther("0.1");
    // Retrieve the balance of the deployer's address using the provider
    const balance = await deployer.provider.getBalance(deployer.address);

    // Only when deploying to production, give the deployer wallet money,
    // in order for it to be able to deploy the contracts
    if (balance < requires) {
        throw new Error(
            `${deployer.address} requires ~$${hre.ethers.formatEther(
                requires,
            )} but has ${hre.ethers.formatEther(balance)} top up and rerun`,
        );
    }

    // 1. Deploy Whitelist
    const whitelistContract = await deployWhitelist(
        controllerWalletAddress,
        whitelistEnabled,
        hre,
    );

    try {
        writeEnv(`../whitelist/${isDev ? "dev" : "prod"}.autogen.env`, {
            mnemonic: DEPLOYER_MNEMONIC,
            project_id: PROJECT_ID,
            contract_address: whitelistContract.target.toString(),
        });
    } catch { }

    // 2. Deploy Tokens (without initialization)
    const tokensContract = await deployTokens(hre);

    // 3. Deploy Core
    const coreContract = await deployCore(
        controllerWalletAddress,
        whitelistContract.target.toString(),
        tokensContract.target.toString(),
        DISABLE_ZK_CHECKS,
        hre,
    );

    // 4. Initialize Tokens with Core contract address
    console.log("\n🔧 Initializing Tokens contract...");
    const initTx = await tokensContract.initialize(
        coreContract.target.toString(), // Core contract address
        controllerWalletAddress, // Core controller address
    );
    await initTx.wait();
    console.log("✅ Tokens contract initialized");

    const addressPath = isDev
        ? "../client/src/utils/local_contract_addr.ts"
        : "../client/src/utils/prod_contract_addr.ts";

    fs.writeFileSync(
        addressPath,
        `export const contractAddress = '${coreContract.target.toString()}';\n` +
        `export const tokensContract = '${tokensContract.target.toString()}';\n` +
        `export const whitelistContract = '${whitelistContract.target.toString()}';\n`
    );

    console.log("Deploy over. You can quit this process.");

    return;
}

task("client:config", "client config").setAction(clientConfig);

async function clientConfig() {
    await exec("mkdir ../client/public/contracts");
    await exec(
        "cp ./artifacts/contracts/DarkForestCore.sol/DarkForestCore.json ../client/public/contracts/DarkForestCore.json",
    );
    await exec(
        "cp ./artifacts/contracts/DarkForestTokens.json ../client/public/contracts/"
    );
    await exec("cp ./artifacts/contracts/Whitelist.json ../client/public/contracts/");

}

export async function deployWhitelist(
    whitelistControllerAddress: string,
    whitelist: boolean,
    hre: HardhatRuntimeEnvironment,
) {
    console.log("\n📄 Deploying Whitelist contract...");
    console.log("→ Controller address:", whitelistControllerAddress);
    console.log("→ Whitelist enabled:", whitelist);

    const factory = await hre.ethers.getContractFactory("Whitelist");
    const contract = await factory.deploy();
    console.log("⏳ Waiting for deployment...");
    await contract.waitForDeployment();
    console.log("✅ Whitelist contract deployed to:", contract.target);

    console.log("\n🔧 Initializing Whitelist contract...");
    const tx = await contract.initialize(whitelistControllerAddress, whitelist);
    console.log("⏳ Waiting for initialization...");
    await tx.wait();
    console.log("✅ Initialization complete");
    console.log("→ Transaction hash:", tx.hash);

    return contract;
}

export async function deployTokens(hre: HardhatRuntimeEnvironment) {
    console.log("\n📄 Deploying DarkForestTokens contract...");

    // Get the contract factory
    const factory = await hre.ethers.getContractFactory("DarkForestTokens");

    // Deploy the contract
    const contract = await factory.deploy();
    console.log("⏳ Waiting for deployment...");
    await contract.waitForDeployment();
    const tokenAddress = await contract.getAddress();

    console.log("✅ DarkForestTokens deployed to:", tokenAddress);
    return contract;
}

export async function deployCore(
    coreControllerAddress: string,
    whitelistAddress: string,
    tokensAddress: string,
    DISABLE_ZK_CHECKS: boolean,
    hre: HardhatRuntimeEnvironment,
) {
    console.log("\n📦 Deploying library contracts...");

    console.log("\n1️⃣ Deploying DarkForestUtils...");
    const factory1 = await hre.ethers.getContractFactory("DarkForestUtils");
    const contract1 = await factory1.deploy();
    await contract1.waitForDeployment();
    console.log("✅ DarkForestUtils deployed to:", contract1.target);

    console.log("\n2️⃣ Deploying DarkForestLazyUpdate...");
    const factory2 = await hre.ethers.getContractFactory("DarkForestLazyUpdate");
    const contract2 = await factory2.deploy();
    await contract2.waitForDeployment();
    console.log("✅ DarkForestLazyUpdate deployed to:", contract2.target);

    console.log("\n3️⃣ Deploying DarkForestPlanet...");
    const factory3 = await hre.ethers.getContractFactory("DarkForestPlanet", {
        libraries: {
            DarkForestLazyUpdate: contract2.target,
            DarkForestUtils: contract1.target,
        },
    });
    const contract3 = await factory3.deploy();
    await contract3.waitForDeployment();
    console.log("✅ DarkForestPlanet deployed to:", contract3.target);

    console.log("\n4️⃣ Deploying DarkForestInitialize...");
    const factory4 = await hre.ethers.getContractFactory("DarkForestInitialize");
    const contract4 = await factory4.deploy();
    await contract4.waitForDeployment();
    console.log("✅ DarkForestInitialize deployed to:", contract4.target);

    console.log("\n5️⃣ Deploying Verifier...");
    const factory5 = await hre.ethers.getContractFactory("Verifier");
    const contract5 = await factory5.deploy();
    await contract5.waitForDeployment();
    console.log("✅ Verifier deployed to:", contract5.target);

    console.log("\n🌟 Deploying main DarkForestCore contract...");
    const factory = await hre.ethers.getContractFactory("DarkForestCore", {
        libraries: {
            DarkForestInitialize: contract4.target,
            DarkForestPlanet: contract3.target,
            DarkForestUtils: contract1.target,
            Verifier: contract5.target,
        },
    });
    const contract = await factory.deploy();
    console.log("⏳ Waiting for deployment...");
    await contract.waitForDeployment();
    console.log("✅ DarkForestCore deployed to:", contract.target);

    console.log("\n🔧 Initializing DarkForestCore...");
    console.log("→ Controller address:", coreControllerAddress);
    console.log("→ Whitelist address:", whitelistAddress);
    console.log("→ Tokens address:", tokensAddress);
    console.log("→ ZK checks disabled:", DISABLE_ZK_CHECKS);

    const tx = await contract.initialize(
        coreControllerAddress,
        whitelistAddress,
        tokensAddress,
        DISABLE_ZK_CHECKS,
    );
    console.log("⏳ Waiting for initialization...");
    await tx.wait();
    console.log("✅ Initialization complete");
    console.log("→ Transaction hash:", tx.hash);

    return contract;
}