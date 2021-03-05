const DAO = artifacts.require("TracerDAO");
const TCR = artifacts.require("TracerToken");
const Vesting = artifacts.require("TokenVesting")
const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { assert } = require('chai');

contract('Vesting', (accounts) => {
    const oneDollar = new BN('1000000')
    const threeDays = 259200
    const twoDays = 172800

    let tcr, vesting
    beforeEach(async () => {
        tcr = await TCR.new(web3.utils.toWei('10000'), accounts[0])
        vesting = await Vesting.new(tcr.address)
        await tcr.transfer(vesting.address, web3.utils.toWei('5000'))
    })

    describe('setVesting', () => {
        context('When not the owner', () => {
            it('fails', async () => {
                await expectRevert(
                    vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156, { from: accounts[1] }),
                    'Ownable: caller is not the owner'
                )
            })
        })

        context('When not enough tokens are held', () => {
            it('fails', async () => {
                await expectRevert(
                    vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50000000'), true, 26, 156),
                    `Vesting: amount > tokens leftover`
                )
            })
        })

        context('When called by the owner with tokens', () => {
            it('Can set a vesting schedule', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))

                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156);
                let userVesting = await vesting.getVesting(accounts[1], 0)
                assert.equal(userVesting[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting[1].toString(), await web3.utils.toWei('0'))
            })

            it('Can set multiple vesting schedules per user', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))

                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156);
                let userVesting = await vesting.getVesting(accounts[1], 0)
                assert.equal(userVesting[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting[1].toString(), await web3.utils.toWei('0'))

                await tcr.transfer(vesting.address, web3.utils.toWei('50'))

                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('75'), true, 26, 156);
                let userVesting2 = await vesting.getVesting(accounts[1], 1)
                assert.equal(userVesting2[0].toString(), await web3.utils.toWei('75'))
                assert.equal(userVesting2[1].toString(), await web3.utils.toWei('0'))
            })
        })
    })

    describe('claim', () => {
        context('When not vesting', () => {
            it('fails', async () => {
                await expectRevert(
                    vesting.claim(0, { from: accounts[1] }),
                    `Vesting: No claimable tokens`
                )
            })
        })

        context('When cliff has not been reached', () => {
            it('fails', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156);
                await expectRevert(
                    vesting.claim(0,{ from: accounts[1] }),
                    'Vesting: cliffTime not reached'
                )
            })
        })

        context('When a user has no tokens to claim (amount = 0)', () => {
            it('fails', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('0'), true, 26, 156);
                time.increase(26 * 7 * 24 * 60 * 60)
                await expectRevert(
                    vesting.claim(0, { from: accounts[1] }),
                    'Vesting: No claimable tokens'
                )
            })
        })

        context('When a user has correctly vested', () => {
            it('Distributes their tokens', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156);
                let userVesting = await vesting.getVesting(accounts[1], 0)
                assert.equal(userVesting[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting[1].toString(), await web3.utils.toWei('0'))

                time.increase(39 * 7 * 24 * 60 * 60)
                await vesting.claim(0, { from: accounts[1] })
                let claimed = await vesting.getVesting(accounts[1], 0)
                assert.equal(claimed[0].toString(), await web3.utils.toWei('50'))
                assert.equal(claimed[1].toString().slice(0, 4), await web3.utils.toWei('12.5').toString().slice(0, 4))
            })


            it('Factors in the already claimed amount', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156);

                let balance1 = await tcr.balanceOf(accounts[1])
                time.increase(39 * 7 * 24 * 60 * 60)
                await vesting.claim(0, { from: accounts[1] })
                let claimed = await vesting.getVesting(accounts[1], 0)
                let balance2 = await tcr.balanceOf(accounts[1])
                assert.equal(claimed[0].toString(), await web3.utils.toWei('50'))
                assert.equal(claimed[1].toString().slice(0, 4), await web3.utils.toWei('12.5').toString().slice(0, 4))
                assert.equal(balance2.sub(balance1).toString().slice(0, 4), web3.utils.toWei('12.5').toString().slice(0, 4))

                // Increase to 78 weeks = 26 + 26
                time.increase(39 * 7 * 24 * 60 * 60)
                let balance3 = await tcr.balanceOf(accounts[1])
                await vesting.claim(0, { from: accounts[1] })
                let claimed2 = await vesting.getVesting(accounts[1], 0)
                let balance4 = await tcr.balanceOf(accounts[1])
                assert.equal(balance4.sub(balance3).toString().slice(0, 4), web3.utils.toWei('12.5').toString().slice(0, 4))
                assert.equal(claimed2[0].toString().slice(0, 4), await web3.utils.toWei('50').toString().slice(0, 4))
                assert.equal(claimed2[1].toString().slice(0, 4), await web3.utils.toWei('25').toString().slice(0, 4))
            })


            it('Is linear over 3 years', async () => {
                let startTime = 0
                let endTime = 156 * 7 * 24 * 60 * 60 //3 years in secs

                // 25% after 39 weeks months
                var currentTime = 39 * 7 * 24 * 60 * 60
                let curve1 = await vesting.calcDistribution(web3.utils.toWei('50'), currentTime, startTime, endTime)
                assert.equal(curve1.toString(), await web3.utils.toWei('12.5'))

                // 75% after 117 weeks
                var currentTime = 117 * 7 * 24 * 60 * 60
                let curve2 = await vesting.calcDistribution(web3.utils.toWei('50'), currentTime, startTime, endTime)
                assert.equal(curve2.toString(), await web3.utils.toWei('37.5'))

                // 100% after 156 weeks
                var currentTime = 156 * 7 * 24 * 60 * 60
                let curve3 = await vesting.calcDistribution(web3.utils.toWei('50'), currentTime, startTime, endTime)
                assert.equal(curve3.toString(), await web3.utils.toWei('50'))

            })

            it('Doesnt let a user claim any more tokens once all are claimed', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156);

                //Increase to 2 years and claim all
                time.increase(156 * 7 * 24 * 60 * 60)
                let balanceBefore = await tcr.balanceOf(accounts[1])
                await vesting.claim(0, { from: accounts[1] })
                let balanceAfter = await tcr.balanceOf(accounts[1])
                assert.equal(balanceAfter.sub(balanceBefore).toString(), web3.utils.toWei('50'))

                //Increase another 6 months
                time.increase(26 * 7 * 24 * 60 * 60)
                let balanceBefore2 = await tcr.balanceOf(accounts[1])
                await vesting.claim(0,{ from: accounts[1] })
                let balanceAfter2 = await tcr.balanceOf(accounts[1])
                assert.equal(balanceAfter2.sub(balanceBefore2).toString(), web3.utils.toWei('0'))
            })

            it('Lets a user claim all your tokens after 3 years have passed', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156);

                //Increase to 3+ years and claim all
                time.increase(160 * 7 * 24 * 60 * 60)
                let balanceBefore = await tcr.balanceOf(accounts[1])
                await vesting.claim(0, { from: accounts[1] })
                let balanceAfter = await tcr.balanceOf(accounts[1])
                assert.equal(balanceAfter.sub(balanceBefore).toString(), web3.utils.toWei('50'))
            })

            it('Allows a user to claim all tokens when cliff = total duration', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 26);
                let userVesting = await vesting.getVesting(accounts[1], 0)
                assert.equal(userVesting[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting[1].toString(), await web3.utils.toWei('0'))

                time.increase(26 * 7 * 24 * 60 * 60)
                await vesting.claim(0, { from: accounts[1] })
                let claimed = await vesting.getVesting(accounts[1], 0)
                assert.equal(claimed[0].toString(), await web3.utils.toWei('50'))
                assert.equal(claimed[1].toString(), await web3.utils.toWei('50').toString())
            })

            it('With no cliff', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 0, 156);
                let userVesting = await vesting.getVesting(accounts[1], 0)
                assert.equal(userVesting[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting[1].toString(), await web3.utils.toWei('0'))

                time.increase(13 * 7 * 24 * 60 * 60)
                await vesting.claim(0, { from: accounts[1] })
                let claimed = await vesting.getVesting(accounts[1], 0)
                assert.equal(claimed[0].toString(), await web3.utils.toWei('50'))
                assert.equal(claimed[1].toString().slice(0, 6), await web3.utils.toWei('4.16666').toString().slice(0, 6))
            })

            it('Allows a user to claim against multiple schedules', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('150'))
                //Setup multiple vesting schedules
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 26);
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('100'), true, 26, 52);

                time.increase(26 * 7 * 24 * 60 * 60)
                let tokensBefore = await tcr.balanceOf(accounts[1])
                await vesting.claim(0, { from: accounts[1] })
                let claimed = await vesting.getVesting(accounts[1], 0)
                assert.equal(claimed[0].toString(), await web3.utils.toWei('50'))
                assert.equal(claimed[1].toString(), await web3.utils.toWei('50').toString())
                await vesting.claim(1, { from: accounts[1] })
                let claimed2 = await vesting.getVesting(accounts[1], 1)
                assert.equal(claimed2[0].toString(), await web3.utils.toWei('100'))
                assert.equal(claimed2[1].toString().slice(0,6), await web3.utils.toWei('50').toString().slice(0,6))
                let tokensAfter = await tcr.balanceOf(accounts[1])
                assert.equal(tokensAfter.sub(tokensBefore).toString().slice(0, 6), web3.utils.toWei('100').toString().slice(0, 6))
            })
        })
    })

    describe('cancel', () => {
        context('When the vesting schedule is not cancellable', () => {
            it('rejects cancelling', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156);

                await expectRevert(
                    vesting.cancelVesting(accounts[1], 0),
                    "Vesting: Account is fixed"
                )
            })
        })

        context('When the vesting schedule is cancellable', () => {
            it('Allows cancelling', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), false,26, 156);

                //Increase to 1 years and claim
                time.increase(78 * 7 * 24 * 60 * 60)
                let balanceBefore = await tcr.balanceOf(accounts[1])
                await vesting.claim(0, { from: accounts[1] })
                let balanceAfter = await tcr.balanceOf(accounts[1])
                assert.equal(balanceAfter.sub(balanceBefore).toString().slice(0, 4), web3.utils.toWei('25').toString().slice(0, 4))

                //Cancel (usually via a vote but can bypass sinnce account 0 is owner)
                await vesting.cancelVesting(accounts[1], 0)
                //Try claim at end of life --> wll throw
                time.increase(52 * 7 * 24 * 60 * 60)
                await expectRevert(
                    vesting.claim(0, { from: accounts[1] }),
                    "Vesting: No claimable tokens"
                )
            })
        })
    })

    describe('Withdraw', () => {
        context('When not owner', () => {
            it('rejects', async () => {
                await expectRevert(
                    vesting.withdraw(web3.utils.toWei("50"), { from: accounts[1] }),
                    "Ownable: caller is not the owner"
                )
            })
        })

        context('When the owner', () => {
            it('Allows withdrawing of TCR', async () => {
                let balanceStart = await tcr.balanceOf(accounts[0])
                await vesting.withdraw(web3.utils.toWei("50"))
                let balanceAfter = await tcr.balanceOf(accounts[0])
                assert.equal(balanceAfter.sub(balanceStart), web3.utils.toWei('50'))
            })

            it('Blocks withdrawing if tokens are locked', async () => {
                //Lock up 4999 tokens
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('4999'), true,26, 156);
                await expectRevert(
                    vesting.withdraw(web3.utils.toWei("2")),
                    "Vesting: amount > tokens leftover"
                )
            })
        })
    })
});
