// test/NFTAuctionFactory.js
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("NFTAuctionFactory", function () {
  let factory;
  let nftContract;
  let paymentToken;
  let owner, seller, bidder1, bidder2;

  const TOKEN_ID = 0;
  const START_PRICE = ethers.parseEther("0.01");
  const USD_START_PRICE = ethers.parseEther("30.0");
  const START_TIME = Math.floor(Date.now() / 1000) + 3600; // 1小时后开始
  const DURATION = 86400; // 24小时
  const MIN_BID_INCREMENT = ethers.parseEther("0.001");

  // 部署 fixture 函数
  async function deployContractsFixture() {
    [owner, seller, bidder1, bidder2] = await ethers.getSigners();

    // 部署工厂合约
    const Factory = await ethers.getContractFactory("NFTAuctionFactory");
    factory = await upgrades.deployProxy(Factory, [], {
      initializer: "initialize",
    });
    await factory.waitForDeployment();

    // 部署测试NFT合约
    const MockNFT = await ethers.getContractFactory("MockERC721");
    nftContract = await MockNFT.deploy("Test NFT", "TNFT");
    await nftContract.waitForDeployment();

    // 部署测试ERC20代币作为支付代币
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    paymentToken = await MockERC20.deploy("Test Token", "TTK", 18);
    await paymentToken.waitForDeployment();

    // 给卖家铸造NFT
    await nftContract.mint(seller.address, TOKEN_ID);
    await nftContract.connect(seller).approve(await factory.getAddress(), TOKEN_ID);

    // 给投标人分配测试代币
    await paymentToken.mint(bidder1.address, ethers.parseEther("100"));
    await paymentToken.mint(bidder2.address, ethers.parseEther("100"));

    return { factory, nftContract, paymentToken, owner, seller, bidder1, bidder2 };
  }

  beforeEach(async function () {
    ({ factory, nftContract, paymentToken, owner, seller, bidder1, bidder2 } =
      await loadFixture(deployContractsFixture));
  });

  describe("部署和初始化", function () {
    it("应该正确初始化合约", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("应该实现UUPS升级模式", async function () {
      // 部署新版本实现合约
      const FactoryV2 = await ethers.getContractFactory("NFTAuctionFactoryV2");
      const factoryV2 = await upgrades.upgradeProxy(await factory.getAddress(), FactoryV2);
      await factoryV2.waitForDeployment();

      // 验证升级成功
      expect(await factoryV2.getVersion()).to.equal("v2.0");
    });
  });

  describe("创建拍卖", function () {
    it("应该成功创建新的拍卖", async function () {
      const tx = await factory.connect(seller).createAuction(
        await nftContract.getAddress(),
        TOKEN_ID,
        await paymentToken.getAddress(),
        START_PRICE,
        USD_START_PRICE,
        START_TIME,
        DURATION,
        MIN_BID_INCREMENT
      );

      // 验证事件发射
      await expect(tx)
        .to.emit(factory, "AuctionCreated")
        .withArgs(
          seller.address,
          await nftContract.getAddress(),
          TOKEN_ID,
          (addr) => addr !== ethers.ZeroAddress, // auctionAddress
          BigInt(0) // auctionId
        );

      // 验证拍卖地址已记录
      const auctionAddress = await factory.constractAuction(await nftContract.getAddress(), TOKEN_ID);
      expect(auctionAddress).to.not.equal(ethers.ZeroAddress);

      // 验证拍卖已添加到所有拍卖列表
      expect(await factory.allAuctionsLength()).to.equal(1);
      expect(await factory.allAuctions(0)).to.equal(auctionAddress);

      // 验证用户拍卖列表
      const userAuctions = await factory.getUserAuctions(seller.address);
      expect(userAuctions).to.have.lengthOf(1);
      expect(userAuctions[0]).to.equal(auctionAddress);

      // 验证用户拍卖数量
      expect(await factory.getUserAuctionCount(seller.address)).to.equal(1);
    });

    it("应该防止重复创建同一NFT的拍卖", async function () {
      await factory.connect(seller).createAuction(
        await nftContract.getAddress(),
        TOKEN_ID,
        await paymentToken.getAddress(),
        START_PRICE,
        USD_START_PRICE,
        START_TIME,
        DURATION,
        MIN_BID_INCREMENT
      );

      await expect(
        factory.connect(seller).createAuction(
          await nftContract.getAddress(),
          TOKEN_ID,
          await paymentToken.getAddress(),
          START_PRICE,
          USD_START_PRICE,
          START_TIME,
          DURATION,
          MIN_BID_INCREMENT
        )
      ).to.be.revertedWith("Auction exists");
    });

    it("应该防止使用零地址NFT合约", async function () {
      await expect(
        factory.connect(seller).createAuction(
          ethers.ZeroAddress,
          TOKEN_ID,
          await paymentToken.getAddress(),
          START_PRICE,
          USD_START_PRICE,
          START_TIME,
          DURATION,
          MIN_BID_INCREMENT
        )
      ).to.be.revertedWith("Invalid NFT contract");
    });

    it("应该防止设置过去的时间作为开始时间", async function () {
      const pastTime = (await time.latest()) - 3600;

      await expect(
        factory.connect(seller).createAuction(
          await nftContract.getAddress(),
          TOKEN_ID,
          await paymentToken.getAddress(),
          START_PRICE,
          USD_START_PRICE,
          pastTime,
          DURATION,
          MIN_BID_INCREMENT
        )
      ).to.be.revertedWith("startTime must be future");
    });

    it("应该防止设置零持续时间", async function () {
      await expect(
        factory.connect(seller).createAuction(
          await nftContract.getAddress(),
          TOKEN_ID,
          await paymentToken.getAddress(),
          START_PRICE,
          USD_START_PRICE,
          START_TIME,
          0, // 零持续时间
          MIN_BID_INCREMENT
        )
      ).to.be.revertedWith("Invalid duration");
    });

    it("应该为不同用户创建独立的拍卖列表", async function () {
      // 卖家创建拍卖
      await factory.connect(seller).createAuction(
        await nftContract.getAddress(),
        TOKEN_ID,
        await paymentToken.getAddress(),
        START_PRICE,
        USD_START_PRICE,
        START_TIME,
        DURATION,
        MIN_BID_INCREMENT
      );

      // 验证卖家有1个拍卖，其他用户有0个
      expect(await factory.getUserAuctionCount(seller.address)).to.equal(1);
      expect(await factory.getUserAuctionCount(owner.address)).to.equal(0);
      expect(await factory.getUserAuctionCount(bidder1.address)).to.equal(0);
    });
  });

  describe("拍卖查询功能", function () {
    let auctionAddress1, auctionAddress2;

    beforeEach(async function () {
      // 创建第一个拍卖
      const tx1 = await factory.connect(seller).createAuction(
        await nftContract.getAddress(),
        TOKEN_ID,
        await paymentToken.getAddress(),
        START_PRICE,
        USD_START_PRICE,
        START_TIME,
        DURATION,
        MIN_BID_INCREMENT
      );
      const receipt1 = await tx1.wait();
      auctionAddress1 = await factory.constractAuction(await nftContract.getAddress(), TOKEN_ID);

      // 创建第二个NFT和拍卖
      await nftContract.mint(seller.address, 2);
      await nftContract.connect(seller).approve(await factory.getAddress(), 2);

      const tx2 = await factory.connect(seller).createAuction(
        await nftContract.getAddress(),
        2,
        await paymentToken.getAddress(),
        START_PRICE,
        USD_START_PRICE,
        START_TIME + 3600,
        DURATION,
        MIN_BID_INCREMENT
      );
      const receipt2 = await tx2.wait();
      auctionAddress2 = await factory.constractAuction(await nftContract.getAddress(), 2);
    });

    it("应该正确返回所有拍卖数量", async function () {
      expect(await factory.allAuctionsLength()).to.equal(2);
    });

    it("应该正确返回特定索引的拍卖地址", async function () {
      expect(await factory.allAuctions(0)).to.equal(auctionAddress1);
      expect(await factory.allAuctions(1)).to.equal(auctionAddress2);
    });

    it("应该正确返回用户的拍卖列表", async function () {
      const userAuctions = await factory.getUserAuctions(seller.address);
      expect(userAuctions).to.have.lengthOf(2);
      expect(userAuctions[0]).to.equal(auctionAddress1);
      expect(userAuctions[1]).to.equal(auctionAddress2);
    });

    it("应该正确返回用户的拍卖数量", async function () {
      expect(await factory.getUserAuctionCount(seller.address)).to.equal(2);
    });

    it("应该正确通过NFT合约和tokenId查询拍卖地址", async function () {
      const address1 = await factory.constractAuction(await nftContract.getAddress(), TOKEN_ID);
      const address2 = await factory.constractAuction(await nftContract.getAddress(), 2);

      expect(address1).to.equal(auctionAddress1);
      expect(address2).to.equal(auctionAddress2);
      expect(address1).to.not.equal(address2);
    });
  });

  describe("批量结束过期拍卖", function () {
    let auctionAddress1, auctionAddress2;

    beforeEach(async function () {
      // 创建两个拍卖
      await factory.connect(seller).createAuction(
        await nftContract.getAddress(),
        TOKEN_ID,
        await paymentToken.getAddress(),
        START_PRICE,
        USD_START_PRICE,
        START_TIME,
        DURATION,
        MIN_BID_INCREMENT
      );
      auctionAddress1 = await factory.constractAuction(await nftContract.getAddress(), TOKEN_ID);

      await nftContract.mint(seller.address, 2);
      await nftContract.connect(seller).approve(await factory.getAddress(), 2);

      await factory.connect(seller).createAuction(
        await nftContract.getAddress(),
        2,
        await paymentToken.getAddress(),
        START_PRICE,
        USD_START_PRICE,
        START_TIME,
        DURATION,
        MIN_BID_INCREMENT
      );
      auctionAddress2 = await factory.constractAuction(await nftContract.getAddress(), 2);
    });

    it("应该处理空拍卖列表", async function () {
      await expect(factory.endExpiredAuctions([])).to.not.be.reverted;
    });


    it("应该正常处理有效的拍卖地址", async function () {
      // 这个测试需要NFTAuction合约的实现
      // 这里主要测试工厂函数不会回滚
      await expect(
        factory.endExpiredAuctions([auctionAddress1, auctionAddress2])
      ).to.not.be.reverted;
    });
  });

  describe("边界情况测试", function () {
    it("应该处理大量拍卖的创建和查询", async function () {
      const NUM_AUCTIONS = 5;

      for (let i = 1; i <= NUM_AUCTIONS; i++) {
        await nftContract.mint(seller.address, i);
        await nftContract.connect(seller).approve(await factory.getAddress(), i);

        await factory.connect(seller).createAuction(
          await nftContract.getAddress(),
          i,
          await paymentToken.getAddress(),
          START_PRICE,
          USD_START_PRICE,
          START_TIME + i * 3600,
          DURATION,
          MIN_BID_INCREMENT
        );
      }

      expect(await factory.allAuctionsLength()).to.equal(NUM_AUCTIONS);
      expect(await factory.getUserAuctionCount(seller.address)).to.equal(NUM_AUCTIONS);
    });

    it("应该正确处理不存在的拍卖查询", async function () {
      // 查询不存在的NFT拍卖
      const nonExistentAddress = await factory.constractAuction(await nftContract.getAddress(), 999);
      expect(nonExistentAddress).to.equal(ethers.ZeroAddress);

      // 查询不存在的用户拍卖
      const userAuctions = await factory.getUserAuctions(bidder1.address);
      expect(userAuctions).to.have.lengthOf(0);
      expect(await factory.getUserAuctionCount(bidder1.address)).to.equal(0);
    });

    it("应该允许使用零地址作为支付代币（表示原生代币）", async function () {
      await expect(
        factory.connect(seller).createAuction(
          await nftContract.getAddress(),
          TOKEN_ID,
          ethers.ZeroAddress, // 使用原生代币
          START_PRICE,
          USD_START_PRICE,
          START_TIME,
          DURATION,
          MIN_BID_INCREMENT
        )
      ).to.emit(factory, "AuctionCreated");
    });
  });
});
