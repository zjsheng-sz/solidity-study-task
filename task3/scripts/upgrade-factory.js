const { ethers, upgrades } = require('hardhat');

// 升级工厂合约的脚本
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading factory contract with account:", deployer.address);

  // 读取现有的部署信息
  const fs = require('fs');
  let deploymentInfo;
  try {
    deploymentInfo = JSON.parse(fs.readFileSync('deployment-upgradeable.json', 'utf8'));
  } catch (error) {
    console.error("Error reading deployment file:", error);
    process.exit(1);
  }

  const factoryAddress = deploymentInfo.factory;
  console.log("Upgrading factory at address:", factoryAddress);

  // 获取新的合约工厂
  const NFTAuctionFactoryV2 = await ethers.getContractFactory("NFTAuctionFactory");
  
  // 执行升级
  const factory = await upgrades.upgradeProxy(factoryAddress, NFTAuctionFactoryV2);
  console.log("Factory upgraded successfully");

  // 获取新的实现地址
  const newImplementationAddress = await upgrades.erc1967.getImplementationAddress(factoryAddress);
  console.log("New implementation address:", newImplementationAddress);

  // 更新部署信息
  deploymentInfo.factoryImplementation = newImplementationAddress;
  deploymentInfo.upgradedAt = new Date().toISOString();
  
  fs.writeFileSync('deployment-upgradeable.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info updated");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});