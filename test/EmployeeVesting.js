const TCR = artifacts.require("TracerToken");
const EmployeeVesting = artifacts.require("EmployeeVesting")
const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { assert } = require('chai');

contract('EmployeeVesting', (accounts) => {
    const oneDollar = new BN('1000000')
    const threeDays = 259200
    const twoDays = 172800
    let now

    let tcr, vesting
    beforeEach(async () => {
        tcr = await TCR.new(web3.utils.toWei('10000'), accounts[0])
        //set accounts 5 as the "DAO"
        vesting = await EmployeeVesting.new(tcr.address, accounts[5])
        await tcr.transfer(vesting.address, web3.utils.toWei('5000'))
        now = await time.latest()
    })

    describe('setVesting', () => {
        context('When not the owner', () => {
            it('fails', async () => {
                await expectRevert(
                    vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156, now, { from: accounts[1] }),
                    'Ownable: caller is not the owner'
                )
            })
        })

        context('When not enough tokens are held', () => {
            it('allows vesting to be set', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('51'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156, now);
                let userVesting = await vesting.getVesting(accounts[1], 0)
                assert.equal(userVesting[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting[1].toString(), await web3.utils.toWei('0'))
            })
        })

        context('When called by the owner with tokens', () => {
            it('Can set a vesting schedule', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156, now);
                let userVesting = await vesting.getVesting(accounts[1], 0)
                assert.equal(userVesting[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting[1].toString(), await web3.utils.toWei('0'))
            })

            it('Can set multiple vesting schedules per user', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))

                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156, now);
                let userVesting = await vesting.getVesting(accounts[1], 0)
                assert.equal(userVesting[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting[1].toString(), await web3.utils.toWei('0'))

                await tcr.transfer(vesting.address, web3.utils.toWei('50'))

                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('75'), true, 26, 156, now);
                let userVesting2 = await vesting.getVesting(accounts[1], 1)
                assert.equal(userVesting2[0].toString(), await web3.utils.toWei('75'))
                assert.equal(userVesting2[1].toString(), await web3.utils.toWei('0'))
            })

            it('Can set a past start date', async() => {
                let fiftyTwoWeeks = 52 * 7 * 24 * 60 * 60
                let twoOhEightWeeks = 208 * 7 * 24 * 60 * 60

                await tcr.transfer(vesting.address, web3.utils.toWei('50'))

                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 0, 208, now - fiftyTwoWeeks);
                let userVesting = await vesting.getVesting(accounts[1], 0)
                assert.equal(userVesting[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting[1].toString(), await web3.utils.toWei('0'))

                // claim
                // will receive 1/4 of 50 since vesting was set 52 weeks before now
                let balanceBeforeClaim = await tcr.balanceOf(accounts[1])
                await vesting.claim(0, { from: accounts[1] })
                let balanceAfterClaim = await tcr.balanceOf(accounts[1])
                assert.equal((balanceAfterClaim.sub(balanceBeforeClaim)).toString(), await web3.utils.toWei("12.5"))

                await vesting.setVestingSchedule(accounts[2], web3.utils.toWei('50'), true, 0, 208, now - twoOhEightWeeks);
                let userVesting2 = await vesting.getVesting(accounts[2], 0)
                assert.equal(userVesting2[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting2[1].toString(), await web3.utils.toWei('0'))

                // claim
                // will receive 1/4 of 50 since vesting was set 52 weeks before now
                let balanceBeforeClaim2 = await tcr.balanceOf(accounts[2])
                await vesting.claim(0, { from: accounts[2] })
                let balanceAfterClaim2 = await tcr.balanceOf(accounts[2])
                assert.equal((balanceAfterClaim2.sub(balanceBeforeClaim2)).toString(), await web3.utils.toWei("50"))
            })
        })
        
        context('When the owner create multiple vesting schedules', () => {
            it('succeeds', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('150'))
                await vesting.setVestingSchedules([accounts[1], accounts[2], accounts[3]],
                    [web3.utils.toWei('50'), web3.utils.toWei('50'), web3.utils.toWei('50')],
                    [true, true, true], [26, 26, 26], [156, 156, 156], [now, now, now]);

                //accounts 1
                let userVesting = await vesting.getVesting(accounts[1], 0)
                assert.equal(userVesting[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting[1].toString(), await web3.utils.toWei('0'))

                //accounts 2
                let userVesting2 = await vesting.getVesting(accounts[2], 0)
                assert.equal(userVesting2[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting2[1].toString(), await web3.utils.toWei('0'))

                //accounts 3
                let userVesting3 = await vesting.getVesting(accounts[3], 0)
                assert.equal(userVesting3[0].toString(), await web3.utils.toWei('50'))
                assert.equal(userVesting3[1].toString(), await web3.utils.toWei('0'))
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
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156, now);
                await expectRevert(
                    vesting.claim(0, { from: accounts[1] }),
                    'Vesting: cliffTime not reached'
                )
            })
        })

        context('When a user has no tokens to claim (amount = 0)', () => {
            it('fails', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('0'), true, 26, 156, now);
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
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156, now);
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
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156, now);

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

                // 25% after 39 weeks 
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
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156, now);

                //Increase to 2 years and claim all
                time.increase(156 * 7 * 24 * 60 * 60)
                let balanceBefore = await tcr.balanceOf(accounts[1])
                await vesting.claim(0, { from: accounts[1] })
                let balanceAfter = await tcr.balanceOf(accounts[1])
                assert.equal(balanceAfter.sub(balanceBefore).toString(), web3.utils.toWei('50'))

                //Increase another 6 months
                time.increase(26 * 7 * 24 * 60 * 60)
                let balanceBefore2 = await tcr.balanceOf(accounts[1])
                await vesting.claim(0, { from: accounts[1] })
                let balanceAfter2 = await tcr.balanceOf(accounts[1])
                assert.equal(balanceAfter2.sub(balanceBefore2).toString(), web3.utils.toWei('0'))
            })

            it('Lets a user claim all your tokens after 3 years have passed', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156, now);

                //Increase to 3+ years and claim all
                time.increase(160 * 7 * 24 * 60 * 60)
                let balanceBefore = await tcr.balanceOf(accounts[1])
                await vesting.claim(0, { from: accounts[1] })
                let balanceAfter = await tcr.balanceOf(accounts[1])
                assert.equal(balanceAfter.sub(balanceBefore).toString(), web3.utils.toWei('50'))
            })

            it('Allows a user to claim all tokens when cliff = total duration', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 26, now);
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
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 0, 156, now);
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
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 26, now);
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('100'), true, 26, 52, now);

                time.increase(26 * 7 * 24 * 60 * 60)
                let tokensBefore = await tcr.balanceOf(accounts[1])
                await vesting.claim(0, { from: accounts[1] })
                let claimed = await vesting.getVesting(accounts[1], 0)
                assert.equal(claimed[0].toString(), await web3.utils.toWei('50'))
                assert.equal(claimed[1].toString(), await web3.utils.toWei('50').toString())
                await vesting.claim(1, { from: accounts[1] })
                let claimed2 = await vesting.getVesting(accounts[1], 1)
                assert.equal(claimed2[0].toString(), await web3.utils.toWei('100'))
                assert.equal(claimed2[1].toString().slice(0, 6), await web3.utils.toWei('50').toString().slice(0, 6))
                let tokensAfter = await tcr.balanceOf(accounts[1])
                assert.equal(tokensAfter.sub(tokensBefore).toString().slice(0, 6), web3.utils.toWei('100').toString().slice(0, 6))
            })
        })
    })
    describe('cancel', () => {
        context('When the vesting schedule is not cancellable', () => {
            it('rejects cancelling', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), true, 26, 156, now);

                await expectRevert(
                    vesting.cancelVesting(accounts[1], 0, { from: accounts[5] }),
                    "Vesting: Account is fixed"
                )
            })
        })

        context('When the vesting schedule is called by owner', () => {
            it('cannot cancel', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), false, 26, 156, now);
                //Increase to 1 years and claim
                time.increase(78 * 7 * 24 * 60 * 60)
                let balanceBefore = await tcr.balanceOf(accounts[1])
                await vesting.claim(0, { from: accounts[1] })
                let balanceAfter = await tcr.balanceOf(accounts[1])
                assert.equal(balanceAfter.sub(balanceBefore).toString().slice(0, 4), web3.utils.toWei('25').toString().slice(0, 4))
                //Attempt to cancel the vesting as the owner account
                await expectRevert(
                    vesting.cancelVesting(accounts[1], 0),
                    "Vesting: Caller not DAO"
                )
            })
        })

        context('When the DAO is calling cancel vesting', () => {
            it('Allows cancelling ', async () => {
                await tcr.transfer(vesting.address, web3.utils.toWei('50'))
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('50'), false, 26, 156, now);
                //Increase to 1 years and claim
                time.increase(78 * 7 * 24 * 60 * 60)
                let balanceBefore = await tcr.balanceOf(accounts[1])
                await vesting.claim(0, { from: accounts[1] })
                let balanceAfter = await tcr.balanceOf(accounts[1])
                assert.equal(balanceAfter.sub(balanceBefore).toString().slice(0, 4), web3.utils.toWei('25').toString().slice(0, 4))
                //call function cancel vesting with DAO address
                await vesting.cancelVesting(accounts[1], 0, { from: accounts[5] })
                //Try claiming tokens post DAO cancellation at end of life -> will cancel
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
                await vesting.setVestingSchedule(accounts[1], web3.utils.toWei('4999'), true, 26, 156, now);
                await expectRevert(
                    vesting.withdraw(web3.utils.toWei("2")),
                    "Vesting: amount > tokens leftover"
                )
            })
        })

        context('setDAO', async () => {
            context('when called by owner', async() => {
                it('succeeds', async() => {
                    await vesting.setDAOAddress(accounts[1])
                    let dao = await vesting.DAO()
                    assert.equal(dao, accounts[1])
                })
            })

            context('when called by non owner', async() => {
                it('succeeds', async() => {
                    await expectRevert(
                        vesting.setDAOAddress(accounts[1], { from: accounts[1]}),
                        "Ownable: caller is not the owner"
                    )
                })
            })
        })
    })
});