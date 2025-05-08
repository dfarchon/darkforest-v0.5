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


// Load game configuration from JSON file
const loadGameConfig = (configPath: string = './config/gameConfig.json'): any => {
    const resolvedPath = path.resolve(process.cwd(), configPath);
    try {
        const configData = fs.readFileSync(resolvedPath, 'utf8');
        const config = JSON.parse(configData);
        console.log(`Game configuration loaded successfully from ${resolvedPath}`);
        return config;
    } catch (error) {
        console.error(`Failed to load game configuration from ${resolvedPath}: ${error}`);
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
    .addOptionalParam("gameconfig", "path to game config file", "./config/gameConfig.json", types.string)
    .setAction(deploy);

async function deploy(
    args: { gameconfig?: string },
    hre: HardhatRuntimeEnvironment,
) {
    const isDev =
        hre.network.name === "hardhat" || hre.network.name === "localhost";
    console.log(`Environment: ${isDev ? "Development" : "Production"}`);

    // Load game configuration from specified path or default
    const configPath = args.gameconfig || "./config/gameConfig.json";
    console.log(`Loading game configuration from: ${configPath}`);
    const gameConfig = loadGameConfig(configPath);

    const NETWORK: Network = process.env.network as Network;
    const PROJECT_ID = process.env.project_id;
    const DEPLOYER_MNEMONIC = process.env.deployer_mnemonic;
    const CORE_CONTROLLER_MNEMONIC = process.env.core_controller_mnemonic;
    const OZ_ADMIN_MNEMONIC = process.env.oz_admin_mnemonic;
    const DISABLE_ZK_CHECKS = gameConfig.DISABLE_ZK_CHECK;

    if (
        !NETWORK ||
        !PROJECT_ID ||
        !DEPLOYER_MNEMONIC ||
        !CORE_CONTROLLER_MNEMONIC ||
        !OZ_ADMIN_MNEMONIC ||
        DISABLE_ZK_CHECKS === undefined
    ) {
        console.error("environment variables not found!");
        console.log(NETWORK);
        console.log(PROJECT_ID);
        console.log(DEPLOYER_MNEMONIC);
        console.log(CORE_CONTROLLER_MNEMONIC);
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

    if (DISABLE_ZK_CHECKS) {
        console.log("WARNING: ZK checks disabled.");
    }

    // need to force a compile for tasks
    await hre.run("compile");

    // Were only using one account, getSigners()[0], the deployer. Becomes the ProxyAdmin
    const [deployer] = await hre.ethers.getSigners();
    // give contract administration over to an admin adress if was provided, or use deployer
    const controllerWalletAddress = deployer.address;
    gameConfig.adminAddress = controllerWalletAddress;

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

    // Deploy Tokens contract
    console.log("\n📄 Deploying DarkForestTokens contract...");
    const tokensFactory = await hre.ethers.getContractFactory("DarkForestTokens");
    const tokensContract = await tokensFactory.deploy();
    console.log("⏳ Waiting for tokens deployment...");
    await tokensContract.waitForDeployment();
    const tokensAddress = await tokensContract.getAddress();
    console.log("✅ DarkForestTokens deployed to:", tokensAddress);

    // Add tokensAddress to gameConfig
    gameConfig.tokensAddress = tokensAddress;

    // Deploy core contracts with game configuration
    const { coreAddress, libraries } = await deployCoreWithConfig(
        gameConfig,
        hre,
    );

    fs.writeFileSync(
        isDev === false
            ? "../client/src/utils/prod_contract_addr.ts"
            : "../client/src/utils/local_contract_addr.ts",
        `export const contractAddress = '${coreAddress}';\nexport const tokensAddress = '${tokensAddress}';`,
    );

    // Save library addresses to file
    fs.writeFileSync(
        isDev === false
            ? "../client/src/utils/prod_library_addrs.ts"
            : "../client/src/utils/local_library_addrs.ts",
        `export const libraryAddresses = ${JSON.stringify(libraries, null, 2)};`
    );

    // Initialize the tokens contract with the core contract address
    console.log("\n🔄 Initializing DarkForestTokens contract...");
    await tokensContract.initialize(coreAddress, gameConfig.adminAddress);
    console.log("✅ DarkForestTokens initialized with:");
    console.log("→ Core address:", coreAddress);
    console.log("→ Admin address:", gameConfig.adminAddress);

    console.log("Deploy over. You can quit this process.");

    return;
}

task("client:config", "client config").setAction(clientConfig);

async function clientConfig() {
    // Check if directory exists before creating it
    try {
        if (!fs.existsSync('../client/public/contracts')) {
            await exec("mkdir -p ../client/public/contracts");
        }

        // Copy the main DarkForestCore contract JSON
        await exec(
            "cp ./artifacts/contracts/DarkForestCore.sol/DarkForestCore.json ../client/public/contracts/DarkForestCore.json",
        );

        // Copy all library contract JSONs
        const libraryContracts = [
            "DarkForestInitialize",
            "DarkForestLazyUpdate",
            "DarkForestPlanet",
            "DarkForestUtils",
            "Verifier"
        ];

        for (const library of libraryContracts) {
            console.log(`Copying ${library} contract JSON...`);
            await exec(
                `cp ./artifacts/contracts/${library}.sol/${library}.json ../client/public/contracts/${library}.json`,
            );
        }

        // Copy DarkForestTokens contract JSON
        console.log("Copying DarkForestTokens contract JSON...");
        await exec(
            "cp ./artifacts/contracts/DarkForestTokens.sol/DarkForestTokens.json ../client/public/contracts/DarkForestTokens.json"
        );

        console.log("All contract JSONs copied to client/public/contracts/");


    } catch (error) {
        console.error("Error in clientConfig:", error);
    }
}

export async function deployCoreWithConfig(
    gameConfig: any,
    hre: HardhatRuntimeEnvironment,
): Promise<{ coreAddress: string, libraries: Record<string, string> }> {
    console.log("\n📦 Deploying library contracts...");

    const libraries: Record<string, string> = {};

    console.log("\n1️⃣ Deploying DarkForestUtils...");
    const factory1 = await hre.ethers.getContractFactory("DarkForestUtils");
    const contract1 = await factory1.deploy();
    await contract1.waitForDeployment();
    console.log("✅ DarkForestUtils deployed to:", contract1.target);
    libraries["DarkForestUtils"] = contract1.target.toString();

    console.log("\n2️⃣ Deploying DarkForestLazyUpdate...");
    const factory2 = await hre.ethers.getContractFactory("DarkForestLazyUpdate");
    const contract2 = await factory2.deploy();
    await contract2.waitForDeployment();
    console.log("✅ DarkForestLazyUpdate deployed to:", contract2.target);
    libraries["DarkForestLazyUpdate"] = contract2.target.toString();

    console.log("\n3️⃣ Deploying DarkForestPlanet...");
    const factory3 = await hre.ethers.getContractFactory("DarkForestPlanet", {
        libraries: {
            DarkForestLazyUpdate: contract2.target,
            DarkForestUtils: contract1.target
        }
    });
    const contract3 = await factory3.deploy();
    await contract3.waitForDeployment();
    console.log("✅ DarkForestPlanet deployed to:", contract3.target);
    libraries["DarkForestPlanet"] = contract3.target.toString();

    console.log("\n4️⃣ Deploying DarkForestInitialize...");
    const factory4 = await hre.ethers.getContractFactory("DarkForestInitialize");
    const contract4 = await factory4.deploy();
    await contract4.waitForDeployment();
    console.log("✅ DarkForestInitialize deployed to:", contract4.target);
    libraries["DarkForestInitialize"] = contract4.target.toString();

    console.log("\n5️⃣ Deploying Verifier...");
    const factory5 = await hre.ethers.getContractFactory("Verifier");
    const contract5 = await factory5.deploy();
    await contract5.waitForDeployment();
    console.log("✅ Verifier deployed to:", contract5.target);
    libraries["Verifier"] = contract5.target.toString();

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

    console.log("\n🔧 Initializing DarkForestCore with config...");
    console.log("→ Admin address:", gameConfig.adminAddress);
    console.log("→ Whitelist enabled:", gameConfig.whitelistEnabled);
    console.log("→ ZK checks disabled:", gameConfig.DISABLE_ZK_CHECK);

    console.log("gameConfig", gameConfig);


    const tx = await contract.init(gameConfig);

    console.log("⏳ Waiting for initialization...");
    await tx.wait();
    console.log("✅ Initialization complete");
    console.log("→ Transaction hash:", tx.hash);



    await clientConfig();

    console.log("✅ Client config complete");


    return {
        coreAddress: contract.target.toString(),
        libraries: libraries
    };

}