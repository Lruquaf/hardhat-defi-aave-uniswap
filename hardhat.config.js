require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config()
require("hardhat-deploy")

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey"
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || "https://goerli"
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || "https://mainnet"
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "key"

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        compilers: [
            {version: "0.8.20"},
            {version: "0.4.19"},
            {version: "0.8.0"},
        ],
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1,
            forking: {
                url: MAINNET_RPC_URL,
            },
        },
        localhost: {
            chainId: 31337,
            blockConfirmations: 1,
        },
        goerli: {
            chainId: 5,
            blockConfirmations: 6,
            url: GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY],
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    namedAccounts: {
        deployer: {
            default: 0,
            1: 0,
            goerli: 0,
        },
        test: {
            default: 1,
            1: 1,
        },
    },
}
