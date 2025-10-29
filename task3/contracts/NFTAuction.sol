// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract NFTAuction is ReentrancyGuard {
    using Address for address payable;

    struct AuctionConfig {
        address seller;
        address nftContract;
        uint256 tokenId;
        address paymentToken; // address(0) for ETH
        uint256 startPrice;
        uint256 startTime;
        uint256 duration;
        uint256 minBidIncrement; // 最小加价幅度
    }

    // 拍卖状态
    address public seller;
    address public nftContract;
    uint256 public tokenId;
    address public paymentToken;
    uint256 public startPrice;
    uint256 public startTime;
    uint256 public endTime;
    uint256 public minBidIncrement;

    address public highestBidder;
    uint256 public highestBid;
    bool public ended;

    // 事件
    event NewBid(address indexed bidder, uint256 amount);
    event AuctionEnded(address indexed winner, uint256 amount);
    event AuctionCanceled();

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    address public factory;

    constructor() {
        factory = msg.sender; // 工厂地址
    }

    // 工厂调用的初始化函数
    function initialize(AuctionConfig memory config) external onlyFactory {
        require(seller == address(0), "Already initialized");

        seller = config.seller;
        nftContract = config.nftContract;
        tokenId = config.tokenId;
        paymentToken = config.paymentToken;
        startPrice = config.startPrice;
        startTime = config.startTime;
        endTime = config.startTime + config.duration;
        minBidIncrement = config.minBidIncrement;

        // 转移NFT到拍卖合约
        IERC721(nftContract).transferFrom(seller, address(this), tokenId);
    }

    function placeBid(uint256 bidAmount) external payable nonReentrant {
        require(block.timestamp >= startTime, "Auction not started");
        require(block.timestamp <= endTime, "Auction ended");
        require(!ended, "Auction already ended");

        uint256 actualBid = paymentToken == address(0) ? msg.value : bidAmount;
        require(actualBid >= startPrice, "Bid below start price");
        require(actualBid >= highestBid + minBidIncrement, "Bid too low");

        // 处理资金转移
        if (paymentToken == address(0)) {
            require(msg.value == actualBid, "ETH amount mismatch");
            // 退还前一个出价者的ETH
            if (highestBidder != address(0)) {
                payable(highestBidder).sendValue(highestBid);
            }
        } else {
            require(msg.value == 0, "ETH not accepted");
            IERC20(paymentToken).transferFrom(
                msg.sender,
                address(this),
                actualBid
            );
            // 退还前一个出价者的代币
            if (highestBidder != address(0)) {
                IERC20(paymentToken).transfer(highestBidder, highestBid);
            }
        }

        highestBidder = msg.sender;
        highestBid = actualBid;

        // 最后5分钟有出价，延长拍卖时间（类似eBay机制）
        if (endTime - block.timestamp < 5 minutes) {
            endTime = block.timestamp + 5 minutes;
        }

        emit NewBid(msg.sender, actualBid);
    }

    function endAuction() external nonReentrant {
        require(block.timestamp > endTime, "Auction not ended");
        require(!ended, "Auction already ended");
        require(
            msg.sender == seller || msg.sender == factory,
            "Not authorized"
        );

        ended = true;

        if (highestBidder != address(0)) {
            // 转移NFT给获胜者
            IERC721(nftContract).safeTransferFrom(
                address(this),
                highestBidder,
                tokenId
            );

            // 转移资金给卖家
            if (paymentToken == address(0)) {
                payable(seller).sendValue(highestBid);
            } else {
                IERC20(paymentToken).transfer(seller, highestBid);
            }

            emit AuctionEnded(highestBidder, highestBid);
        } else {
            // 无人出价，退回NFT
            IERC721(nftContract).safeTransferFrom(
                address(this),
                seller,
                tokenId
            );
            emit AuctionCanceled();
        }
    }

    function cancelAuction() external onlySeller nonReentrant {
        require(block.timestamp < endTime, "Auction already ended");
        require(highestBidder == address(0), "Bids already placed");

        ended = true;
        IERC721(nftContract).safeTransferFrom(address(this), seller, tokenId);

        emit AuctionCanceled();
    }

    function getAuctionInfo()
        external
        view
        returns (
            address,
            address,
            uint256,
            uint256,
            uint256,
            uint256,
            address,
            uint256,
            bool
        )
    {
        return (
            seller,
            nftContract,
            tokenId,
            startPrice,
            startTime,
            endTime,
            highestBidder,
            highestBid,
            ended
        );
    }
}
