const { web3 } = require("@openzeppelin/test-helpers/src/setup")
const { ether } = require("@openzeppelin/test-helpers")
const DAOUpgradable = artifacts.require("TracerDAO")
const TCR = artifacts.require("TracerToken");
const Vesting = artifacts.require("TokenVesting")
const Claim = artifacts.require("InitialClaim")
const SelfUpgradableProxy = artifacts.require("CustomUpgradeableProxy")
module.exports = async function(deployer, network, accounts) {
    if (network == "DAODEPLOY") {
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
        
        // Send 99% of tokens to gov contract
        // 99% of 1 billion = 990 million
        await tcr.transfer(proxy.address, web3.utils.toWei('990000000'))

        // Transfer ownership to the proxy
        await tcr.transferOwnership(proxy.address)
        
        // Transfer ownership of vesting to the claim contract so it can set vesting.
        // NOTE: This vesting contract should not be used for anything but the initial claim
        await vesting.transferOwnership(claim.address) 
    } 
};
