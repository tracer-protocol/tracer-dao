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

        //set vesting for current employees
        let employeeAddresses = []
        let amounts = []
        let isFixed = []
        let cliffWeeks = []
        let vestingWeeks = []

        for (var i = 0; i < employeeAddresses; i++) {
            isFixed.push(false)
            cliffWeeks.push(0)
            vestingWeeks.push(156)
        }

        await employeeVesting.setVestingSchedules(
            employeeAddresses,
            amounts,
            isFixed,
            cliffWeeks,
            vestingWeeks
        )

        //transfer ownership to the Lionsmane multisig for all future
        //employees to have vesting set
        await employeeVesting.transferOwnership(lionsmaneMultisig)
        console.log(employeeVesting.address)
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
