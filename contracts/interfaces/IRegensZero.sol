// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

interface IRegensZero {
    function getController(uint256 tokenId) external returns (address);

    function getSigner(uint256 tokenId) external returns (address);

    function getTokenTimelock(uint256 tokenId) external returns (uint256);

    function setNewDNA(address _DNA) external;

    function changeLastTraitModification(uint256 tokenId) external;

    function removeDNA(address _DNA) external;

    function genesisMint(uint256 amount, address _address) external;

    function postGenesisMint(uint256 amount, address _address) external;

    function tokenIdDNA(uint256) external returns (address);

    function genesisSupply() external view returns (uint256);
}
