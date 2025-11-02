const { ethers } = require('hardhat');

// scripts/deploy.js
async function main() {
  const [deployer] = await ethers.getSigners();

  // 部署MyNFT合约
  const MyNFT = await ethers.getContractFactory("MyNFT");
  const myNFT = await MyNFT.deploy();
  await myNFT.waitForDeployment(); // 等待部署完成
  const myNFTAddress = await myNFT.getAddress();
  console.log("MyNFT deployed to:", myNFTAddress);

  // 部署工厂合约
  const NFTAuctionFactory = await ethers.getContractFactory("NFTAuctionFactory");
  const factory = await NFTAuctionFactory.deploy();
  await factory.waitForDeployment(); // 等待部署完成
  const factoryAddress = await factory.getAddress();
  console.log("NFTAuctionFactory deployed to:", factoryAddress);

  // 保存部署信息
  const deploymentInfo = {
    myNFT: myNFTAddress,
    factory: factoryAddress,
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