const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTAuction Unit Tests", function () {
  let NFTAuction;
  let nftAuction;
  let MyNFT;
  let nftContract;
  let owner;
  let seller;
  let bidder1;
  let bidder2;

  beforeEach(async function () {
    [owner, seller, bidder1, bidder2] = await ethers.getSigners();

    // 部署MyNFT合约
    MyNFT = await ethers.getContractFactory("MyNFT");
    nftContract = await MyNFT.deploy();
    await nftContract.waitForDeployment();

    // 部署NFTAuction合约
    NFTAuction = await ethers.getContractFactory("NFTAuction");
    nftAuction = await NFTAuction.deploy();
    await nftAuction.waitForDeployment();

    // 卖家铸造一个NFT
    const tokenId = await nftContract.mintNFT(seller.address, "https://example.com/token/1");
  });

  describe("Auction Initialization", function () {
    it("should initialize auction with correct parameters", async function () {
      const tokenId = 1;
      const startPrice = ethers.parseEther("1.0");
      const usdStartPrice = ethers.parseEther("2000.0"); // 假设1 ETH = 2000 USD
      const startTime = Math.floor(Date.now() / 1000) + 60; // 1分钟后开始
      const duration = 3600; // 1小时
      const minBidIncrement = ethers.parseEther("0.1");

      // 卖家授权NFT给拍卖合约
      await nftContract.connect(seller).approve(nftAuction.target, tokenId);

      // 初始化拍卖
      await nftAuction.initialize(
        {
          seller: seller.address,
          nftContract: nftContract.target,
          tokenId: tokenId,
          paymentToken: ethers.ZeroAddress, // ETH
          startPrice: startPrice,
          usdStartPrice: usdStartPrice,
          startTime: startTime,
          duration: duration,
          minBidIncrement: minBidIncrement
        },
        owner.address // factory地址
      );

      // 验证拍卖参数
      expect(await nftAuction.seller()).to.equal(seller.address);
      expect(await nftAuction.nftContract()).to.equal(nftContract.target);
      expect(await nftAuction.tokenId()).to.equal(tokenId);
      expect(await nftAuction.startPrice()).to.equal(startPrice);
      expect(await nftAuction.startTime()).to.equal(startTime);
      expect(await nftAuction.endTime()).to.equal(startTime + duration);
    });

    it("should transfer NFT to auction contract on initialization", async function () {
      const tokenId = 1;
      
      await nftContract.connect(seller).approve(nftAuction.target, tokenId);
      
      await nftAuction.initialize(
        {
          seller: seller.address,
          nftContract: nftContract.target,
          tokenId: tokenId,
          paymentToken: ethers.ZeroAddress,
          startPrice: ethers.parseEther("1.0"),
          usdStartPrice: ethers.parseEther("2000.0"),
          startTime: Math.floor(Date.now() / 1000) + 60,
          duration: 3600,
          minBidIncrement: ethers.parseEther("0.1")
        },
        owner.address
      );

      expect(await nftContract.ownerOf(tokenId)).to.equal(nftAuction.target);
    });
  });

  describe("Bidding Functionality", function () {
    beforeEach(async function () {
      const tokenId = 1;
      await nftContract.connect(seller).approve(nftAuction.target, tokenId);
      
      await nftAuction.initialize(
        {
          seller: seller.address,
          nftContract: nftContract.target,
          tokenId: tokenId,
          paymentToken: ethers.ZeroAddress,
          startPrice: ethers.parseEther("1.0"),
          usdStartPrice: ethers.parseEther("2000.0"),
          startTime: Math.floor(Date.now() / 1000),
          duration: 3600,
          minBidIncrement: ethers.parseEther("0.1")
        },
        owner.address
      );
    });

    it("should accept valid bid", async function () {
      const bidAmount = ethers.parseEther("1.5");
      
      await expect(nftAuction.connect(bidder1).placeBid(0, { value: bidAmount }))
        .to.emit(nftAuction, "NewBid")
        .withArgs(bidder1.address, bidAmount, expect.anything());

      expect(await nftAuction.highestBidder()).to.equal(bidder1.address);
      expect(await nftAuction.highestBid()).to.equal(bidAmount);
    });

    it("should reject bid below start price", async function () {
      const bidAmount = ethers.parseEther("0.5");
      
      await expect(
        nftAuction.connect(bidder1).placeBid(0, { value: bidAmount })
      ).to.be.revertedWith("Bid below start price");
    });

    it("should reject bid below minimum increment", async function () {
      const firstBid = ethers.parseEther("1.5");
      const secondBid = ethers.parseEther("1.55"); // 低于最小加价0.1 ETH
      
      await nftAuction.connect(bidder1).placeBid(0, { value: firstBid });
      
      await expect(
        nftAuction.connect(bidder2).placeBid(0, { value: secondBid })
      ).to.be.revertedWith("Bid too low");
    });

    it("should refund previous bidder when outbid", async function () {
      const firstBid = ethers.parseEther("1.5");
      const secondBid = ethers.parseEther("2.0");
      
      // 第一个出价
      await nftAuction.connect(bidder1).placeBid(0, { value: firstBid });
      
      const bidder1BalanceBefore = await ethers.provider.getBalance(bidder1.address);
      
      // 第二个出价，应该退还第一个出价者的资金
      await nftAuction.connect(bidder2).placeBid(0, { value: secondBid });
      
      const bidder1BalanceAfter = await ethers.provider.getBalance(bidder1.address);
      
      // 验证第一个出价者收到了退款
      expect(bidder1BalanceAfter).to.be.gt(bidder1BalanceBefore);
      expect(await nftAuction.highestBidder()).to.equal(bidder2.address);
    });
  });

  describe("Auction Ending", function () {
    beforeEach(async function () {
      const tokenId = 1;
      await nftContract.connect(seller).approve(nftAuction.target, tokenId);
      
      await nftAuction.initialize(
        {
          seller: seller.address,
          nftContract: nftContract.target,
          tokenId: tokenId,
          paymentToken: ethers.ZeroAddress,
          startPrice: ethers.parseEther("1.0"),
          usdStartPrice: ethers.parseEther("2000.0"),
          startTime: Math.floor(Date.now() / 1000),
          duration: 60, // 短时间便于测试
          minBidIncrement: ethers.parseEther("0.1")
        },
        owner.address
      );
    });

    it("should end auction and transfer NFT to winner", async function () {
      const bidAmount = ethers.parseEther("1.5");
      
      // 出价
      await nftAuction.connect(bidder1).placeBid(0, { value: bidAmount });
      
      // 推进时间到拍卖结束
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");
      
      // 结束拍卖
      await expect(nftAuction.connect(seller).endAuction())
        .to.emit(nftAuction, "AuctionEnded")
        .withArgs(bidder1.address, bidAmount, expect.anything());
      
      // 验证NFT转移给获胜者
      expect(await nftContract.ownerOf(1)).to.equal(bidder1.address);
      expect(await nftAuction.ended()).to.be.true;
    });

    it("should return NFT to seller if no bids", async function () {
      // 推进时间到拍卖结束
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");
      
      // 结束拍卖
      await expect(nftAuction.connect(seller).endAuction())
        .to.emit(nftAuction, "AuctionCanceled");
      
      // 验证NFT退回给卖家
      expect(await nftContract.ownerOf(1)).to.equal(seller.address);
      expect(await nftAuction.ended()).to.be.true;
    });

    it("should allow seller to cancel auction before bids", async function () {
      await expect(nftAuction.connect(seller).cancelAuction())
        .to.emit(nftAuction, "AuctionCanceled");
      
      expect(await nftContract.ownerOf(1)).to.equal(seller.address);
      expect(await nftAuction.ended()).to.be.true;
    });

    it("should prevent cancellation after bids placed", async function () {
      const bidAmount = ethers.parseEther("1.5");
      
      await nftAuction.connect(bidder1).placeBid(0, { value: bidAmount });
      
      await expect(nftAuction.connect(seller).cancelAuction())
        .to.be.revertedWith("Bids already placed");
    });
  });

  describe("Price Conversion", function () {
    it("should convert ETH to USD correctly", async function () {
      const ethAmount = ethers.parseEther("1.0");
      
      // 测试价格转换功能
      const usdAmount = await nftAuction.convertToUSD(ethers.ZeroAddress, ethAmount);
      
      // 验证返回了合理的USD值
      expect(usdAmount).to.be.gt(0);
    });
  });

  describe("Auction Information", function () {
    it("should return correct auction info", async function () {
      const tokenId = 1;
      await nftContract.connect(seller).approve(nftAuction.target, tokenId);
      
      const startPrice = ethers.parseEther("1.0");
      const startTime = Math.floor(Date.now() / 1000) + 60;
      
      await nftAuction.initialize(
        {
          seller: seller.address,
          nftContract: nftContract.target,
          tokenId: tokenId,
          paymentToken: ethers.ZeroAddress,
          startPrice: startPrice,
          usdStartPrice: ethers.parseEther("2000.0"),
          startTime: startTime,
          duration: 3600,
          minBidIncrement: ethers.parseEther("0.1")
        },
        owner.address
      );

      const auctionInfo = await nftAuction.getAuctionInfo();
      
      expect(auctionInfo[0]).to.equal(seller.address); // seller
      expect(auctionInfo[1]).to.equal(nftContract.target); // nftContract
      expect(auctionInfo[2]).to.equal(tokenId); // tokenId
      expect(auctionInfo[3]).to.equal(startPrice); // startPrice
      expect(auctionInfo[5]).to.equal(startTime); // startTime
      expect(auctionInfo[10]).to.be.false; // ended
    });
  });
});