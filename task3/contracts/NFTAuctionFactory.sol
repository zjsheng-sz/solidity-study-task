// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./NFTAuction.sol";

contract NFTAuctionFactory {
    // 所有拍卖合约地址
    address[] public allAuctions;

    // 映射：NFT合约 => tokenId => 拍卖地址
    mapping(address => mapping(uint256 => address)) public constractAuction;

    // 映射：用户地址 => 创建的拍卖列表
    mapping(address => address[]) public userAuctions;

        // 事件
    event AuctionCreated(
        address indexed seller,
        address indexed nftContract,
        uint256 indexed tokenId,
        address auctionAddress,
        uint256 auctionId
    );

    // 创建新拍卖（类似Uniswap的createPair）
    function createAuction(
        address nftContract,
        uint256 tokenId,
        address paymentToken,
        uint256 startPrice,
        uint256 startTime,
        uint256 duration,
        uint256 minBidIncrement
    ) external returns (address auction) {
        require(nftContract != address(0), "Invalid NFT contract");
        require(constractAuction[nftContract][tokenId] == address(0), "Auction exists");
        require(duration > 0, "Invalid duration");
        require(startTime > block.timestamp, "startTime must be future");

        bytes memory bytecode = type(NFTAuction).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(nftContract,tokenId,block.timestamp));

        assembly {
            auction := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        NFTAuction.AuctionConfig memory config = NFTAuction.AuctionConfig({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            paymentToken: paymentToken,
            startPrice: startPrice,
            startTime: startTime,
            duration: duration,
            minBidIncrement: minBidIncrement
        });

        NFTAuction(auction).initialize(config);

        // 记录拍卖信息
        allAuctions.push(auction);
        constractAuction[nftContract][tokenId] = auction;
        userAuctions[msg.sender].push(auction);

        emit AuctionCreated(msg.sender, nftContract, tokenId, auction, allAuctions.length-1);

    }

        // 获取所有拍卖数量
    function allAuctionsLength() external view returns (uint256) {
        return allAuctions.length;
    }

    // 获取用户创建的拍卖
    function getUserAuctions(address user) external view returns (address[] memory) {
        return userAuctions[user];
    }

    // 获取用户拍卖数量
    function getUserAuctionCount(address user) external view returns (uint256) {

        return userAuctions[user].length;
    }

     // 批量结束过期拍卖（工厂维护功能）
    function endExpiredAuctions(address[] calldata auctions) external {
        for (uint256 i = 0; i < auctions.length; i++) {
            NFTAuction auction = NFTAuction(auctions[i]);
            try auction.endAuction() {
                // 拍卖成功结束
            } catch {
                // 处理失败的拍卖
                continue;
            }
        }
    }
}
