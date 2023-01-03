// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "contracts/interfaces/IDNAVault.sol";

interface IGenesisDNAVault is IDNAVault {
    function getTraits(uint256 tokenId)
        external
        view
        returns (Trait[20] memory traits);

    function hasMintedTraits(uint256 tokenId) external view returns (bool);

    function contractsArray(uint256) external view returns (address);

    function DNAImageUri() external view returns (string memory);

    function previewImageUri() external view returns (string memory);

    function getTokenIdSalt(uint256 tokenId) external view returns (uint256);
}
