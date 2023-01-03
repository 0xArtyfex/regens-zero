// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "contracts/interfaces/ITokenUri.sol";
import "contracts/interfaces/IGenesisDNAVault.sol";
import "contracts/interfaces/IGenesisCollection.sol";

contract GenesisDNATokenUri is ITokenUri, Ownable {
    using Strings for uint256;

    uint256 constant POSITION_SIZE = 1000000;
    uint256 constant MAX_TRAITS = 20;
    uint256 constant INITIAL_TRAITS_AMOUNT = 5;
    uint256 constant MAX_INVENTORY = 20;

    IGenesisDNAVault public immutable genesisVault;

    string public preRevealUri;

    constructor(address _genesisVault) {
        genesisVault = IGenesisDNAVault(_genesisVault);
    }

    function setPreRevealUri(string memory _preRevealUri) public onlyOwner {
        preRevealUri = _preRevealUri;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return
            IGenesisCollection(genesisVault.contractsArray(0)).generalSalt() > 0
                ? onChainTokenURI(tokenId)
                : preRevealUri;
    }

    function onChainTokenURI(uint256 tokenId)
        internal
        view
        returns (string memory)
    {
        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        abi.encodePacked(
                            '{"name": "Regen #',
                            tokenId.toString(),
                            '","description": "The first open, decentralized and infinitely-extensible meta-collection, powered by dynamic and composable NFTs.",',
                            '"image": "',
                            genesisVault.previewImageUri(),
                            tokenId.toString(),
                            '.png","animation_url": "',
                            tokenImage(tokenId),
                            '","attributes": ',
                            genesisVault.hasMintedTraits(tokenId)
                                ? mintedAttributes(tokenId)
                                : notMintedAttributes(tokenId),
                            "}"
                        )
                    )
                )
            );
    }

    function mintedAttributes(uint256 tokenId)
        internal
        view
        returns (string memory attributes)
    {
        uint256 i;
        Trait[20] memory traits = genesisVault.getTraits(tokenId);
        attributes = string(
            abi.encodePacked(
                '[{"trait_type": "DNA","value": "GenesisDNA","contract": "',
                Strings.toHexString(uint256(uint160(address(genesisVault)))),
                '"}'
            )
        );
        for (i = 0; i < MAX_TRAITS; i++) {
            Trait memory trait = traits[i];
            if (uint160(trait.traitId) == 0) continue;
            attributes = string(
                abi.encodePacked(
                    attributes,
                    ',{"trait_type": "Layer ',
                    i.toString(),
                    '","value": "',
                    ITraitCollection(genesisVault.contractsArray(trait.layer1))
                        .traitName(trait.traitId),
                    '","metadata": "',
                    IERC721Metadata(genesisVault.contractsArray(trait.layer1))
                        .tokenURI(trait.traitId),
                    '","contract": "',
                    Strings.toHexString(
                        uint256(
                            uint160(genesisVault.contractsArray(trait.layer1))
                        )
                    ),
                    '","tokenId": "',
                    (trait.traitId).toString(),
                    '"}'
                )
            );
        }
        attributes = string(abi.encodePacked(attributes, "]"));
    }

    function notMintedAttributes(uint256 tokenId)
        internal
        view
        returns (string memory attributes)
    {
        uint256 i;
        attributes = string(
            abi.encodePacked(
                '[{"trait_type": "DNA","value": "GenesisDNA","contract": "',
                Strings.toHexString(uint256(uint160(address(genesisVault)))),
                '"}'
            )
        );

        for (i = 0; i <= INITIAL_TRAITS_AMOUNT; i++) {
            attributes = string(
                abi.encodePacked(
                    attributes,
                    ',{"trait_type": "Layer ',
                    (2 * i).toString(),
                    '","value": "',
                    ITraitCollection(genesisVault.contractsArray(0)).traitName(
                        tokenId + POSITION_SIZE * 2 * i
                    ),
                    '","metadata": "Equipped traits not minted yet.","contract": "',
                    Strings.toHexString(
                        uint256(uint160(genesisVault.contractsArray(0)))
                    ),
                    '","tokenId": "'
                    '"}'
                )
            );
        }
        attributes = string(abi.encodePacked(attributes, "]"));
    }

    function tokenImage(uint256 tokenId)
        public
        view
        returns (string memory _tokenImage)
    {
        return
            string(
                abi.encodePacked(
                    "data:image/svg+xml;base64,",
                    Base64.encode(
                        bytes(
                            string(
                                abi.encodePacked(
                                    '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 3000 3000" width="508.333" height="508.333">',
                                    genesisVault.hasMintedTraits(tokenId)
                                        ? mintedAttributesImage(tokenId)
                                        : notMintedAttributesImage(tokenId),
                                    "</svg>"
                                )
                            )
                        )
                    )
                )
            );
    }

    function mintedAttributesImage(uint256 tokenId)
        internal
        view
        returns (string memory imageUri)
    {
        uint256 i;
        imageUri = "";
        Trait[20] memory traits = genesisVault.getTraits(tokenId);
        for (i = 0; i < MAX_TRAITS; i++) {
            Trait memory trait = traits[i];
            if (i == 3) {
                imageUri = string(
                    abi.encodePacked(
                        imageUri,
                        '<image href= "',
                        genesisVault.DNAImageUri(),
                        '"/>'
                    )
                );
            }
            if (uint160(trait.traitId) == 0) continue;
            imageUri = string(
                abi.encodePacked(
                    imageUri,
                    '<image href= "',
                    ITraitCollection(
                        genesisVault.contractsArray(trait.layer1)
                    ).tokenImage(trait.traitId),
                    '"/>'
                )
            );
        }
    }

    function notMintedAttributesImage(uint256 tokenId)
        internal
        view
        returns (string memory imageUri)
    {
        uint256 i;
        imageUri = "";
        for (i = 0; i <= INITIAL_TRAITS_AMOUNT; i++) {
            if (i == 2) {
                imageUri = string(
                    abi.encodePacked(
                        imageUri,
                        '<image href= "',
                        genesisVault.DNAImageUri(),
                        '"/>'
                    )
                );
            }
            imageUri = string(
                abi.encodePacked(
                    imageUri,
                    '<image href= "',
                    ITraitCollection(genesisVault.contractsArray(0))
                        .tokenImage(tokenId + POSITION_SIZE * 2 * i),
                    '"/>'
                )
            );
        }
    }
}
