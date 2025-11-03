// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./NFTAuctionFactory.sol";

contract NFTAuctionFactoryV2 is NFTAuctionFactory {
    function getVersion() public pure returns (string memory) {
        return "v2.0"; // 返回状态变量，而不是固定字符串
    }
}
