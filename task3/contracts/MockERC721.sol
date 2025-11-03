// contracts/test/MockERC721.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721 {
    uint256 public tokenCounter;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        tokenCounter = 0;
    }

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
        tokenCounter++;
    }

    function baseURI() public pure returns (string memory) {
        return "https://example.com/token/";
    }
}
