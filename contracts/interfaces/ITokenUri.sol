// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

interface ITokenUri {
    function tokenURI(uint256 tokenId)
        external
        view
        returns (string memory uri);
}
