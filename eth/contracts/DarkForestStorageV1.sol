// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.9;

// Import base Initializable contract
import "./DarkForestTypes.sol";
import "./Whitelist.sol";
import "./DarkForestTokens.sol";

contract DarkForestStorageV1 {
    // Contract housekeeping
    address public adminAddress;
    DarkForestTokens tokens;
    bool public paused;

    // Game config
    bool public DISABLE_ZK_CHECK;
    uint256 public TIME_FACTOR_HUNDREDTHS = 100; // dev use only - speedup/slowdown game
    uint256 public PERLIN_THRESHOLD_1 = 14;
    uint256 public PERLIN_THRESHOLD_2 = 17;
    uint256 public BIOME_THRESHOLD_1 = 15;
    uint256 public BIOME_THRESHOLD_2 = 17;
    uint256 public PLANET_RARITY = 16384;
    uint256 public SILVER_RARITY_1 = 8;
    uint256 public SILVER_RARITY_2 = 8;
    uint256 public SILVER_RARITY_3 = 4;
    // maps from token id to the planet id on which this token exists
    uint256 public ARTIFACT_LOCKUP_DURATION_SECONDS = 12 * 60 * 60;

    // Default planet type stats
    uint256[] public planetLevelThresholds;
    uint256[] public cumulativeRarities;
    uint256[] public initializedPlanetCountByLevel;
    DarkForestTypes.PlanetDefaultStats[] public planetDefaultStats;
    DarkForestTypes.Upgrade[4][3] public upgrades;

    // Game world state
    uint256 tokenMintEndTimestamp;
    uint256 gameEndTimestamp;
    uint256 target4RadiusConstant;
    uint256 target5RadiusConstant;
    uint256[] public planetIds;
    address[] public playerIds;
    uint256 public worldRadius;
    uint256 public planetEventsCount;
    mapping(uint256 => DarkForestTypes.Planet) public planets;
    mapping(uint256 => DarkForestTypes.PlanetExtendedInfo)
        public planetsExtendedInfo;
    mapping(address => bool) public isPlayerInitialized;
    mapping(address => uint) public moveCnt;
    mapping(uint256 => uint256) public contractOwnedArtifactLocations;

    // maps location id to planet events array
    mapping(uint256 => DarkForestTypes.PlanetEventMetadata[])
        public planetEvents;

    // maps event id to arrival data
    mapping(uint256 => DarkForestTypes.ArrivalData) public planetArrivals;

    // function getTokenMintEndTimestamp() public view returns (uint256) {
    //     return tokenMintEndTimestamp;
    // }

    // function getTarget4RadiusConstant() public view returns (uint256) {
    //     return target4RadiusConstant;
    // }

    // function bulkGetPlayersMoveCount(
    //     uint256 startIdx,
    //     uint256 endIdx
    // ) public view returns (uint256[] memory ret) {
    //     // return slice of players array from startIdx through endIdx - 1
    //     ret = new uint256[](endIdx - startIdx);
    //     for (uint256 i = startIdx; i < endIdx; i++) {
    //         ret[i - startIdx] = playerMoveCount[playerIds[i]];
    //     }
    // }
}
