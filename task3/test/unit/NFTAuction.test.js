const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTAuction", function () {
  let NFTAuction, auction;
  let MockERC721, mockERC721;
  let MockERC20, mockERC20;
  let MockPriceFeed, mockEthPriceFeed, mockErc20PriceFeed;

  let owner, seller, bidder1, bidder2;

  // 测试常量
  const TOKEN_ID = 1;
  const START_PRICE_ETH = ethers.parseEther("0.01");
  const START_PRICE_ERC20 = ethers.parseEther("0.03");
  const START_PRICE_USD = 30 * 1e8; // 3000 USD (8 decimals)
  const DURATION = 3600; // 1小时
  const MIN_BID_INCREMENT = ethers.parseEther("0.001");
  const MIN_BID_INCREMENT_ERC20 = ethers.parseEther("0.003");

  let snapshotId;


  beforeEach(async function () {
    [owner, seller, bidder1, bidder2] = await ethers.getSigners();

    // 部署 Mock ERC721
    MockERC721 = await ethers.getContractFactory("MockERC721");
    mockERC721 = await MockERC721.deploy("Test NFT", "TNFT");
    await mockERC721.waitForDeployment();

    // 部署 Mock ERC20
    MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Test Token", "TEST", 18);
    await mockERC20.waitForDeployment();

    // 部署 Mock Price Feed
    MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockEthPriceFeed = await MockPriceFeed.deploy(3000 * 1e8); // 3000 USD
    await mockEthPriceFeed.waitForDeployment();

    mockErc20PriceFeed = await MockPriceFeed.deploy(1000 * 1e8); // 1 USD
    await mockErc20PriceFeed.waitForDeployment();

    // 部署 Auction
    NFTAuction = await ethers.getContractFactory("NFTAuction");
    auction = await NFTAuction.deploy();
    await auction.waitForDeployment();

    // // 创建新的拍卖合约
    // const AuctionFactory = await ethers.getContractFactory("AuctionFactory");
    // const auctionFactoryContract = await AuctionFactory.deploy();

    // // 为测试简化，直接使用 NFTAuction 合约
    // auction = await ethers.deployContract("NFTAuction");
    // await auction.waitForDeployment();

    // 铸造 NFT 给卖家
    await mockERC721.mint(seller.address, TOKEN_ID);

    // 铸造 ERC20 代币给投标人
    await mockERC20.mint(bidder1.address, ethers.parseEther("1000"));
    await mockERC20.mint(bidder2.address, ethers.parseEther("1000"));

    snapshotId = await ethers.provider.send("evm_snapshot");

  });

  // 每个测试后回滚到快照
  afterEach(async function () {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });


  describe("拍卖初始化", function () {
    it("应该正确初始化拍卖参数", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 100;
      const auctionConfig = {
        seller: seller.address,
        nftContract: await mockERC721.getAddress(),
        tokenId: TOKEN_ID,
        paymentToken: ethers.ZeroAddress, // ETH
        startPrice: START_PRICE_ETH,
        usdStartPrice: START_PRICE_USD,
        startTime: startTime,
        duration: DURATION,
        minBidIncrement: MIN_BID_INCREMENT
      };

      // 批准 NFT 转移
      await mockERC721.connect(seller).transferFrom(seller, await auction.getAddress(), TOKEN_ID);

      // 初始化拍卖
      await auction.initialize(auctionConfig);

      const auctionInfo = await auction.getAuctionInfo();

      expect(auctionInfo[0]).to.equal(seller.address); // seller
      expect(auctionInfo[1]).to.equal(await mockERC721.getAddress()); // nftContract
      expect(auctionInfo[2]).to.equal(TOKEN_ID); // tokenId
      expect(auctionInfo[3]).to.equal(START_PRICE_ETH); // startPrice
      expect(auctionInfo[5]).to.equal(startTime); // startTime
    });

    it("应该拒绝重复初始化", async function () {
      const startTime = Math.floor(Date.now() / 1000) + 100;
      const auctionConfig = {
        seller: seller.address,
        nftContract: await mockERC721.getAddress(),
        tokenId: TOKEN_ID,
        paymentToken: ethers.ZeroAddress,
        startPrice: START_PRICE_ETH,
        usdStartPrice: START_PRICE_USD,
        startTime: startTime,
        duration: DURATION,
        minBidIncrement: MIN_BID_INCREMENT
      };

      await mockERC721.connect(seller).transferFrom(seller, await auction.getAddress(), TOKEN_ID);

      await auction.initialize(auctionConfig);

      await expect(auction.initialize(auctionConfig))
        .to.be.revertedWith("Already initialized");
    });
  });

  describe("ETH 拍卖", function () {
    beforeEach(async function () {
      const startTime = Math.floor(Date.now() / 1000) - 100; // 已开始

      const auctionConfig = {
        seller: seller.address,
        nftContract: await mockERC721.getAddress(),
        tokenId: TOKEN_ID,
        paymentToken: ethers.ZeroAddress,
        startPrice: START_PRICE_ETH,
        usdStartPrice: START_PRICE_USD,
        startTime: startTime,
        duration: DURATION,
        minBidIncrement: MIN_BID_INCREMENT
      };

      await mockERC721.connect(seller).transferFrom(seller, await auction.getAddress(), TOKEN_ID);

      await auction.initialize(auctionConfig);

      // 设置价格预言机
      await auction.connect(seller).setPriceFeed(ethers.ZeroAddress, await mockEthPriceFeed.getAddress());
    });

    it("应该接受有效的 ETH 出价", async function () {
      const bidAmount = START_PRICE_ETH;

      await expect(auction.connect(bidder1).placeBid(0, { value: bidAmount }))
        .to.emit(auction, "NewBid")
        .withArgs(bidder1.address, bidAmount, START_PRICE_USD);

      const auctionInfo = await auction.getAuctionInfo();
      expect(auctionInfo[7]).to.equal(bidder1.address); // highestBidder
      expect(auctionInfo[8]).to.equal(bidAmount); // highestBid
    });

    it("应该拒绝低于起拍价的出价", async function () {
      const lowBid = START_PRICE_ETH - MIN_BID_INCREMENT;

      await expect(auction.connect(bidder1).placeBid(0, { value: lowBid }))
        .to.be.revertedWith("Bid below start price");
    });

    it("应该拒绝低于最小加价幅度的出价", async function () {
      // 第一个出价
      await auction.connect(bidder1).placeBid(0, { value: START_PRICE_ETH });

      // 第二个出价不够
      const lowBid = START_PRICE_ETH + MIN_BID_INCREMENT - ethers.parseEther("0.0001");

      await expect(auction.connect(bidder2).placeBid(0, { value: lowBid }))
        .to.be.revertedWith("Bid too low");
    });

    it("应该退还前一个出价者的 ETH", async function () {
      const bidder1BalanceBefore = await ethers.provider.getBalance(bidder1.address);

      // 第一个出价
      const bid1 = START_PRICE_ETH;
      await auction.connect(bidder1).placeBid(0, { value: bid1 });

      // 第二个更高的出价
      const bid2 = START_PRICE_ETH + MIN_BID_INCREMENT;
      await auction.connect(bidder2).placeBid(0, { value: bid2 });

      // 检查 bidder1 是否收到退款
      const bidder1BalanceAfter = await ethers.provider.getBalance(bidder1.address);
      expect(bidder1BalanceAfter).to.be.closeTo(bidder1BalanceBefore, ethers.parseEther("0.01"));
    });

    it("应该在最后5分钟有出价时延长拍卖时间", async function () {
      // 设置拍卖即将结束
      const newEndTime = Math.floor(Date.now() / 1000) + 60 * 60 - 100; // 59分钟后结束
      await ethers.provider.send("evm_setNextBlockTimestamp", [newEndTime - 10 * 60]);

      // 第一个出价
      await auction.connect(bidder1).placeBid(0, { value: START_PRICE_ETH });

      const auctionInfoBefore = await auction.getAuctionInfo();
      const endTimeBefore = auctionInfoBefore[6];

      // 在最后4分钟出价
      await ethers.provider.send("evm_setNextBlockTimestamp", [newEndTime - 60]);
      await auction.connect(bidder2).placeBid(0, {
        value: START_PRICE_ETH + MIN_BID_INCREMENT
      });

      const auctionInfoAfter = await auction.getAuctionInfo();
      const endTimeAfter = auctionInfoAfter[6];

      expect(endTimeAfter).to.be.greaterThan(endTimeBefore);
      expect(endTimeAfter - endTimeBefore).to.be.closeTo(5 * 60, 5 * 60);
    });
  });

  describe("ERC20 拍卖", function () {
    beforeEach(async function () {
      const startTime = Math.floor(Date.now() / 1000) - 100;
      const auctionConfig = {
        seller: seller.address,
        nftContract: await mockERC721.getAddress(),
        tokenId: TOKEN_ID,
        paymentToken: await mockERC20.getAddress(),
        startPrice: START_PRICE_ETH,
        usdStartPrice: START_PRICE_USD,
        startTime: startTime,
        duration: DURATION,
        minBidIncrement: MIN_BID_INCREMENT
      };

      await mockERC721.connect(seller).transferFrom(seller, await auction.getAddress(), TOKEN_ID);

      await auction.initialize(auctionConfig);

      // 设置价格预言机
      await auction.connect(seller).setPriceFeed(await mockERC20.getAddress(), await mockErc20PriceFeed.getAddress());
    });

    it("应该接受有效的 ERC20 出价", async function () {
      const bidAmount = START_PRICE_ERC20;

      // 批准代币转移
      await mockERC20.connect(bidder1).approve(await auction.getAddress(), bidAmount);

      await expect(auction.connect(bidder1).placeBid(bidAmount))
        .to.emit(auction, "NewBid")
        .withArgs(bidder1.address, bidAmount, START_PRICE_USD);

      const auctionInfo = await auction.getAuctionInfo();
      expect(auctionInfo[7]).to.equal(bidder1.address);
      expect(auctionInfo[8]).to.equal(bidAmount);
    });

    it("应该退还前一个出价者的 ERC20 代币", async function () {
      const bidAmount1 = START_PRICE_ERC20;
      const bidAmount2 = START_PRICE_ERC20 + MIN_BID_INCREMENT_ERC20;

      // 批准代币转移
      await mockERC20.connect(bidder1).approve(await auction.getAddress(), bidAmount2);
      await mockERC20.connect(bidder2).approve(await auction.getAddress(), bidAmount2);

      const bidder1BalanceBefore = await mockERC20.balanceOf(bidder1.address);

      // 第一个出价
      await auction.connect(bidder1).placeBid(bidAmount1);

      // 第二个更高的出价
      await auction.connect(bidder2).placeBid(bidAmount2);

      // 检查 bidder1 是否收到退款
      const bidder1BalanceAfter = await mockERC20.balanceOf(bidder1.address);
      expect(bidder1BalanceAfter).to.equal(bidder1BalanceBefore);
    });
  });

  describe("结束拍卖", function () {
    beforeEach(async function () {
      const startTime = Math.floor(Date.now() / 1000) - 100;
      const auctionConfig = {
        seller: seller.address,
        nftContract: await mockERC721.getAddress(),
        tokenId: TOKEN_ID,
        paymentToken: ethers.ZeroAddress,
        startPrice: START_PRICE_ETH,
        usdStartPrice: START_PRICE_USD,
        startTime: startTime,
        duration: DURATION,
        minBidIncrement: MIN_BID_INCREMENT
      };

      await mockERC721.connect(seller).transferFrom(seller, await auction.getAddress(), TOKEN_ID);

      await auction.initialize(auctionConfig);
      await auction.connect(seller).setPriceFeed(ethers.ZeroAddress, await mockEthPriceFeed.getAddress());
    });

    it("应该成功结束拍卖并转移资产", async function () {
      // 出价
      await auction.connect(bidder1).placeBid(0, { value: START_PRICE_ETH });

      // 推进时间到拍卖结束
      await ethers.provider.send("evm_increaseTime", [DURATION + 100]);
      await ethers.provider.send("evm_mine");

      await expect(auction.connect(seller).endAuction())
        .to.emit(auction, "AuctionEnded")
        .withArgs(bidder1.address, START_PRICE_ETH, START_PRICE_USD);

      // 检查 NFT 所有权转移
      const newOwner = await mockERC721.ownerOf(TOKEN_ID);
      expect(newOwner).to.equal(bidder1.address);
    });

    it("无人出价时应取消拍卖", async function () {
      // 推进时间到拍卖结束
      await ethers.provider.send("evm_increaseTime", [DURATION + 100]);
      await ethers.provider.send("evm_mine");

      await expect(auction.connect(seller).endAuction())
        .to.emit(auction, "AuctionCanceled");

      // 检查 NFT 退回给卖家
      const nftOwner = await mockERC721.ownerOf(TOKEN_ID);
      expect(nftOwner).to.equal(seller.address);
    });

    it("应该拒绝未授权的结束拍卖调用", async function () {
      await ethers.provider.send("evm_increaseTime", [DURATION + 100]);
      await ethers.provider.send("evm_mine");

      await expect(auction.connect(bidder1).endAuction())
        .to.be.revertedWith("Not authorized");
    });
  });

  describe("取消拍卖", function () {
    it("卖家应该能够取消无人出价的拍卖", async function () {
      const startTime = Math.floor(Date.now() / 1000) - 100;
      const auctionConfig = {
        seller: seller.address,
        nftContract: await mockERC721.getAddress(),
        tokenId: TOKEN_ID,
        paymentToken: ethers.ZeroAddress,
        startPrice: START_PRICE_ETH,
        usdStartPrice: START_PRICE_USD,
        startTime: startTime,
        duration: DURATION,
        minBidIncrement: MIN_BID_INCREMENT
      };

      await ethers.provider.send("evm_increaseTime", [100]);

      await mockERC721.connect(seller).transferFrom(seller, await auction.getAddress(), TOKEN_ID);

      await auction.initialize(auctionConfig);

      await expect(auction.connect(seller).cancelAuction())
        .to.emit(auction, "AuctionCanceled");
    });

    it("应该拒绝有出价后取消拍卖", async function () {
      const startTime = Math.floor(Date.now() / 1000) - 100;
      const auctionConfig = {
        seller: seller.address,
        nftContract: await mockERC721.getAddress(),
        tokenId: TOKEN_ID,
        paymentToken: ethers.ZeroAddress,
        startPrice: START_PRICE_ETH,
        usdStartPrice: START_PRICE_USD,
        startTime: startTime,
        duration: DURATION,
        minBidIncrement: MIN_BID_INCREMENT
      };

      await ethers.provider.send("evm_increaseTime", [100]);

      await mockERC721.connect(seller).transferFrom(seller, await auction.getAddress(), TOKEN_ID);
      await auction.initialize(auctionConfig);
      await auction.connect(seller).setPriceFeed(ethers.ZeroAddress, await mockEthPriceFeed.getAddress());

      // 出价
      await auction.connect(bidder1).placeBid(0, { value: START_PRICE_ETH });

      await expect(auction.connect(seller).cancelAuction())
        .to.be.revertedWith("Bids already placed");
    });
  });
});
