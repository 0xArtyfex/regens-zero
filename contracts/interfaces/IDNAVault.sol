// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

struct Trait {
    uint256 layer1;
    uint256 traitId;
}

interface IDNAVault {
    function tokenURI(uint256) external view returns (string memory);

    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
        returns (address, uint256);
}
