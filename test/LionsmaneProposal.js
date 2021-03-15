const TCR = artifacts.require("TracerToken");
const Vesting = artifacts.require("TokenVesting")
const Claim = artifacts.require("InitialClaim")
const SelfUpgradeableProxy = artifacts.require("CustomUpgradeableProxy")
const DAOUpgradeable = artifacts.require("TracerDAO")
const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { assert } = require('chai');

contract('E2E Proposals', (accounts) => {
    const day = 86400

    let tcr, vesting, claim, gov, proxy
    beforeEach(async () => {

        // Deploy Token
        tcr = await TCR.new(web3.utils.toWei('1000000000'), accounts[0])

        const govInitData = web3.eth.abi.encodeFunctionCall(
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
            [tcr.address, 10, 0, 0, day, 0, 1, 2]
        )

        // Deploy Gov and proxy
        gov = await DAOUpgradeable.new()
        proxy = await SelfUpgradeableProxy.new(gov.address, govInitData)
        gov = await DAOUpgradeable.at(proxy.address)

        // Deploy vesting
        vesting = await Vesting.new(tcr.address)

        // Send 99% of tokens to gov contract
        await tcr.transfer(gov.address, web3.utils.toWei('990000000'))

        // Burn ownership of token
        await tcr.transferOwnership(gov.address)

        // Burn ownership of vesting contract
        await vesting.transferOwnership(gov.address)

        //Send tokens to accounts 1 for proposal
        await tcr.transfer(accounts[1], web3.utils.toWei("1"))

        //Stake
        await tcr.approve(gov.address, web3.utils.toWei("1"))
        await tcr.approve(gov.address, web3.utils.toWei("1"), { from: accounts[1] })
        await gov.stake(web3.utils.toWei("1"))
        await gov.stake(web3.utils.toWei("1"), {from: accounts[1]})
    })

    describe('Lionsmane Proposal Flow', () => {
        context('Lionsmane Proposal is setup as expected', async () => {
            it('works', async () => {

                let lionsmaneMultisig = accounts[2]
                
                //Proposal data
                //Function call of send 21500000 TCR to the LMD multisig
                //TARGET = TCR Token
                const sendTokenData = web3.eth.abi.encodeFunctionCall(
                    {
                        name: 'transfer',
                        type: 'function',
                        inputs: [
                            {
                                type: 'address',
                                name: 'recipient',
                            },
                            {
                                type: 'uint256',
                                name: 'amount',
                            },
                        ],
                    },
                    [lionsmaneMultisig, web3.utils.toWei("21500000")]
                )

                console.log("Send Tokens to Multisig Data:")
                console.log(sendTokenData)

                //Function call of send 193500000 to the proposed vesting contract
                //TARGET = TCR TOKEN
                const sendTokenVestingData = web3.eth.abi.encodeFunctionCall(
                    {
                        name: 'transfer',
                        type: 'function',
                        inputs: [
                            {
                                type: 'address',
                                name: 'recipient',
                            },
                            {
                                type: 'uint256',
                                name: 'amount',
                            },
                        ],
                    },
                    [vesting.address, web3.utils.toWei("193500000")]
                )
                console.log("Send Tokens to Vesting Data:")
                console.log(sendTokenVestingData)

                //Function call of set vesting for 32,250,000 to be released after exactly 6 months
                //TARGET = VESTING CONTRACT
                const setUpVesting1 = web3.eth.abi.encodeFunctionCall(
                    {
                        name: 'setVestingSchedule',
                        type: 'function',
                        inputs: [
                            {
                                type: 'address',
                                name: 'account',
                            },
                            {
                                type: 'uint256',
                                name: 'amount',
                            },
                            {
                                type: 'bool',
                                name: 'isFixed',
                            },
                            {
                                type: 'uint256',
                                name: 'cliffWeeks',
                            },
                            {
                                type: 'uint256',
                                name: 'vestingWeeks',
                            },
                        ],
                    },
                    [lionsmaneMultisig, web3.utils.toWei("32250000"), true, 26, 26]
                )

                console.log("Set up 32250000 vesting after 6 months data:")
                console.log(setUpVesting1)

                //Function call of set vesting for 161250000 to be released linearly over 3 years with no cliff
                //TARGET = VESTING CONTRACT
                const setUpVesting2 = web3.eth.abi.encodeFunctionCall(
                    {
                        name: 'setVestingSchedule',
                        type: 'function',
                        inputs: [
                            {
                                type: 'address',
                                name: 'account',
                            },
                            {
                                type: 'uint256',
                                name: 'amount',
                            },
                            {
                                type: 'bool',
                                name: 'isFixed',
                            },
                            {
                                type: 'uint256',
                                name: 'cliffWeeks',
                            },
                            {
                                type: 'uint256',
                                name: 'vestingWeeks',
                            },
                        ],
                    },
                    [lionsmaneMultisig, web3.utils.toWei("161250000"), true, 0, 156]
                )
                console.log("Set up 161250000 vesting over 3 years data:")
                console.log(setUpVesting2)
                
                //Pre checks
                let startBalance = await tcr.balanceOf(lionsmaneMultisig)
                assert.equal(startBalance.toString(), web3.utils.toWei("0").toString())

                //Submit proposal
                let targets = [tcr.address, tcr.address, vesting.address, vesting.address]
                let data = [sendTokenData, sendTokenVestingData, setUpVesting1, setUpVesting2]
                await gov.propose(targets, data)
                await time.increase(100)
                await gov.vote(0, 1, web3.utils.toWei("1"), {from: accounts[1]})
                await time.increase(100)
                await gov.execute(0)

                //Check proposal outcome
                let lionsmaneBalance = await tcr.balanceOf(lionsmaneMultisig)
                //Receive 21,500,000 tokens up front
                assert.equal(lionsmaneBalance.toString(), web3.utils.toWei("21500000"))

                let lionsmaneVesting1 = await vesting.getVesting(lionsmaneMultisig, 0)
                let lionsmaneVesting2 = await vesting.getVesting(lionsmaneMultisig, 1)

                //32,250,000 tokens vesting over 6 months
                assert.equal(lionsmaneVesting1[0].toString(), web3.utils.toWei("32250000"))

                //161,250,000 tokens vesting over 3 years
                assert.equal(lionsmaneVesting2[0].toString(), web3.utils.toWei("161250000"))

                //Fast forward 6 months (26 weeks = 182 days) and run two claims
                time.increase(182 * day)
                
                const epsilon = new BN(web3.utils.toWei("2"))

                //All 32,250,000 tokens should now be claimable
                const expectedDifference1 = new BN(web3.utils.toWei("32250000"))
                let preClaim1 = await tcr.balanceOf(lionsmaneMultisig)
                await vesting.claim(0, {from: lionsmaneMultisig})
                let postClaim1 = await tcr.balanceOf(lionsmaneMultisig)
                const difference1 = postClaim1.sub(preClaim1)
                assert(
                    difference1 > expectedDifference1.sub(epsilon) &&
                    difference1 < expectedDifference1.add(epsilon),
                    "Difference out of range"
                )

                //1/6th of the 161,250,000 tokens should be claimable = 26875000
                const expectedDifference2 = new BN(web3.utils.toWei("26875000"))
                let preClaim2 = await tcr.balanceOf(lionsmaneMultisig)
                await vesting.claim(1, {from: lionsmaneMultisig})
                let postClaim2 = await tcr.balanceOf(lionsmaneMultisig)
                const difference2 = postClaim2.sub(preClaim2)
                assert(
                    difference2 > expectedDifference2.sub(epsilon) &&
                    difference2 < expectedDifference2.add(epsilon),
                    "Difference out of range"
                )

                //At the end of the 3 years, all tokens are claimable
                //fast forward 2.5 years = 130 weeks
                const expectedDifference3 = new BN(web3.utils.toWei("134375000"))
                await time.increase(130 * 7 * day)
                let preClaim3 = await tcr.balanceOf(lionsmaneMultisig)
                await vesting.claim(1, {from: lionsmaneMultisig})
                let postClaim3 = await tcr.balanceOf(lionsmaneMultisig)
                const difference3 = postClaim3.sub(preClaim3)
                assert(
                    difference3 > expectedDifference3.sub(epsilon) &&
                    difference3 < expectedDifference3.add(epsilon),
                    "Difference out of range"
                )

                let finalBalance = await tcr.balanceOf(lionsmaneMultisig)
                assert.equal(finalBalance.toString(), web3.utils.toWei("215000000"))
            })
        })
    })
});
