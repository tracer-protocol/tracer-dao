const { web3 } = require("@openzeppelin/test-helpers/src/setup")
const { ether } = require("@openzeppelin/test-helpers")
const DAOUpgradable = artifacts.require("TracerDAO")
const TCR = artifacts.require("TracerToken");
const Vesting = artifacts.require("TokenVesting")
const EmployeeVesting = artifacts.require("EmployeeVesting")
const Claim = artifacts.require("InitialClaim")
const SelfUpgradableProxy = artifacts.require("CustomUpgradeableProxy")
module.exports = async function(deployer, network, accounts) {

    if (network == "EmployeeVesting") {
        let tracerToken = "0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050"
        let daoAddress = "0xA84918F3280d488EB3369Cb713Ec53cE386b6cBa"
        let lionsmaneMultisig = "0xa6a006c12338cdcdbc882c6ab97e4f9f82340651"
        await deployer.deploy(EmployeeVesting, tracerToken, daoAddress)
        let employeeVesting = await EmployeeVesting.deployed()
        let febTwelve = 1613052000 // unix secs on feb 12th
        //set vesting for current employees
        let employeeAddresses = [
            "0x44fF73eC0Cb47b74C6ebd6d62B71E946f312f5e4",
            "0x2f99b7C0BDCD933f58D49a4A6a172b1a03cbb413",
            "0x3e94F8549d71D98Ee7C7927dBb0150B35b7bdeee",
            "0x7d25f611DCDc45838DC1A2A0F7321ef8CB8C20bA",
            "0x84Be8f20279d9c403e055853BF5531D003E3A542",
            "0xcB46CA9b99988c1F7160E45C661484038b632680",
            "0x64C83eC49450747024451ac3bcCdBC2c2f2C6BC4",
            "0x3E96CAafE1bD5Dc781606c5974F6C885613fEd21",
            "0xb0008569B1899C9f405d27A0B3cEd2B83106CE87",
            "0x03FE32FD47133C8CBb5738115481272E1dBceb73",
            "0x4cb916632bFF19dC8dD6884d665284820eb7C389",
            "0xCcc9f6E37D07AE853Fa2b9997614F9dBC4575376",
            "0x5E9F986942F7Abb41Ae5D0DE697DDf6E9F302818",
            "0x49391Ef29F9512D366ef9E8687730f621B8743d1",
            "0xc7307Fd7fc10Bd5DA7Abb99172b64B040d89FdEa",
            "0x30c648196541159bdd77Dd35E0b203bC4B6e7822",
            "0x621e4B4656fF6905E1F8d35B39a520DA671cdE4F",
            "0x4c82c51a96eA9e951D1b5e8CedC53b980Ec9D3B1",
            "0x69d64f3a728AA44120d19D6e8e10b837Bdf8cA69",
            "0xA571b83275fc41B6287d33ab16a905A07232575A",
            "0x157595f04C0da495D72CEb84390f444D469c3216",
            "0xBc7652a89f374AFDaB681F461B5be76aA1BA6446",
            "0xBf6A5f598a4F4B733B85f18fFA284d94a57B6244",
            "0xa8E3B87D1109fF909c867A319316987412e59F50",
            "0x87887d8ac550579dA751C671ca83fB8c2a22B90d",
            "0xb94AcE19eCD7CE5cc36d16d5112A51E76A33EB7D",
            "0x5EC90BE09d231fbDFd92aD51949a1198c864Ac73",
            "0x020f94A8b494BE778E409cddCBdA1b10ed01DE9a",
            "0xC32c7Af3FA81206Dcd83ac0e46AF05D699405c14",
            "0xF08Fc2f299a7c559EFBe4bD8a8bf22E436e6c092"
        ]
        let amounts = [
            web3.utils.toWei("1500000"),
            web3.utils.toWei("4000000"),
            web3.utils.toWei("1750000"),
            web3.utils.toWei("5000000"),
            web3.utils.toWei("2500000"),
            web3.utils.toWei("2500000"),
            web3.utils.toWei("2500000"),
            web3.utils.toWei("1000000"),
            web3.utils.toWei("250000"),
            web3.utils.toWei("5000000"),
            web3.utils.toWei("300000"),
            web3.utils.toWei("2250000"),
            web3.utils.toWei("2500000"),
            web3.utils.toWei("3000000"),
            web3.utils.toWei("5000000"),
            web3.utils.toWei("650000"),
            web3.utils.toWei("75000"),
            web3.utils.toWei("400000"),
            web3.utils.toWei("5000000"),
            web3.utils.toWei("10000000"),
            web3.utils.toWei("10000000"),
            web3.utils.toWei("100000"),
            web3.utils.toWei("250000"),
            web3.utils.toWei("500000"),
            web3.utils.toWei("500000"),
            web3.utils.toWei("500000"),
            web3.utils.toWei("100000"),
            web3.utils.toWei("400000"),
            web3.utils.toWei("1000000"),
            web3.utils.toWei("1000000")
        ]
        let isFixed = []
        let cliffWeeks = []
        let vestingWeeks = []
        let startTimes = []
        for (var i = 0; i < employeeAddresses; i++) {
            isFixed.push(false)
            cliffWeeks.push(0)
            vestingWeeks.push(156)
            startTimes.push(febTwelve)
        }

        await employeeVesting.setVestingSchedules(
            employeeAddresses,
            amounts,
            isFixed,
            cliffWeeks,
            vestingWeeks,
            startTimes
        )

        //transfer ownership to the Lionsmane multisig for all future
        //employees to have vesting set
        await employeeVesting.transferOwnership(lionsmaneMultisig)
        return
    }

    const day = 86400

    // Deploy TCR token -> total supply of 1 billion tokens
    await deployer.deploy(TCR, web3.utils.toWei('1000000000'), accounts[0])
    let tcr = await TCR.deployed()

    // Deploy Gov
    await deployer.deploy(DAOUpgradable)
    let gov = await DAOUpgradable.deployed()
    let govInitData = web3.eth.abi.encodeFunctionCall(
        {
            name: "initialize",
            type: "function",
            inputs: [
                { type: "address", name: "_govToken" },
                { type: "uint32", name: "_maxProposalTargets" },
                { type: "uint32", name: "_warmUp" },
                { type: "uint32", name: "_coolingOff" },
                { type: "uint32", name: "_proposalDuration" },
                { type: "uint32", name: "_lockDuration" },
                { type: "uint96", name: "_proposalThreshold" },
                { type: "uint8", name: "_quorumDivisor" },
            ],
        },
        //max proposal targets = 10
        //warmUp time = 2 days
        //coolingOff period = 2 days
        //proposalDuration = 3 days
        //lockDuration = 7 days
        //proposalThreshold = 1 TCR
        //quorumDivisor = 2 (50% vote reuqired)
        [tcr.address, 10, 2*day, 2*day, 3*day, 7*day, ether("1"), 2]
    )
    
    // Deploy proxy and initalize governance
    await deployer.deploy(SelfUpgradableProxy, gov.address, govInitData)
    let proxy = await SelfUpgradableProxy.deployed()
    
    // Deploy vesting
    await deployer.deploy(Vesting, tcr.address)
    let vesting = await Vesting.deployed()

    // Deploy claim
    await deployer.deploy(Claim, tcr.address, vesting.address)
    let claim = await Claim.deployed()

    // Send 1% of tokens to claim contract
    // 1% of 1 billion = 10 million
    await tcr.transfer(claim.address, web3.utils.toWei('10000000'))
    

    if (network == 'development') {
        console.log("Creating test vestings")
        // create a few test vesting schedules
        await tcr.transfer(vesting.address, web3.utils.toWei('10000000'))

        // no cliff 156 weeks vesting
        await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('2500000'), true, 0, 156);

        // cliff at 26 weeks, 52 weeks vesting steeper gradient
        await vesting.setVestingSchedule(accounts[2], web3.utils.toWei('5000000'), true, 26, 52);

        // cliff at 52 weeks, 156 weeks vesting 
        await vesting.setVestingSchedule(accounts[3], web3.utils.toWei('2500000'), true, 52, 156);
        console.log("Finished creating test vestings")
        console.log("Transferring remaining tokens to DAO")
        await tcr.transfer(proxy.address, web3.utils.toWei('980000000'))

        const withdrawData = web3.eth.abi.encodeFunctionCall(
            {
                name: "withdrawFromVesting",
                type: "function",
                inputs: [
                    { type: "uint256", name: "amount" },
                ],
            },
            ["2599948000000000000000000"]
        )
        
        console.log(withdrawData)

    } else {
        // Send 99% of tokens to gov contract
        // 99% of 1 billion = 990 million
        await tcr.transfer(proxy.address, web3.utils.toWei('990000000'))
    }

    // Transfer ownership to the proxy
    await tcr.transferOwnership(proxy.address)
    
    // Transfer ownership of vesting to the claim contract so it can set vesting.
    // NOTE: This vesting contract should not be used for anything but the initial claim
    await vesting.transferOwnership(claim.address) 

};
