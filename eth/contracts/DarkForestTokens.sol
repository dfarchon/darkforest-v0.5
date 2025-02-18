// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "./DarkForestTypes.sol";

contract DarkForestTokens is ERC721EnumerableUpgradeable {
    address public coreAddress;
    mapping(uint256 => DarkForestTypes.Artifact) public artifacts;
    address public adminAddress;
    string private baseURI;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _coreAddress,
        address _adminAddress
    ) public initializer {
        require(_coreAddress != address(0), "Core address cannot be zero");
        require(_adminAddress != address(0), "Admin address cannot be zero");

        __ERC721_init("Dark Forest Artifact", "DFA");
        __ERC721Enumerable_init();

        coreAddress = _coreAddress;
        adminAddress = _adminAddress;
        baseURI = "https://zkga.me/token-uri/artifact/";
    }

    // function _beforeTokenTransfer(
    //     address from,
    //     address to,
    //     uint256 tokenId,
    //     uint256 batchSize
    // ) internal override(ERC721EnumerableUpgradeable) {
    //     super._beforeTokenTransfer(from, to, tokenId, batchSize);
    // }

    // function supportsInterface(
    //     bytes4 interfaceId
    // ) public view override(ERC721EnumerableUpgradeable) returns (bool) {
    //     return super.supportsInterface(interfaceId);
    // }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory newBaseURI) public {
        require(msg.sender == adminAddress, "Only admin can set base URI");
        baseURI = newBaseURI;
    }

    function createArtifact(
        uint256 tokenId,
        address discoverer,
        uint256 planetId,
        uint256 planetLevel,
        uint256 levelBonus,
        DarkForestTypes.Biome planetBiome,
        DarkForestTypes.ArtifactType artifactType
    ) public returns (DarkForestTypes.Artifact memory) {
        require(
            msg.sender == coreAddress || msg.sender == adminAddress,
            "Only the Core or Admin addresses can spawn artifacts"
        );

        _mint(coreAddress, tokenId);

        uint256 level = planetLevel + levelBonus;
        if (level > 7) {
            level = 7;
        }

        DarkForestTypes.Artifact memory newArtifact = DarkForestTypes.Artifact(
            tokenId,
            planetId,
            level,
            planetBiome,
            block.timestamp,
            discoverer,
            artifactType
        );

        artifacts[tokenId] = newArtifact;

        return newArtifact;
    }

    function giveArtifactToPlayer(
        uint256 tokenId,
        address discoverer,
        uint256 planetId,
        uint256 artifactLevel,
        DarkForestTypes.Biome planetBiome,
        DarkForestTypes.ArtifactType artifactType
    ) public returns (DarkForestTypes.Artifact memory) {
        require(
            msg.sender == coreAddress || msg.sender == adminAddress,
            "Only the Core or Admin addresses can spawn artifacts"
        );

        _mint(discoverer, tokenId);

        DarkForestTypes.Artifact memory newArtifact = DarkForestTypes.Artifact(
            tokenId,
            planetId,
            artifactLevel,
            planetBiome,
            block.timestamp,
            discoverer,
            artifactType
        );

        artifacts[tokenId] = newArtifact;

        return newArtifact;
    }

    function getArtifact(
        uint256 tokenId
    ) public view returns (DarkForestTypes.Artifact memory) {
        return artifacts[tokenId];
    }

    function getPlayerArtifactIds(
        address playerId
    ) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(playerId);

        uint256[] memory results = new uint256[](balance);

        for (uint256 idx = 0; idx < balance; idx++) {
            results[idx] = tokenOfOwnerByIndex(playerId, idx);
        }

        return results;
    }

    function transferToCoreContract(uint256 tokenId) public {
        require(
            msg.sender == coreAddress,
            "Only the Core Address can initiate a transfer to itself"
        );
        _transfer(ownerOf(tokenId), coreAddress, tokenId);
    }

    function doesArtifactExist(uint256 tokenId) public view returns (bool) {
        return _exists(tokenId);
    }

    function createMythicArtifact(
        uint256 tokenId,
        address to,
        DarkForestTypes.Biome planetBiome,
        DarkForestTypes.ArtifactType artifactType
    ) public {
        require(
            msg.sender == adminAddress,
            "Only the Admin Address can spawn artifacts"
        );
        _mint(to, tokenId);
        DarkForestTypes.Artifact memory newArtifact = DarkForestTypes.Artifact(
            tokenId,
            0,
            8,
            planetBiome,
            block.timestamp,
            to,
            artifactType
        );
        artifacts[tokenId] = newArtifact;
    }
}
