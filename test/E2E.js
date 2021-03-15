const TCR = artifacts.require("TracerToken");
const Vesting = artifacts.require("TokenVesting")
const Claim = artifacts.require("InitialClaim")
const SelfUpgradeableProxy = artifacts.require("CustomUpgradeableProxy")
const DAOUpgradeable = artifacts.require("TracerDAO")
const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { assert } = require('chai');

contract('E2E', (accounts) => {
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

        // Deploy claim
        claim = await Claim.new(tcr.address, vesting.address)

        // Send 1% of tokens to claim contract
        await tcr.transfer(claim.address, web3.utils.toWei('10000000'))
        
        // Send 99% of tokens to gov contract
        await tcr.transfer(gov.address, web3.utils.toWei('990000000'))

        // Burn ownership of token
        await tcr.transferOwnership(gov.address)
        
        // Burn ownership of vesting contract
        await vesting.transferOwnership(claim.address)
    })

    describe('Claim Flow', () => {
        context('Users can claim tokens, receive 1 and part goes to vesting', async () => {
            it('works', async() => {
                const initialVesting = new BN(web3.utils.toWei('99999'))
                let startBalance = await tcr.balanceOf(accounts[1])
                assert.equal(startBalance.toString(), (web3.utils.toWei('0')).toString())
                await claim.claimTokens({from: accounts[1]})
                let endBalance = await tcr.balanceOf(accounts[1])
                assert.equal(endBalance.toString(), (web3.utils.toWei('1')).toString())

                //Check amount vesting
                let userVesting = await vesting.getVesting(accounts[1], 0)
                assert.equal(userVesting[0].toString(), (initialVesting).toString()) //99999 tokens vesting

                //Cant claim any yet
                await expectRevert(
                    vesting.claim(0, {from: accounts[1]}),
                    "Vesting: cliffTime not reached"
                )

                //Can claim half after 1.5 years
                time.increase(78*7*24*60*60)
                await vesting.claim(0, {from:accounts[1]})

                let newBalance = await tcr.balanceOf(accounts[1])
                let newVesting = await vesting.getVesting(accounts[1], 0)

                //1 token + 0.5 * 99999 tokens = 50000.5 tokens
                const expectedBalance = new BN(web3.utils.toWei("50000.5"))
                const epsilon = new BN(web3.utils.toWei("0.0025"))

                /* newBalance should be within a certain interval.
                   The exact amount can vary slightly */
                assert(
                    newBalance > expectedBalance.sub(epsilon) &&
                    newBalance < expectedBalance.add(epsilon),
                    newBalance.toString()
                )

                /* The newVesting should be whatever newBalance is 
                   minus the original 1 token from the start of vesting */
                const expectedVesting = (newBalance.sub(new BN(web3.utils.toWei("1"))))
                assert.equal(newVesting[1].toString(), expectedVesting.toString())
            })
        })
    })
});
