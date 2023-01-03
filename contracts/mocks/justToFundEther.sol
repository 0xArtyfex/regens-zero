// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

contract selfDestruct {
    function receiveEther() external payable {}

    function sendEther(address payable _traitsAddress) public payable {
        selfdestruct(_traitsAddress);
    }
}
