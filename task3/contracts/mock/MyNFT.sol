// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract MyNFT is ERC721URIStorage {

    uint256 private _tokenIdCounter;

    constructor() ERC721("MyNFT", "MNFT") {
         _tokenIdCounter = 0; // 从0开始，或者从1开始根据需求
    }

    function mintNFT(address recipient, string memory tokenURI) public returns (uint256) {
         _tokenIdCounter += 1;
        uint256 newItemId = _tokenIdCounter;
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);
        return newItemId;
    }
}