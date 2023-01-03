// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "contracts/interfaces/ITraitCollection.sol";

interface IGenesisCollection is ITraitCollection {
    function mintTraits(uint256 tokenId) external;

    function generalSalt() external view returns (uint256);
}
