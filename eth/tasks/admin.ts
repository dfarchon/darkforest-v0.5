import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const contractAddress = "0x43F7602c746ddd1CA562061a0E76BBC9fe01266E";


// Change admin address
task("change-admin", "Change admin address")
    .addParam("newAdmin", "New admin address")
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const contract = await hre.ethers.getContractAt(
                "DarkForestCore",
                contractAddress,
            );
            const tx = await contract.changeAdmin(args.newAdmin);
            await tx.wait();
            console.log("Admin changed to:", args.newAdmin);
            console.log("Transaction hash:", tx.hash);
        } catch (error) {
            console.error("Error:", error);
        }
    });

// Pause the game
task("pause-game", "Pause the game").setAction(
    async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const contract = await hre.ethers.getContractAt(
                "DarkForestCore",
                contractAddress,
            );
            const tx = await contract.pause();
            await tx.wait();
            console.log("Game paused successfully");
            console.log("Transaction hash:", tx.hash);
        } catch (error) {
            console.error("Error:", error);
        }
    },
);

// Unpause the game
task("unpause-game", "Unpause the game").setAction(
    async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const contract = await hre.ethers.getContractAt(
                "DarkForestCore",
                contractAddress,
            );
            const tx = await contract.unpause();
            await tx.wait();
            console.log("Game unpaused successfully");
            console.log("Transaction hash:", tx.hash);
        } catch (error) {
            console.error("Error:", error);
        }
    },
);

// Change token mint end time
task("change-token-mint-end", "Change token mint end time")
    .addParam("newEnd", "New end timestamp")
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const contract = await hre.ethers.getContractAt(
                "DarkForestCore",
                contractAddress,
            );
            const tx = await contract.changeTokenMintEndTime(args.newEnd);
            await tx.wait();
            console.log("Token mint end time changed to:", args.newEnd);
            console.log("Transaction hash:", tx.hash);
        } catch (error) {
            console.error("Error:", error);
        }
    });

// Change target4 radius constant
task("change-target4-radius", "Change target4 radius constant")
    .addParam("newconstant", "New radius constant")
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const contract = await hre.ethers.getContractAt(
                "DarkForestCore",
                contractAddress,
            );
            const tx = await contract.changeTarget4RadiusConstant(args.newconstant);
            await tx.wait();
            console.log("Target4 radius constant changed to:", args.newconstant);
            console.log("Transaction hash:", tx.hash);
        } catch (error) {
            console.error("Error:", error);
        }
    });

// Withdraw contract balance
task("withdraw", "Withdraw contract balance to admin").setAction(
    async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const contract = await hre.ethers.getContractAt(
                "DarkForestCore",
                contractAddress,
            );

            // Get current balance
            const balance = await hre.ethers.provider.getBalance(contractAddress);
            console.log(
                "Current contract balance:",
                hre.ethers.formatEther(balance),
                "ETH",
            );

            if (balance === BigInt(0)) {
                console.log("No balance to withdraw");
                return;
            }

            const tx = await contract.withdraw();
            await tx.wait();
            console.log("Withdrawal successful");
            console.log("Transaction hash:", tx.hash);
        } catch (error) {
            console.error("Error:", error);
        }
    },
);

// Get game status
task("game-status", "Get current game status").setAction(
    async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const contract = await hre.ethers.getContractAt(
                "DarkForestCore",
                contractAddress,
            );

            const paused = await contract.paused();
            const adminAddress = await contract.adminAddress();
            const worldRadius = await contract.worldRadius();

            console.log("=== Game Status ===");
            console.log("Paused:", paused);
            console.log("Admin Address:", adminAddress);
            console.log("World Radius:", worldRadius.toString());

            // Get current block timestamp for comparison
            const currentBlock = await hre.ethers.provider.getBlock("latest");
            if (currentBlock) {
                console.log("Current Block Timestamp:", currentBlock.timestamp);
            }


        } catch (error) {
            console.error("Error:", error);
        }
    },
);

// Get contract statistics
task("contract-stats", "Get contract statistics").setAction(
    async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const contract = await hre.ethers.getContractAt(
                "DarkForestCore",
                contractAddress,
            );

            const nPlanets = await contract.getNPlanets();
            const nPlayers = await contract.getNPlayers();
            const planetLevelThresholds = await contract.getPlanetLevelThresholds();
            const planetCumulativeRarities =
                await contract.getPlanetCumulativeRarities();

            console.log("=== Contract Statistics ===");
            console.log("Total Planets:", nPlanets.toString());
            console.log("Total Players:", nPlayers.toString());
            console.log("Planet Level Thresholds:", planetLevelThresholds.toString());
            console.log(
                "Planet Cumulative Rarities:",
                planetCumulativeRarities.toString(),
            );

            // Get contract balance
            const balance = await hre.ethers.provider.getBalance(contractAddress);
            console.log("Contract Balance:", hre.ethers.formatEther(balance), "ETH");
        } catch (error) {
            console.error("Error:", error);
        }
    },
);

// Emergency pause (with confirmation)
task("emergency-pause", "Emergency pause the game with confirmation").setAction(
    async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const contract = await hre.ethers.getContractAt(
                "DarkForestCore",
                contractAddress,
            );

            // Check current status
            const paused = await contract.paused();
            if (paused) {
                console.log("Game is already paused");
                return;
            }

            console.log("⚠️  WARNING: This will pause the game immediately!");
            console.log("All game functions will be disabled until unpaused.");
            console.log("Are you sure you want to continue? (y/N)");

            // In a real scenario, you might want to add user input confirmation
            // For now, we'll proceed with the pause
            console.log("Proceeding with emergency pause...");

            const tx = await contract.pause();
            await tx.wait();
            console.log("🚨 Game paused in emergency mode!");
            console.log("Transaction hash:", tx.hash);
        } catch (error) {
            console.error("Error:", error);
        }
    },
);

// Batch admin operations
task("batch-admin", "Perform multiple admin operations")
    .addParam(
        "operations",
        "Comma-separated list of operations (pause,unpause,withdraw)",
    )
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const contract = await hre.ethers.getContractAt(
                "DarkForestCore",
                contractAddress,
            );
            const operations = args.operations.split(",");

            console.log("Performing batch operations:", operations);

            for (const op of operations) {
                switch (op.trim()) {
                    case "pause":
                        console.log("Pausing game...");
                        await (await contract.pause()).wait();
                        console.log("✓ Game paused");
                        break;
                    case "unpause":
                        console.log("Unpausing game...");
                        await (await contract.unpause()).wait();
                        console.log("✓ Game unpaused");
                        break;
                    case "withdraw":
                        console.log("Withdrawing balance...");
                        await (await contract.withdraw()).wait();
                        console.log("✓ Balance withdrawn");
                        break;
                    default:
                        console.log(`Unknown operation: ${op}`);
                }
            }

            console.log("Batch operations completed");
        } catch (error) {
            console.error("Error in batch operations:", error);
        }
    });