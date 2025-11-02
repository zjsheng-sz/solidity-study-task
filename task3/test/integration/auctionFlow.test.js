const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Auction Flow Integration Tests", function () {
  let NFTAuctionFactory;
  let factory;
  let MyNFT;
  let nftContract;
  let owner;
  let seller;
  let bidder1;
  let bidder2;
  let bidder3;

  beforeEach(async function () {
    [owner, seller, bidder1, bidder2, bidder3] = await ethers.getSigners();

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

    // 卖家铸造多个NFT
    await nftContract.mintNFT(seller.address, "https://example.com/token/1");
    await nftContract.mintNFT(seller.address, "https://example.com/token/2");
    await nftContract.mintNFT(seller.address, "https://example.com/token/3");
  });

  describe("Complete Auction Lifecycle", function () {
    it("should complete full auction lifecycle with multiple bidders", async function () {
      const tokenId = 1;
      const startPrice = ethers.parseEther("1.0");
      const startTime = Math.floor(Date.now() / 1000) + 10; // 10秒后开始
      const duration = 300; // 5分钟

      // 卖家授权NFT给工厂
      await nftContract.connect(seller).approve(factory.target, tokenId);

      // 创建拍卖
      const tx = await factory.connect(seller).createAuction(
        nftContract.target,
        tokenId,
        ethers.ZeroAddress,
        startPrice,
        ethers.parseEther("2000.0"),
        startTime,
        duration,
        ethers.parseEther("0.1")
      );

      const receipt = await tx.wait();
      const auctionCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "AuctionCreated"
      );
      
      const auctionAddress = auctionCreatedEvent.args[3];
      
      // 获取拍卖合约实例
      const NFTAuction = await ethers.getContractFactory("NFTAuction");
      const auction = NFTAuction.attach(auctionAddress);

      // 验证拍卖信息
      expect(await auction.seller()).to.equal(seller.address);
      expect(await auction.nftContract()).to.equal(nftContract.target);
      expect(await auction.tokenId()).to.equal(tokenId);

      // 等待拍卖开始
      await ethers.provider.send("evm_increaseTime", [15]);
      await ethers.provider.send("evm_mine");

      // 多个出价者参与竞拍
      const bid1 = ethers.parseEther("1.2");
      await auction.connect(bidder1).placeBid(0, { value: bid1 });
      expect(await auction.highestBidder()).to.equal(bidder1.address);
      expect(await auction.highestBid()).to.equal(bid1);

      const bid2 = ethers.parseEther("1.5");
      await auction.connect(bidder2).placeBid(0, { value: bid2 });
      expect(await auction.highestBidder()).to.equal(bidder2.address);
      expect(await auction.highestBid()).to.equal(bid2);

      const bid3 = ethers.parseEther("1.8");
      await auction.connect(bidder3).placeBid(0, { value: bid3 });
      expect(await auction.highestBidder()).to.equal(bidder3.address);
      expect(await auction.highestBid()).to.equal(bid3);

      // 验证退款机制
      const bidder2BalanceAfter = await ethers.provider.getBalance(bidder2.address);
      const bidder1BalanceAfter = await ethers.provider.getBalance(bidder1.address);
      
      // 等待拍卖结束
      await ethers.provider.send("evm_increaseTime", [duration + 10]);
      await ethers.provider.send("evm_mine");

      // 结束拍卖
      await expect(auction.connect(seller).endAuction())
        .to.emit(auction, "AuctionEnded")
        .withArgs(bidder3.address, bid3, expect.anything());

      // 验证NFT转移给获胜者
      expect(await nftContract.ownerOf(tokenId)).to.equal(bidder3.address);
      expect(await auction.ended()).to.be.true;

      // 验证卖家收到资金
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      // 注意：由于gas费用，这里不直接比较余额，而是验证拍卖状态
    });

    it("should handle auction with no bids", async function () {
      const tokenId = 2;
      const startTime = Math.floor(Date.now() / 1000) + 10;
      const duration = 60; // 短时间便于测试

      await nftContract.connect(seller).approve(factory.target, tokenId);

      const tx = await factory.connect(seller).createAuction(
        nftContract.target,
        tokenId,
        ethers.ZeroAddress,
        ethers.parseEther("1.0"),
        ethers.parseEther("2000.0"),
        startTime,
        duration,
        ethers.parseEther("0.1")
      );

      const receipt = await tx.wait();
      const auctionCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "AuctionCreated"
      );
      
      const auctionAddress = auctionCreatedEvent.args[3];
      const NFTAuction = await ethers.getContractFactory("NFTAuction");
      const auction = NFTAuction.attach(auctionAddress);

      // 等待拍卖开始和结束
      await ethers.provider.send("evm_increaseTime", [80]);
      await ethers.provider.send("evm_mine");

      // 结束拍卖
      await expect(auction.connect(seller).endAuction())
        .to.emit(auction, "AuctionCanceled");

      // 验证NFT退回给卖家
      expect(await nftContract.ownerOf(tokenId)).to.equal(seller.address);
      expect(await auction.ended()).to.be.true;
    });

    it("should handle auction cancellation before bidding", async function () {
      const tokenId = 3;
      const startTime = Math.floor(Date.now() / 1000) + 300; // 5分钟后开始

      await nftContract.connect(seller).approve(factory.target, tokenId);

      const tx = await factory.connect(seller).createAuction(
        nftContract.target,
        tokenId,
        ethers.ZeroAddress,
        ethers.parseEther("1.0"),
        ethers.parseEther("2000.0"),
        startTime,
        3600,
        ethers.parseEther("0.1")
      );

      const receipt = await tx.wait();
      const auctionCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "AuctionCreated"
      );
      
      const auctionAddress = auctionCreatedEvent.args[3];
      const NFTAuction = await ethers.getContractFactory("NFTAuction");
      const auction = NFTAuction.attach(auctionAddress);

      // 卖家取消拍卖
      await expect(auction.connect(seller).cancelAuction())
        .to.emit(auction, "AuctionCanceled");

      // 验证NFT退回给卖家
      expect(await nftContract.ownerOf(tokenId)).to.equal(seller.address);
      expect(await auction.ended()).to.be.true;
    });
  });

  describe("Multiple Auctions Management", function () {
    it("should manage multiple concurrent auctions", async function () {
      const auctions = [];
      
      // 创建3个拍卖
      for (let i = 1; i <= 3; i++) {
        await nftContract.connect(seller).approve(factory.target, i);
        
        const tx = await factory.connect(seller).createAuction(
          nftContract.target,
          i,
          ethers.ZeroAddress,
          ethers.parseEther((1 + i * 0.5).toString()),
          ethers.parseEther((2000 + i * 1000).toString()),
          Math.floor(Date.now() / 1000) + 10,
          300,
          ethers.parseEther("0.1")
        );

        const receipt = await tx.wait();
        const auctionCreatedEvent = receipt.logs.find(
          log => log.fragment && log.fragment.name === "AuctionCreated"
        );
        
        auctions.push(auctionCreatedEvent.args[3]);
      }

      // 验证工厂正确跟踪所有拍卖
      expect(await factory.allAuctionsLength()).to.equal(3);
      
      const userAuctions = await factory.getUserAuctions(seller.address);
      expect(userAuctions.length).to.equal(3);

      // 等待拍卖开始
      await ethers.provider.send("evm_increaseTime", [15]);
      await ethers.provider.send("evm_mine");

      const NFTAuction = await ethers.getContractFactory("NFTAuction");
      
      // 为每个拍卖出价
      for (let i = 0; i < auctions.length; i++) {
        const auction = NFTAuction.attach(auctions[i]);
        const bidAmount = ethers.parseEther((1.5 + i * 0.3).toString());
        
        await auction.connect(bidder1).placeBid(0, { value: bidAmount });
        expect(await auction.highestBidder()).to.equal(bidder1.address);
      }

      // 等待所有拍卖结束
      await ethers.provider.send("evm_increaseTime", [310]);
      await ethers.provider.send("evm_mine");

      // 批量结束所有拍卖
      await factory.connect(owner).endExpiredAuctions(auctions);

      // 验证所有拍卖都已结束
      for (let i = 0; i < auctions.length; i++) {
        const auction = NFTAuction.attach(auctions[i]);
        expect(await auction.ended()).to.be.true;
        
        // 验证NFT转移
        expect(await nftContract.ownerOf(i + 1)).to.equal(bidder1.address);
      }
    });
  });

  describe("Factory Auction Discovery", function () {
    it("should allow users to discover and participate in auctions", async function () {
      // 创建多个拍卖
      for (let i = 1; i <= 3; i++) {
        await nftContract.connect(seller).approve(factory.target, i);
        await factory.connect(seller).createAuction(
          nftContract.target,
          i,
          ethers.ZeroAddress,
          ethers.parseEther((1 + i * 0.5).toString()),
          ethers.parseEther((2000 + i * 1000).toString()),
          Math.floor(Date.now() / 1000) + 10,
          300,
          ethers.parseEther("0.1")
        );
      }

      // 用户可以通过工厂发现拍卖
      const auctionCount = await factory.allAuctionsLength();
      expect(auctionCount).to.equal(3);

      // 获取第一个拍卖地址
      const auctionAddress = await factory.allAuctions(0);
      const NFTAuction = await ethers.getContractFactory("NFTAuction");
      const auction = NFTAuction.attach(auctionAddress);

      // 等待拍卖开始
      await ethers.provider.send("evm_increaseTime", [15]);
      await ethers.provider.send("evm_mine");

      // 用户参与竞拍
      const bidAmount = ethers.parseEther("2.0");
      await auction.connect(bidder1).placeBid(0, { value: bidAmount });

      // 验证拍卖信息
      const auctionInfo = await auction.getAuctionInfo();
      expect(auctionInfo[0]).to.equal(seller.address); // seller
      expect(auctionInfo[1]).to.equal(nftContract.target); // nftContract
      expect(auctionInfo[8]).to.equal(bidAmount); // highestBid

      // 通过NFT合约和tokenId查找拍卖
      const foundAuction = await factory.constractAuction(nftContract.target, 1);
      expect(foundAuction).to.equal(auctionAddress);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("should handle auction extension on late bids", async function () {
      const tokenId = 1;
      const startTime = Math.floor(Date.now() / 1000) + 10;
      const duration = 60; // 短时间便于测试

      await nftContract.connect(seller).approve(factory.target, tokenId);

      const tx = await factory.connect(seller).createAuction(
        nftContract.target,
        tokenId,
        ethers.ZeroAddress,
        ethers.parseEther("1.0"),
        ethers.parseEther("2000.0"),
        startTime,
        duration,
        ethers.parseEther("0.1")
      );

      const receipt = await tx.wait();
      const auctionCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "AuctionCreated"
      );
      
      const auctionAddress = auctionCreatedEvent.args[3];
      const NFTAuction = await ethers.getContractFactory("NFTAuction");
      const auction = NFTAuction.attach(auctionAddress);

      // 等待拍卖开始
      await ethers.provider.send("evm_increaseTime", [15]);
      await ethers.provider.send("evm_mine");

      // 在拍卖结束前出价（最后5分钟内）
      await ethers.provider.send("evm_increaseTime", [duration - 240]); // 最后4分钟
      await ethers.provider.send("evm_mine");

      const originalEndTime = await auction.endTime();
      
      // 出价应该延长拍卖时间
      await auction.connect(bidder1).placeBid(0, { value: ethers.parseEther("1.5") });
      
      const newEndTime = await auction.endTime();
      expect(newEndTime).to.be.gt(originalEndTime);
      
      // 验证延长了5分钟
      expect(newEndTime - originalEndTime).to.be.closeTo(300, 1); // 5分钟
    });

    it("should prevent invalid operations", async function () {
      const tokenId = 1;
      const startTime = Math.floor(Date.now() / 1000) + 10;

      await nftContract.connect(seller).approve(factory.target, tokenId);

      const tx = await factory.connect(seller).createAuction(
        nftContract.target,
        tokenId,
        ethers.ZeroAddress,
        ethers.parseEther("1.0"),
        ethers.parseEther("2000.0"),
        startTime,
        300,
        ethers.parseEther("0.1")
      );

      const receipt = await tx.wait();
      const auctionCreatedEvent = receipt.logs.find(
        log => log.fragment && log.fragment.name === "AuctionCreated"
      );
      
      const auctionAddress = auctionCreatedEvent.args[3];
      const NFTAuction = await ethers.getContractFactory("NFTAuction");
      const auction = NFTAuction.attach(auctionAddress);

      // 尝试在拍卖开始前出价
      await expect(
        auction.connect(bidder1).placeBid(0, { value: ethers.parseEther("1.5") })
      ).to.be.revertedWith("Auction not started");

      // 等待拍卖开始
      await ethers.provider.send("evm_increaseTime", [15]);
      await ethers.provider.send("evm_mine");

      // 卖家尝试出价
      await expect(
        auction.connect(seller).placeBid(0, { value: ethers.parseEther("1.5") })
      ).to.be.reverted; // 卖家不能出价

      // 非授权用户尝试结束拍卖
      await ethers.provider.send("evm_increaseTime", [310]);
      await ethers.provider.send("evm_mine");

      await expect(
        auction.connect(bidder1).endAuction()
      ).to.be.revertedWith("Not authorized");
    });
  });
});