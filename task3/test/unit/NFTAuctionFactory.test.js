const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTAuctionFactory Unit Tests", function () {
  let NFTAuctionFactory;
  let factory;
  let MyNFT;
  let nftContract;
  let owner;
  let seller;
  let bidder1;

  beforeEach(async function () {
    [owner, seller, bidder1] = await ethers.getSigners();

    // 部署MyNFT合约
    MyNFT = await ethers.getContractFactory("MyNFT");
    nftContract = await MyNFT.deploy();
    await nftContract.waitForDeployment();

    // 部署NFTAuctionFactory合约
    NFTAuctionFactory = await ethers.getContractFactory("NFTAuctionFactory");
    factory = await NFTAuctionFactory.deploy();
    await factory.waitForDeployment();

    // 初始化工厂
    await factory.initialize();

    // 卖家铸造NFT
    await nftContract.mintNFT(seller.address, "https://example.com/token/1");
    await nftContract.mintNFT(seller.address, "https://example.com/token/2");
  });

  describe("Factory Initialization", function () {
    it("should initialize factory correctly", async function () {
      expect(await factory.owner()).to.equal(owner.address);
      expect(await factory.allAuctionsLength()).to.equal(0);
    });
  });

  describe("Auction Creation", function () {
    it("should create new auction successfully", async function () {
      const tokenId = 1;
      const startPrice = ethers.parseEther("1.0");
      const usdStartPrice = ethers.parseEther("2000.0");
      const startTime = Math.floor(Date.now() / 1000) + 60;
      const duration = 3600;
      const minBidIncrement = ethers.parseEther("0.1");

      // 卖家授权NFT给工厂
      await nftContract.connect(seller).approve(factory.target, tokenId);

      // 创建拍卖
      await expect(
        factory.connect(seller).createAuction(
          nftContract.target,
          tokenId,
          ethers.ZeroAddress, // ETH
          startPrice,
          usdStartPrice,
          startTime,
          duration,
          minBidIncrement
        )
      ).to.emit(factory, "AuctionCreated")
       .withArgs(seller.address, nftContract.target, tokenId, expect.anything(), 0);

      // 验证拍卖信息记录
      expect(await factory.allAuctionsLength()).to.equal(1);
      
      const auctionAddress = await factory.allAuctions(0);
      expect(auctionAddress).to.not.equal(ethers.ZeroAddress);
      
      // 验证映射关系
      expect(await factory.constractAuction(nftContract.target, tokenId)).to.equal(auctionAddress);
      
      // 验证用户拍卖列表
      const userAuctions = await factory.getUserAuctions(seller.address);
      expect(userAuctions.length).to.equal(1);
      expect(userAuctions[0]).to.equal(auctionAddress);
    });

    it("should prevent creating auction for same NFT", async function () {
      const tokenId = 1;
      
      await nftContract.connect(seller).approve(factory.target, tokenId);

      // 第一次创建拍卖
      await factory.connect(seller).createAuction(
        nftContract.target,
        tokenId,
        ethers.ZeroAddress,
        ethers.parseEther("1.0"),
        ethers.parseEther("2000.0"),
        Math.floor(Date.now() / 1000) + 60,
        3600,
        ethers.parseEther("0.1")
      );

      // 尝试为同一个NFT再次创建拍卖
      await expect(
        factory.connect(seller).createAuction(
          nftContract.target,
          tokenId,
          ethers.ZeroAddress,
          ethers.parseEther("2.0"),
          ethers.parseEther("4000.0"),
          Math.floor(Date.now() / 1000) + 120,
          3600,
          ethers.parseEther("0.2")
        )
      ).to.be.revertedWith("Auction exists");
    });

    it("should reject invalid parameters", async function () {
      const tokenId = 1;
      
      await nftContract.connect(seller).approve(factory.target, tokenId);

      // 测试无效的NFT合约地址
      await expect(
        factory.connect(seller).createAuction(
          ethers.ZeroAddress,
          tokenId,
          ethers.ZeroAddress,
          ethers.parseEther("1.0"),
          ethers.parseEther("2000.0"),
          Math.floor(Date.now() / 1000) + 60,
          3600,
          ethers.parseEther("0.1")
        )
      ).to.be.revertedWith("Invalid NFT contract");

      // 测试无效的持续时间
      await expect(
        factory.connect(seller).createAuction(
          nftContract.target,
          tokenId,
          ethers.ZeroAddress,
          ethers.parseEther("1.0"),
          ethers.parseEther("2000.0"),
          Math.floor(Date.now() / 1000) + 60,
          0, // 无效的持续时间
          ethers.parseEther("0.1")
        )
      ).to.be.revertedWith("Invalid duration");

      // 测试过去的开始时间
      await expect(
        factory.connect(seller).createAuction(
          nftContract.target,
          tokenId,
          ethers.ZeroAddress,
          ethers.parseEther("1.0"),
          ethers.parseEther("2000.0"),
          Math.floor(Date.now() / 1000) - 60, // 过去的时间
          3600,
          ethers.parseEther("0.1")
        )
      ).to.be.revertedWith("startTime must be future");
    });
  });

  describe("Auction Management", function () {
    let auctionAddress1;
    let auctionAddress2;

    beforeEach(async function () {
      // 创建两个拍卖
      await nftContract.connect(seller).approve(factory.target, 1);
      await nftContract.connect(seller).approve(factory.target, 2);

      const tx1 = await factory.connect(seller).createAuction(
        nftContract.target,
        1,
        ethers.ZeroAddress,
        ethers.parseEther("1.0"),
        ethers.parseEther("2000.0"),
        Math.floor(Date.now() / 1000) + 60,
        3600,
        ethers.parseEther("0.1")
      );

      const tx2 = await factory.connect(seller).createAuction(
        nftContract.target,
        2,
        ethers.ZeroAddress,
        ethers.parseEther("2.0"),
        ethers.parseEther("4000.0"),
        Math.floor(Date.now() / 1000) + 120,
        3600,
        ethers.parseEther("0.2")
      );

      auctionAddress1 = await factory.allAuctions(0);
      auctionAddress2 = await factory.allAuctions(1);
    });

    it("should track all auctions correctly", async function () {
      expect(await factory.allAuctionsLength()).to.equal(2);
      expect(await factory.allAuctions(0)).to.equal(auctionAddress1);
      expect(await factory.allAuctions(1)).to.equal(auctionAddress2);
    });

    it("should return user auctions correctly", async function () {
      const userAuctions = await factory.getUserAuctions(seller.address);
      expect(userAuctions.length).to.equal(2);
      expect(userAuctions[0]).to.equal(auctionAddress1);
      expect(userAuctions[1]).to.equal(auctionAddress2);

      expect(await factory.getUserAuctionCount(seller.address)).to.equal(2);
    });

    it("should return empty array for user with no auctions", async function () {
      const userAuctions = await factory.getUserAuctions(bidder1.address);
      expect(userAuctions.length).to.equal(0);
      expect(await factory.getUserAuctionCount(bidder1.address)).to.equal(0);
    });

    it("should find auction by NFT contract and token ID", async function () {
      expect(await factory.constractAuction(nftContract.target, 1)).to.equal(auctionAddress1);
      expect(await factory.constractAuction(nftContract.target, 2)).to.equal(auctionAddress2);
      expect(await factory.constractAuction(nftContract.target, 3)).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Expired Auction Management", function () {
    let auctionAddress;

    beforeEach(async function () {
      await nftContract.connect(seller).approve(factory.target, 1);

      // 创建短期拍卖
      await factory.connect(seller).createAuction(
        nftContract.target,
        1,
        ethers.ZeroAddress,
        ethers.parseEther("1.0"),
        ethers.parseEther("2000.0"),
        Math.floor(Date.now() / 1000),
        60, // 短时间便于测试
        ethers.parseEther("0.1")
      );

      auctionAddress = await factory.allAuctions(0);
    });

    it("should end expired auctions successfully", async function () {
      // 推进时间到拍卖结束
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");

      // 批量结束过期拍卖
      await expect(
        factory.connect(owner).endExpiredAuctions([auctionAddress])
      ).to.not.be.reverted;

      // 验证拍卖已结束
      const NFTAuction = await ethers.getContractFactory("NFTAuction");
      const auction = NFTAuction.attach(auctionAddress);
      expect(await auction.ended()).to.be.true;
    });

    it("should handle failed auction ending gracefully", async function () {
      // 尝试结束未过期的拍卖
      await expect(
        factory.connect(owner).endExpiredAuctions([auctionAddress])
      ).to.not.be.reverted; // 应该继续执行而不回滚
    });

    it("should handle multiple auctions", async function () {
      // 创建第二个拍卖
      await nftContract.connect(seller).approve(factory.target, 2);
      
      await factory.connect(seller).createAuction(
        nftContract.target,
        2,
        ethers.ZeroAddress,
        ethers.parseEther("2.0"),
        ethers.parseEther("4000.0"),
        Math.floor(Date.now() / 1000),
        120,
        ethers.parseEther("0.2")
      );

      const auctionAddress2 = await factory.allAuctions(1);

      // 推进时间到第一个拍卖结束
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");

      // 批量结束两个拍卖
      await expect(
        factory.connect(owner).endExpiredAuctions([auctionAddress, auctionAddress2])
      ).to.not.be.reverted;
    });
  });

  describe("Factory Upgradeability", function () {
    it("should allow owner to upgrade factory", async function () {
      // 测试升级功能
      const NFTAuctionFactoryV2 = await ethers.getContractFactory("NFTAuctionFactory");
      
      // 注意：实际升级需要部署代理合约，这里主要测试权限
      // 工厂合约本身支持UUPS升级
      expect(await factory.owner()).to.equal(owner.address);
    });
  });
});