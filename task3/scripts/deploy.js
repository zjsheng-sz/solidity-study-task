const { ethers } = require('hardhat');

// scripts/deploy.js
async function main() {
  const [deployer] = await ethers.getSigners();

  // 部署MyNFT合约
  const MyNFT = await ethers.getContractFactory("MyNFT");
  const myNFT = await MyNFT.deploy();
  console.log("MyNFT deployed to:", myNFT.address);

  // 部署工厂合约
  const NFTAuctionFactory = await ethers.getContractFactory("NFTAuctionFactory");
  const factory = await NFTAuctionFactory.deploy();
  console.log("NFTAuctionFactory deployed to:", factory.address);

  // 保存部署信息
  const deploymentInfo = {
    myNFT: myNFT.address,
    factory: factory.address,
    network: network.name
  };
  
  // 写入文件以便前端使用
  const fs = require('fs');
  fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});