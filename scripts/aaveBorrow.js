const {getNamedAccounts, ethers} = require("hardhat")
const {getWeth, swapWeth, AMOUNT} = require("./helper-functions")

async function main() {
    await getWeth()
    const {deployer} = await getNamedAccounts()
    const signer = await ethers.provider.getSigner(deployer)
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    const lendingPool = await getLendingPool(signer)
    const lendingPoolAddress = await lendingPool.getAddress()
    console.log(`Lending Pool Address: ${lendingPoolAddress}`)
    await approveErc20(wethTokenAddress, lendingPoolAddress, AMOUNT, signer)
    console.log("Supplying...")
    await lendingPool.supply(wethTokenAddress, AMOUNT, signer, "0")
    console.log("Supplied!")
    let {totalDebtBase, availableBorrowsBase} = await getUserData(
        lendingPool,
        signer
    )
    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsBase.toString() * 0.95 * 1e10
    console.log(amountDaiToBorrow.toString())
    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    const isStableRateEnabled = await getReserveData(
        lendingPool,
        daiTokenAddress
    )
    await borrowDai(
        daiTokenAddress,
        lendingPool,
        amountDaiToBorrow.toString(),
        isStableRateEnabled,
        signer
    )
    await getUserData(lendingPool, signer)
    await repay(
        daiTokenAddress,
        amountDaiToBorrow.toString(),
        lendingPool,
        isStableRateEnabled,
        signer
    )
    await getUserData(lendingPool, signer)
    await getWeth()
    await swapWeth(
        wethTokenAddress,
        daiTokenAddress,
        amountDaiToBorrow.toString(),
        signer
    )
    const daiBalance = await balanceOf(daiTokenAddress, signer)
    console.log(`DAI Balance: ${daiBalance.toString()}`)
    await repay(
        daiTokenAddress,
        amountDaiToBorrow.toString(),
        lendingPool,
        isStableRateEnabled,
        signer
    )
    await getUserData(lendingPool, signer)
}

async function getLendingPool(signer) {
    const poolAddressesProvider = await ethers.getContractAt(
        "IPoolAddressesProvider",
        "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e",
        signer
    )
    const poolAddress = await poolAddressesProvider.getPool()
    const pool = await ethers.getContractAt("IPool", poolAddress, signer)
    return pool
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

// https://github.com/MMtis/Hardhat-Defi-AaveV3-UniswapV3
async function balanceOf(contractAddress, account) {
    const ecr20Token = await ethers.getContractAt(
        "IERC20",
        contractAddress,
        account
    )
    const balance = await ecr20Token.balanceOf(account)
    return balance
}

async function getUserData(lendingPool, account) {
    const {totalCollateralBase, totalDebtBase, availableBorrowsBase} =
        await lendingPool.getUserAccountData(account)
    console.log(
        `You have ${
            ethers.formatEther(totalCollateralBase) * 1e10
        } worth of USD deposited.`
    )
    console.log(
        `You have ${
            ethers.formatEther(totalDebtBase) * 1e10
        } worth of USD borrowed.`
    )
    console.log(
        `You can borrow ${
            ethers.formatEther(availableBorrowsBase) * 1e10
        } worth of USD.`
    )
    return {totalDebtBase, availableBorrowsBase}
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`DAI/ETH price: ${1 / ethers.formatEther(price)}`)
    return price
}

async function borrowDai(
    daiAddress,
    lendingPool,
    amount,
    isStableRateEnabled,
    signer
) {
    let borrowTx
    if (isStableRateEnabled) {
        borrowTx = await lendingPool.borrow(
            daiAddress,
            amount,
            "1",
            "0",
            signer
        )
    } else {
        borrowTx = await lendingPool.borrow(
            daiAddress,
            amount,
            "2",
            "0",
            signer
        )
    }

    await borrowTx.wait(1)
    console.log("You've borrowed!")
}

// https://github.com/MMtis/Hardhat-Defi-AaveV3-UniswapV3
async function getReserveData(lendingPool, daiAddress) {
    const {configuration} = await lendingPool.getReserveData(daiAddress)

    const reserveData = BigInt(configuration.toString())
    // console.log(reserveData.toString())

    // Create a bit mask to isolate the 59th bit of the configuration data
    // Bitwise shift BigInt(1) 59 places to the left
    const bitMask = BigInt(1) << BigInt(59)
    // console.log(bitMask.toString())

    // Use the bitwise AND operator (&) with reserveData and bitMask to isolate the 59th bit
    // Then, shift the result 59 places to the right to get the value of the 59th bit
    const bit59Value = (reserveData & bitMask) >> BigInt(59)

    return Number(bit59Value)
}

async function repay(
    daiAddress,
    amount,
    lendingPool,
    isStableRateEnabled,
    signer
) {
    await approveErc20(
        daiAddress,
        await lendingPool.getAddress(),
        amount,
        signer
    )

    let repayTx
    if (isStableRateEnabled) {
        repayTx = await lendingPool.repay(daiAddress, amount, "1", signer)
    } else {
        repayTx = await lendingPool.repay(daiAddress, amount, "2", signer)
    }
    await repayTx.wait(1)
    console.log("Repaid!")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
