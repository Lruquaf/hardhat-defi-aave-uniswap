const {getNamedAccounts, ethers} = require("hardhat")

const AMOUNT = ethers.parseEther("0.01")

async function getWeth() {
    const amount = AMOUNT
    const {deployer} = await getNamedAccounts()
    const signer = await ethers.provider.getSigner(deployer)
    const iWeth = await ethers.getContractAt(
        "IWeth",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        signer
    )
    const tx = await iWeth.deposit({value: amount})
    await tx.wait(1)
    const balance = await iWeth.balanceOf(signer)
    console.log(`WETH Balance: ${ethers.formatEther(balance)}`)
}

// https://github.com/MMtis/Hardhat-Defi-AaveV3-UniswapV3
async function swapWeth(wethTokenAddress, daiTokenAddress, amount, signer) {
    const swapRouter = await ethers.getContractAt(
        "ISwapRouter",
        "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        signer
    )
    await approveErc20(
        wethTokenAddress,
        await swapRouter.getAddress(),
        AMOUNT,
        signer
    )
    const currentBlockTime = (await ethers.provider.getBlock("latest"))
        .timestamp

    const params = {
        tokenIn: wethTokenAddress,
        tokenOut: daiTokenAddress,
        fee: 3000,
        recipient: signer,
        deadline: currentBlockTime + 1800,
        amountIn: AMOUNT,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0,
    }

    const amountOut = await swapRouter.exactInputSingle(params)
    console.log("Swapped ETH to DAI!")
}

async function approveErc20(erc20Address, spender, amount, signer) {
    const erc20Token = await ethers.getContractAt(
        "IERC20",
        erc20Address,
        signer
    )
    const approveTx = await erc20Token.approve(spender, amount)
    await approveTx.wait(1)
    console.log("Approved!")
}

module.exports = {getWeth, swapWeth, AMOUNT}
