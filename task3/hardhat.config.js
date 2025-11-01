require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config(); // 用于加载环境变量

// 从 .env 文件读取敏感信息
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",

  networks: {
    // 本地开发网络（默认）
    localhost: {
      url: "http://127.0.0.1:8545", // 如果你自己运行 `npx hardhat node`
      chainId: 31337,
    },
    // Sepolia 测试网
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [PRIVATE_KEY], // 用于部署的私钥
      chainId: 11155111,
    },
    // 主网（谨慎操作！）
    mainnet: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [PRIVATE_KEY],
      chainId: 1,
    }
  },

  etherscan: {
    apiKey: ETHERSCAN_API_KEY, // 用于合约验证的 Etherscan API 密钥
  },

};  
