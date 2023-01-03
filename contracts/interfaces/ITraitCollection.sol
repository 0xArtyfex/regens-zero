// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

interface ITraitCollection {
    function transferSpecial(uint256 tokenId, address _address) external;

    function tokenImage(uint256 tokenId) external view returns (string memory);

    function collectionName() external view returns (string memory);

    function traitName(uint256 tokenId) external view returns (string memory);
}
