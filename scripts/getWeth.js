const { getNamedAccounts, ethers } = require("hardhat")

const AMOUNT = ethers.parseEther("0.02")

async function getWeth() {
    const { deployer } = await getNamedAccounts()

    const accounts = await ethers.getSigners()
    signer = accounts[0]

    // call the "deposit function" on the weth contract
    // to interact with the contract, we need the abi and contract address

    // we got the ABI by creating the interface and compiling it
    // Address = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

    iWeth = await ethers.getContractAt(
        "IWeth",
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        signer,
    )
    // The address and stuff should normally be modularized in the hardhat config

    const tx = await iWeth.deposit({ value: AMOUNT })
    await tx.wait(1)
    const wethBalance = await iWeth.balanceOf(deployer)
    console.log(`Got ${wethBalance.toString()} WETH`)
}

module.exports = { getWeth, AMOUNT }
