# NFT Auction Platform - 完整的NFT拍卖平台

本项目是一个功能完整的NFT拍卖平台，包含智能合约、工厂模式、可升级合约和完整的测试套件。支持ETH和ERC20代币支付，集成Chainlink价格预言机。

## 项目概述

这是一个基于Solidity的NFT拍卖平台，采用工厂模式管理拍卖合约，支持：
- NFT拍卖（ERC721标准）
- 多币种支付（ETH和ERC20代币）
- 价格预言机集成（Chainlink）
- 可升级合约架构（UUPS模式）
- 完整的测试覆盖

## 项目结构

```
├── contracts/               # 智能合约
│   ├── NFTAuction.sol      # 核心拍卖合约
│   ├── NFTAuctionFactory.sol # 工厂合约（可升级）
│   ├── NFTAuctionFactoryV2.sol # 工厂合约V2版本
│   ├── MyNFT.sol           # 示例NFT合约
│   ├── MockERC721.sol      # 测试用Mock NFT合约
│   ├── MockERC20.sol       # 测试用Mock ERC20合约
│   └── MockPriceFeed.sol   # 测试用价格预言机
├── scripts/                # 部署脚本
│   ├── deploy.js           # 基础部署脚本
│   ├── deploy-upgradeable.js # 可升级合约部署
│   └── upgrade-factory.js  # 工厂合约升级脚本
├── test/                   # 测试文件
│   └── unit/               # 单元测试
│       ├── NFTAuction.test.js
│       └── NFTAuctionFactory.test.js
├── ignition/               # Hardhat Ignition模块
├── artifacts/              # 编译产物
├── cache/                  # 缓存文件
├── hardhat.config.js       # Hardhat配置
├── package.json            # 项目依赖
└── README.md              # 项目文档
```

## 核心功能

### 1. NFT拍卖合约 (NFTAuction.sol)
- **多币种支持**: 支持ETH和ERC20代币支付
- **价格预言机**: 集成Chainlink获取实时价格
- **防重入保护**: 使用ReentrancyGuard防止重入攻击
- **拍卖机制**: 
  - 起拍价设置
  - 最小加价幅度
  - 拍卖时间控制
  - 出价退款机制
- **事件追踪**: 完整的拍卖生命周期事件

### 2. 工厂合约 (NFTAuctionFactory.sol)
- **可升级架构**: 采用UUPS可升级模式
- **拍卖管理**: 
  - 创建新拍卖
  - 跟踪所有拍卖
  - 用户拍卖列表
  - 批量结束过期拍卖
- **权限控制**: 基于Ownable的权限管理

### 3. 技术特性
- **Solidity 0.8.28**: 最新稳定版本
- **OpenZeppelin**: 使用标准库确保安全性
- **Chainlink集成**: 价格预言机支持
- **Gas优化**: 启用优化器和viaIR

## 快速开始

### 环境要求
- Node.js 16+
- npm 或 yarn
- Hardhat 开发环境

### 安装依赖
```bash
npm install
```

### 配置环境变量
创建 `.env` 文件并配置以下变量：
```bash
# 私钥配置（测试网部署）
PRIVATE_KEY=你的私钥
Account2=第二个账户私钥
Account3=第三个账户私钥
Account4=第四个账户私钥

# API密钥
ALCHEMY_API_KEY=你的Alchemy API密钥
ETHERSCAN_API_KEY=你的Etherscan API密钥
```

## 部署步骤

### 1. 本地网络部署
```bash
# 启动本地Hardhat网络
npx hardhat node

# 在新终端部署合约
npm run deploy
```

### 2. 可升级合约部署
```bash
# 部署可升级版本
npm run deploy-upgradeable

# 升级工厂合约
npm run upgrade-factory
```

### 3. 测试网部署（Sepolia）
```bash
# 部署到Sepolia测试网
npx hardhat run scripts/deploy.js --network sepolia

# 部署可升级版本到Sepolia
npx hardhat run scripts/deploy-upgradeable.js --network sepolia
```

### 4. 主网部署（谨慎操作）
```bash
# 部署到以太坊主网
npx hardhat run scripts/deploy.js --network mainnet
```

## 测试

### 运行所有测试
```bash
npm test
```

### 运行单元测试
```bash
npm run test:unit
```

### 生成测试覆盖率报告
```bash
npm run test:coverage
```

## 合约交互

### 创建拍卖
```javascript
// 通过工厂合约创建拍卖
const factory = await ethers.getContractAt("NFTAuctionFactory", factoryAddress);
await factory.createAuction(
  nftContractAddress,
  tokenId,
  paymentTokenAddress, // address(0) for ETH
  startPrice,
  usdStartPrice,
  startTime,
  duration,
  minBidIncrement
);
```

### 参与拍卖
```javascript
// 出价
const auction = await ethers.getContractAt("NFTAuction", auctionAddress);
await auction.bid({ value: bidAmount }); // ETH出价
// 或
await auction.bidWithToken(bidAmount); // ERC20出价

// 结束拍卖
await auction.endAuction();
```

## 网络配置

### 本地网络
- URL: `http://127.0.0.1:8545`
- Chain ID: 31337
- 默认账户: 20个测试账户

### Sepolia测试网
- URL: `https://eth-sepolia.g.alchemy.com/v2/{API_KEY}`
- Chain ID: 11155111
- 需要配置私钥和API密钥

### 以太坊主网
- URL: `https://eth-mainnet.g.alchemy.com/v2/{API_KEY}`
- Chain ID: 1
- 需要谨慎操作

## 安全特性

### 合约安全
- 使用OpenZeppelin标准库
- 防重入保护
- 输入参数验证
- 权限控制
- 事件日志记录

### 开发安全
- 完整的测试覆盖
- Gas优化配置
- 升级模式支持
- 错误处理机制

## 故障排除

### 常见问题
1. **Gas不足**: 确保测试账户有足够资金
2. **网络连接**: 检查网络配置和API密钥
3. **合约验证**: 使用Etherscan验证合约
4. **测试超时**: 增加mocha超时时间

### 调试技巧
- 使用`console.log`输出调试信息
- 检查交易回执和事件日志
- 验证合约状态变化
- 使用Hardhat网络进行本地测试

## 贡献指南

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License


