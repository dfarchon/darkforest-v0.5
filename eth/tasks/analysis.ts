import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const contractAddress = "0x6c452936A27F5Afc41bCC9Dd49a5bdedBdfA9b7A";

// Query all player addresses and their move counts
task("analysis", "Get all player addresses and their move counts")
    .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
        try {
            const contract = await hre.ethers.getContractAt(
                "DarkForestCore",
                contractAddress,
            );

            // Get total number of players
            const nPlayers = await contract.getNPlayers();
            console.log(`Total players: ${nPlayers.toString()}`);

            if (nPlayers === BigInt(0)) {
                console.log("No players currently");
                return;
            }

            // Batch get all player addresses
            const batchSize = 200; // Get 200 players at a time
            const allPlayers: string[] = [];

            for (let start = 0; start < nPlayers; start += batchSize) {
                const end = start + batchSize > nPlayers ? nPlayers : start + batchSize;
                const playerBatch = await contract.bulkGetPlayers(start, end);
                allPlayers.push(...playerBatch);
            }

            console.log(`\nCollecting move counts for all players...`);

            // Get move count for each player and store in array
            const playerMoves: Array<{ address: string, moves: bigint }> = [];
            for (const playerAddress of allPlayers) {
                try {
                    const moveCount = await contract.getMoveCnt(playerAddress);
                    playerMoves.push({
                        address: playerAddress,
                        moves: moveCount
                    });
                } catch (error) {
                    console.log(`Error getting move count for ${playerAddress}: ${error.message}`);
                }
            }

            // Sort players by move count (highest to lowest)
            playerMoves.sort((a, b) => Number(b.moves - a.moves));

            console.log(`\nPlayer addresses and move counts (sorted by move count):`);
            console.log(`Address\t\t\t\t\t\tMove Count`);

            // Display sorted results
            for (const player of playerMoves) {
                console.log(`${player.address}\t${player.moves.toString()}`);
            }

        } catch (error) {
            console.error("Error:", error);
        }
    }); 