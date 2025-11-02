require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config(); // 用于加载环境变量
require("hardhat-contract-sizer"); // 添加这行

// 从 .env 文件读取敏感信息
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  settings: {
    optimizer: {
      enabled: true,    // 启用优化器
      runs: 2000,        // 优化次数，200-1000 之间
    },
    viaIR: true,  // 启用中间表示优化（重要！）
  },

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

  // 添加这些测试相关配置（不会影响现有功能）
  mocha: {
    timeout: 20000, // 增加测试超时时间
  },

  // 如果你想添加测试网特定的 gas 报告等
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },

  etherscan: {
    apiKey: ETHERSCAN_API_KEY, // 用于合约验证的 Etherscan API 密钥
  },

};  
