// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract MockNFT is ERC721URIStorage {
    uint256 private _tokenIdCounter;

    constructor() ERC721("MockNFT", "MNFT") {
        _tokenIdCounter = 0;
    }

    function mintNFT(address recipient, string memory tokenURI) public returns (uint256) {
        _tokenIdCounter += 1;
        uint256 newItemId = _tokenIdCounter;
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);
        return newItemId;
    }

    function mintMultiple(address recipient, uint256 count, string memory baseURI) public {
        for (uint256 i = 0; i < count; i++) {
            _tokenIdCounter += 1;
            _mint(recipient, _tokenIdCounter);
            _setTokenURI(_tokenIdCounter, string(abi.encodePacked(baseURI, "/", _toString(_tokenIdCounter))));
        }
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}