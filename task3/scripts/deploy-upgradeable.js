const { ethers, upgrades } = require('hardhat');

// 部署可升级合约的脚本
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 部署 MyNFT 合约（不可升级）
  const MyNFT = await ethers.getContractFactory("MyNFT");
  const myNFT = await MyNFT.deploy();
  await myNFT.deployed();
  console.log("MyNFT deployed to:", myNFT.address);

  // 部署 NFTAuctionFactory 可升级合约
  const NFTAuctionFactory = await ethers.getContractFactory("NFTAuctionFactory");
  const factory = await upgrades.deployProxy(NFTAuctionFactory, [], {
    initializer: "initialize",
    kind: "uups"
  });
  await factory.deployed();
  console.log("NFTAuctionFactory deployed to:", factory.address);


  // 获取代理合约的实现地址
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(factory.address);
  console.log("NFTAuctionFactory implementation address:", implementationAddress);

  // 保存部署信息
  const deploymentInfo = {
    myNFT: myNFT.address,
    factory: factory.address,
    factoryImplementation: implementationAddress,
    network: network.name,
    deployer: deployer.address
  };
  
  // 写入文件以便前端使用
  const fs = require('fs');
  fs.writeFileSync('deployment-upgradeable.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to deployment-upgradeable.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});