const Claim = artifacts.require("InitialClaim");
const TCR = artifacts.require("TracerToken");
const Vesting = artifacts.require('TokenVesting')
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { assert } = require('chai');

contract('Claim', (accounts) => {

    let tcr, claim
    beforeEach(async () => {
        tcr = await TCR.new(web3.utils.toWei('1000000000'), accounts[0])
        vesting = await Vesting.new(tcr.address)
        claim = await Claim.new(tcr.address, vesting.address)
        vesting.transferOwnership(claim.address)
    })

    describe('claim', () => {
        context('When there are no tokens in the claim', () => {
            it('fails', async () => {
                await expectRevert(
                    claim.claimTokens(),
                    'ERC20: transfer amount exceeds balance'
                )
            })
        })

        context('When there are tokens in the claim', () => {
            it('transfers', async () => {
                await tcr.transfer(claim.address, web3.utils.toWei('100000'))
                let balanceBefore = await tcr.balanceOf(accounts[1])
                await claim.claimTokens({from: accounts[1]})
                let balanceAfter = await tcr.balanceOf(accounts[1])
                assert.equal((balanceAfter.sub(balanceBefore)).toString(), web3.utils.toWei('1'))
            })
        })

        context('When the user has already claimed', () => {
            it('fails', async () => {
                //Claim once
                await tcr.transfer(claim.address, web3.utils.toWei('200000'))
                await claim.claimTokens({from: accounts[1]})
                await expectRevert(
                    claim.claimTokens({from: accounts[1]}),
                    "No double claiming"
                )
            })
        })
    })

    describe('vesting', () => {
        context('When a user sucessfully claims', () => {
            it('Sets up a vesting schedule for 99999 tokens', async () => {
                await tcr.transfer(claim.address, web3.utils.toWei('100000'))
                await claim.claimTokens({from: accounts[1]})

                let vestingSchedule = await vesting.getVesting(accounts[1], 0)
                assert.equal(vestingSchedule[0].toString(), web3.utils.toWei("99999"))
                assert.equal(vestingSchedule[1].toString(), web3.utils.toWei("0"))

                // Can claim their vesting
                let startBalance = await tcr.balanceOf(accounts[1])
                time.increase(39 * 7 * 24 * 60 * 60)
                await vesting.claim(0, { from: accounts[1] })
                let endBalance = await tcr.balanceOf(accounts[1])
                let claimed = await vesting.getVesting(accounts[1], 0)
                assert.equal(claimed[0].toString(), await web3.utils.toWei('99999'))
                //13 weeks over = 1/4 of the total
                assert.equal(claimed[1].toString().slice(0, 7), await web3.utils.toWei('24999.75').toString().slice(0, 7))
                assert.equal(endBalance.sub(startBalance).toString().slice(0, 7), web3.utils.toWei('24999.75').toString().slice(0, 7))
            })
        })
    })
});
