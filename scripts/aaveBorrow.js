const { getNamedAccounts, ethers } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")

async function main() {
    // 1. DEPOSITING

    // 1.a Getting WETH (to deposit)The protocol treats everything as an ERC20 token
    await getWeth()
    // const { deployer } = await getNamedAccounts(), not necessary in ethers v6 (?)

    const accounts = await ethers.getSigners()
    signer = accounts[0]

    // Getting the lendingpool into which we need to deposit (and what token)
    const lendingPool = await getLendingPool(signer)
    console.log(`LendingPool address ${lendingPool.target}`)

    // 1.b Approving
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    await approveErc20(wethTokenAddress, lendingPool.target, AMOUNT, signer)

    // 1.c Depositing
    console.log("Depositing...")

    await lendingPool.deposit(wethTokenAddress, AMOUNT, signer, 0)
    console.log("Deposited!")

    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, signer)

    const daiPrice = await getDaiPrice()
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toString()) // 0.95 = 95%, not maximum borrowing
    console.log(`You can borrow ${amountDaiToBorrow} DAI`)
    const amountDaiToBorrowWei = ethers.parseEther(amountDaiToBorrow.toString())

    // 2. Borrowing
    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, signer)
    await getBorrowUserData(lendingPool, signer)

    await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, signer)
    await getBorrowUserData(lendingPool, signer)
}

async function repay(amount, daiAddress, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.target, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 2, account)
    await repayTx.wait(1)
    console.log("You've repayed!")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 2, 0, account)
    await borrowTx.wait(1)
    console.log("You've borrowed!")
}

async function getDaiPrice() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616e4d11a78f511299002da57a0a94577f1f4",
    ) // signer is not necessary here, since we are not doing any transaction (just reading)
    const price = (await daiEthPriceFeed.latestRoundData())[1] // meaning we take the return paramater at index 1
    console.log(`The DAI ETH price is ${price.toString()}`)
    return price
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited (collateral)`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed`)
    console.log(`You have ${availableBorrowsETH} worth of ETH available to borrow`)
    return { availableBorrowsETH, totalDebtETH }
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account,
    )

    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)

    return lendingPool
}

async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)

    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("Approved!")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
