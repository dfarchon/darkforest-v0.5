# Dark Forest v0.5 (2025 Revised Edition)

The revised edition of Dark Forest v0.5, updated in 2025.

Dark Forest is a fully onchain RTS where players explore and conquer a procedurally generated universe.
It uses zk-SNARKs for privacy and decentralization, creating a unique gaming experience.

## 🚀 Quick Start

### Setting Up the Project

### Prerequisites

Before getting started, please ensure you have the following tools installed:

- **nvm** (Node Version Manager)
- **Node.js**
  - v18.19.1 (required for smart contracts development)
  - v16.20.2 (required for client development)
- **Package Managers**
  - **pnpm** v9.9.0 (used for smart contracts in `eth/` directory)
  - **yarn** v1.22.21 (used for client application in `client/` directory)

### Installing NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
```

1. **Smart Contracts Setup**

```bash
cd eth/
nvm use 18.19.1
pnpm install
cp .env.example .env
npx hardhat node
# In a new terminal:
pnpm deploy:dev
```

2. **Client Setup**

```bash
cd client/
nvm use 16.20.2
yarn install
yarn run start:dev
```

The game should now be running at `http://localhost:8081`!

## 🏗️ Project Structure

- `/client` - Game UI and frontend logic
- `/eth` - Smart contract code
- `/circuits` - zkSNARKS circuits (using Circom)

## 🤝 Contributing

We're actively seeking both funding and developers to help bring our future development plans to life.

## 📞 Connect With Us

- DFArchon Discord: [Join our server](https://discord.gg/XpBPEnsvgX)
- DFArchon Telegram: [Join our channel](https://t.me/darkforestares)

# Appendix

## Repository Information

The following repositories are used in this project:

- **Client**: https://github.com/darkforest-eth/client/commit/e13caedd3497fbd3822056694d445ddcb25dca88
- **Contracts**: https://github.com/darkforest-eth/eth/commit/f9633bc2f83dd523e9baad5d05b30071b49317e9

## Quick Clone Commands

Use these commands to clone specific versions of each repository:

```bash
# Clone client repository
git clone https://github.com/darkforest-eth/client
cd client
git reset --hard e13caedd3497fbd3822056694d445ddcb25dca88

# Clone smart contracts repository
git clone https://github.com/darkforest-eth/eth
cd eth
git reset --hard f9633bc2f83dd523e9baad5d05b30071b49317e9
```
