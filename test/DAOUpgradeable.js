const { BN, constants, ether, expectEvent, expectRevert, time } = require("@openzeppelin/test-helpers")
const { web3 } = require("@openzeppelin/test-helpers/src/setup")
const TCR = artifacts.require("TracerToken")
const DAOUpgradeable = artifacts.require("TracerDAO")
const DAOEmpty = artifacts.require("DAOEmpty")
const DAOMock = artifacts.require("DAOMock")
const MultisigDAOUpgradeable = artifacts.require("TracerMultisigDAO")
const SelfUpgradeableProxy = artifacts.require("CustomUpgradeableProxy")
const Vesting = artifacts.require("TokenVesting")
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

contract("DAOUpgradable", async (accounts) => {
    const day = time.duration.days(1)
    const one = new BN("1")

    const twoDays = time.duration.days(2)
    const threeDays = time.duration.days(3)
    const sixDays = time.duration.days(6)
    const warmup = twoDays;
    const votingPeriod = threeDays;
    const cooloff = twoDays;

    let daoImpl;
    let daoMockImpl;
    let daoEmptyImpl;
    let govInitData;

    let govToken;
    let testToken;
    let gov;
    let proxy;

    const sampleProposalData = web3.eth.abi.encodeFunctionCall(
        {
            name: "setFeeReceiver",
            type: "function",
            inputs: [
                {
                    type: "address",
                    name: "receiver",
                },
            ],
        },
        [accounts[1]]
    )

    const proposeVestingData = web3.eth.abi.encodeFunctionCall(
        {
            name: "setVestingSchedule",
            type: "function",
            inputs: [
                {
                    type: "address",
                    name: "account",
                },
                {
                    type: "uint256",
                    name: "amount",
                },
                {
                    type: "bool",
                    name: "isFixed",
                },
                {
                    type: "uint256",
                    name: "cliffWeeks",
                },
                {
                    type: "uint256",
                    name: "vestingWeeks",
                }
            ],
        },
        [accounts[0], web3.utils.toWei("5"), true, 26, 156]
    )

    const setCoolingOffData = web3.eth.abi.encodeFunctionCall(
        {
            name: "setCoolingOff",
            type: "function",
            inputs: [
                {
                    type: "uint32",
                    name: "newProposalDuration",
                },
            ],
        },
        [1]
    )

    const setProposalThresholdData = web3.eth.abi.encodeFunctionCall(
        {
            name: "setProposalThreshold",
            type: "function",
            inputs: [
                {
                    type: "uint96",
                    name: "newThreshold",
                },
            ],
        },
        [1234]
    )

    beforeEach(async () => {
        // Stateless implementations
        daoImpl = await DAOUpgradeable.new()
        daoMockImpl = await DAOMock.new()
        daoEmptyImpl = await DAOEmpty.new()

        //Deploy a test token
        govToken = await TCR.new(ether("80000000000"), accounts[0]) // 80 billion
        testToken = await TCR.new(ether("1000000000"), accounts[0]) 
        govInitData = web3.eth.abi.encodeFunctionCall(
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
            [govToken.address, 10, 2*day, 2*day, 3*day, 7*day, ether("1"), 2]
        )


        for (var i = 1; i < 6; i++) {
            await govToken.transfer(accounts[i], ether("100"), { from: accounts[0] })
        }

        proxy = await SelfUpgradeableProxy.new(daoImpl.address, govInitData)
        gov = await DAOUpgradeable.at(proxy.address)
    })

    describe("Multisig upgradeability", () => {
        it("Deploys and upgrades", async () => {
            const instance = await deployProxy(
                DAOUpgradeable,
                [
                    govToken.address,
                    10,
                    2*day,
                    2*day,
                    3*day,
                    7*day,
                    ether("1"),
                    2
                ],
                { initializer: "initialize" }
            );

            instancev2 = await upgradeProxy(instance.address, MultisigDAOUpgradeable)
            await instancev2.initializeMultisig(accounts[5])
            await govToken.approve(instance.address, ether("100"))
            await instancev2.stake(ether("100"))
            await instancev2.propose([instance.address], [setCoolingOffData], true, "")
            await time.increase(twoDays.add(one));
            await instancev2.multisigVoteFor(0, { from: accounts[5] })
            assert.equal(1, await instancev2.coolingOff())
        })
    })

    describe("Multisig functionality", () => {
        beforeEach(async () => {
            multisigDaoImpl = await MultisigDAOUpgradeable.new()
            multisigProxy = await SelfUpgradeableProxy.new(multisigDaoImpl.address, govInitData)
            multisigGov = await MultisigDAOUpgradeable.at(multisigProxy.address)
            await multisigGov.initializeMultisig(accounts[5]);
        })
        it("Reverts if proposal is still warming up", async () => {
            await govToken.approve(multisigGov.address, ether("50"))
            await multisigGov.stake(ether("50"))
            await multisigGov.propose([multisigGov.address], [setCoolingOffData], true, "")
            await expectRevert(multisigGov.multisigVoteFor(0, { from: accounts[5] }), "DAO: Proposal warming up");
        })

        it("Reverts if proposal has already been executed", async () => {
            await govToken.approve(multisigGov.address, ether("100"))
            await multisigGov.stake(ether("100"))
            await multisigGov.propose([multisigGov.address], [setCoolingOffData], true, "")
            await time.increase(twoDays.add(one));
            await multisigGov.multisigVoteFor(0, { from: accounts[5] })
            assert.equal(1, await multisigGov.coolingOff())
            await expectRevert(multisigGov.multisigVoteFor(0, { from: accounts[5] }), "DAO: Proposal already executed")
        })

        it("Reverts if proposal is rejected", async () => {
            await govToken.approve(multisigGov.address, ether("50"))
            await multisigGov.stake(ether("50"))
            await govToken.approve(multisigGov.address, ether("100"), { from: accounts[2] })
            await multisigGov.stake(ether("100"), { from: accounts[2] })
            await multisigGov.propose([multisigGov.address], [setCoolingOffData], true, "")
            await time.increase(twoDays.add(one))
            await multisigGov.vote(0, false, ether("100"), { from: accounts[2] })
            await expectRevert(multisigGov.multisigVoteFor(0, { from: accounts[5] }), "DAO: Proposal rejected");
        })

        it("Reverts if multisig votes after deadline", async () => {
            await govToken.approve(multisigGov.address, ether("100"))
            await multisigGov.stake(ether("100"))
            await multisigGov.propose([multisigGov.address], [setCoolingOffData], true, "")
            await time.increase(sixDays.mul(new BN("2")))
            await expectRevert(multisigGov.multisigVoteFor(0, { from: accounts[5] }), "DAO: Multisig's deadline has passed");
        })

        it("Reverts if multisig is not allowed to vote", async () => {
            await govToken.approve(multisigGov.address, ether("100"))
            await multisigGov.stake(ether("100"))
            await multisigGov.propose([multisigGov.address], [setCoolingOffData], false, "")
            await time.increase(twoDays.add(one))
            await expectRevert(multisigGov.multisigVoteFor(0, { from: accounts[5] }), "DAO: Proposal does not allow multisig");
        })

        it("Allows for multisig to execute proposals even if it is staked", async () => {
            await govToken.approve(multisigGov.address, ether("100"))
            await multisigGov.stake(ether("100"))
            await govToken.approve(multisigGov.address, ether("100"), { from: accounts[5] })
            await multisigGov.stake(ether("100"), { from: accounts[5] })

            await multisigGov.propose([multisigGov.address], [setCoolingOffData], true, "")
            await time.increase(twoDays.add(one))
            await multisigGov.multisigVoteFor(0, { from: accounts[5] })
            assert.equal(1, await multisigGov.coolingOff())
        })

        it("Allows for multisig to execute proposals", async () => {
            await govToken.approve(multisigGov.address, ether("100"))
            await multisigGov.stake(ether("100"))
            await multisigGov.propose([multisigGov.address], [setCoolingOffData], true, "")
            await time.increase(twoDays.add(one))
            await multisigGov.multisigVoteFor(0, { from: accounts[5] })
            assert.equal(1, await multisigGov.coolingOff())
        })

        it("Allows for multisig to execute proposals after they have expired", async () => {
            await govToken.approve(multisigGov.address, ether("100"))
            await multisigGov.stake(ether("100"))
            await multisigGov.propose([multisigGov.address], [setCoolingOffData], true, "")
            await time.increase(warmup.add(votingPeriod.add(new BN("20")))); // Into the cool off period
            await multisigGov.multisigVoteFor(0, { from: accounts[5] })
            assert.equal(1, await multisigGov.coolingOff())
        })

        it("Appropriately sets the URI of a proposal", async () => {
            await govToken.approve(multisigGov.address, ether("100"))
            await multisigGov.stake(ether("100"))
            await multisigGov.propose([multisigGov.address], [setCoolingOffData], true, "https://test.com/file.txt")
            await time.increase(twoDays.add(one));
            assert.equal("https://test.com/file.txt", await multisigGov.getProposalURI(0))
            await multisigGov.multisigVoteFor(0, { from: accounts[5] })
            assert.equal(1, await multisigGov.coolingOff())
        })
    })

    describe("Multisig end-to-end", () => {
        it("Can operate a complete end-to-end", async () => {
            let currentProposalId = 0
            multisigDaoImpl = await MultisigDAOUpgradeable.new()
            // Initialize multisig before it gets approved, should be wiped on upgrade
            await multisigDaoImpl.initializeMultisig(accounts[5])
            // After deploying, initialize the multisig address
            const upgradeToData = web3.eth.abi.encodeFunctionCall(
                {
                    name: "upgradeTo",
                    type: "function",
                    inputs: [
                        { type: "address", name: "newImplementation" }
                    ],
                },
                [multisigDaoImpl.address]
            )
            const initializeMultisigData = web3.eth.abi.encodeFunctionCall(
                {
                    name: "initializeMultisig",
                    type: "function",
                    inputs: [
                        { type: "address", name: "_multisig" }
                    ],
                },
                [accounts[5]]
            )

            await govToken.approve(gov.address, ether("100"))
            await govToken.approve(gov.address, ether("100"), { from: accounts[1] })
            await gov.stake(ether("100"))
            await gov.stake(ether("100"), { from: accounts[1] })
            await gov.propose([gov.address, gov.address], [upgradeToData, initializeMultisigData])
            await time.increase(warmup.add(one))
            await gov.vote(currentProposalId, true, ether("100"), { from: accounts[1] })
            await time.increase(cooloff.add(one))
            await gov.execute(currentProposalId);

            const multisigDao = await MultisigDAOUpgradeable.at(proxy.address)
            await expectRevert(multisigDao.setCoolingOff(123), "DAO: Caller not governance")

            // Check to make sure data was saved from original DAO
            assert.equal(10, await multisigGov.maxProposalTargets())

            assert.equal(accounts[5], await multisigDao.multisig())

            await expectRevert(multisigDao.initializeMultisig(accounts[2]), "DAO: Multisig address already initialized");
            
            await multisigDao.propose([proxy.address], [setProposalThresholdData], true, "ipfs:/ipfs-url123123/image.jpg")
            currentProposalId++;
            await time.increase(twoDays.add(one))
            await multisigDao.multisigVoteFor(currentProposalId, { from: accounts[5] })
            assert.equal("ipfs:/ipfs-url123123/image.jpg", await multisigDao.getProposalURI(currentProposalId))
            assert.equal(1234, await multisigDao.proposalThreshold())

            await expectRevert(multisigDao.multisigVoteFor(currentProposalId, { from: accounts[5] }), "DAO: Proposal already executed")

            await multisigDao.propose([proxy.address], [setCoolingOffData], true, "")
            currentProposalId++;
            await expectRevert(multisigDao.multisigVoteFor(currentProposalId, { from: accounts[5] }), "DAO: Proposal warming up");

            await multisigDao.propose([proxy.address], [setCoolingOffData], false, "")
            currentProposalId++;
            await time.increase(warmup.add(one))
            await expectRevert(multisigDao.multisigVoteFor(currentProposalId, { from: accounts[5] }), "DAO: Proposal does not allow multisig");
        })
    })

    describe("upgradeTo()", () => {
        it("DAOMock", async () => {
            const proxy = await SelfUpgradeableProxy.new(daoMockImpl.address, govInitData)
            const govMock = await DAOMock.at(proxy.address)
            assert.equal(await govMock.name(), "DAOMock")

            const upgradeToData = web3.eth.abi.encodeFunctionCall(
                {
                    name: "upgradeTo",
                    type: "function",
                    inputs: [
                        { type: "address", name: "newImplementation" }
                    ],
                },
                [daoEmptyImpl.address]
            )

            await govMock.propose([govMock.address], [upgradeToData])
            await govMock.execute(0);

            const govEmpty = await DAOEmpty.at(proxy.address)
            assert.equal(await govEmpty.name(), "DAOEmpty")
        })

        it("Updates to multisig DAO", async () => {
            const proxy = await SelfUpgradeableProxy.new(daoMockImpl.address, govInitData)
            const govMock = await DAOMock.at(proxy.address)
            assert.equal(await govMock.name(), "DAOMock")

            multisigDaoImpl = await MultisigDAOUpgradeable.new()

            const upgradeToData = web3.eth.abi.encodeFunctionCall(
                {
                    name: "upgradeTo",
                    type: "function",
                    inputs: [
                        { type: "address", name: "newImplementation" }
                    ],
                },
                [multisigDaoImpl.address]
            )

            await govMock.propose([govMock.address], [upgradeToData])
            await govMock.execute(0);

            const multisigDao = await MultisigDAOUpgradeable.at(proxy.address)
            await multisigDao.initializeMultisig(accounts[5]);
            await expectRevert(multisigDao.initializeMultisig(accounts[2]), "DAO: Multisig address already initialized");

            assert.equal(await multisigDao.name(), "MultisigDAOUpgradeable")
        })

        it("DAO", async () => {
            assert.equal((await govToken.balanceOf(accounts[0])).toString(), (ether("79999999500")).toString())
            assert.equal((await gov.getStaked(accounts[0])).toNumber(), 0)

            await govToken.approve(gov.address, ether("100"))
            await govToken.approve(gov.address, ether("100"), { from: accounts[1] })
            await gov.stake(ether("100"))
            await gov.stake(ether("100"), { from: accounts[1] })

            const upgradeToData = web3.eth.abi.encodeFunctionCall(
                {
                    name: "upgradeTo",
                    type: "function",
                    inputs: [
                        { type: "address", name: "newImplementation" }
                    ],
                },
                [daoEmptyImpl.address]
            )

            await gov.propose([gov.address], [upgradeToData])
            //Fast fowrard through the warmup time
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, 100, { from: accounts[1] })
            //fast forward through the cooling off period
            await time.increase(twoDays.add(one))
            await gov.execute(0);

            const govEmpty = await DAOEmpty.at(proxy.address)
            assert.equal(await govEmpty.name(), "DAOEmpty") //DAO was upgraded

        })
    })

    describe("stake", () => {
        it("reverts if gov is not approved to transfer", async () => {
            await expectRevert(gov.stake(ether("50")), "ERC20: transfer amount exceeds allowance")
        })

        it("reverts if staking more than tokens held", async () => {
            await govToken.approve(gov.address, ether("101"), { from: accounts[1] })
            await expectRevert(
                gov.stake(ether("101"), { from: accounts[1] }),
                "ERC20: transfer amount exceeds balance"
            )
        })

        it("reverts if stake amount would overflow", async () => {
            await govToken.approve(gov.address, constants.MAX_UINT256)
            await gov.stake(ether("50"))
            await expectRevert(
                gov.stake(new BN("79228162514264337593543950335")), // MAX_UINT95 - 1
                "SafeMath96: addition overflow"
            )
        })

        it("starts accounts with 0 staked", async () => {
            const staked = await gov.getStaked(accounts[2])
            assert.isTrue(staked.eq(new BN("0")))
        })

        it("increases totalStaked by the amount staked", async () => {
            await govToken.approve(gov.address, constants.MAX_UINT256)
            await gov.stake(ether("50"))
            const totalStaked = await gov.totalStaked()
            assert.isTrue(totalStaked.eq(ether("50")))
        })

        it("transfers the staked tokens to the Gov contract", async () => {
            await govToken.approve(gov.address, constants.MAX_UINT256)
            await gov.stake(ether("50"))
            const balance = await govToken.balanceOf(gov.address)
            assert.isTrue(balance.eq(ether("50")))
        })

        it("updates the staked amount of the user", async () => {
            await govToken.approve(gov.address, constants.MAX_UINT256)
            await gov.stake(ether("50"))
            const staked = await gov.getStaked(accounts[0])
            assert.isTrue(staked.eq(ether("50")))
        })

        it("uses an expected amount of gas", async () => {
            await govToken.approve(gov.address, constants.MAX_UINT256)
            const { receipt } = await gov.stake(ether("50"))
            assert.isAtMost(receipt.gasUsed, 112000)
        })

        it("uses an expected amount of gas for additional stakes", async () => {
            await govToken.approve(gov.address, constants.MAX_UINT256)
            await gov.stake(ether("25"))
            const { receipt } = await gov.stake(ether("25"))
            assert.isAtMost(receipt.gasUsed, 67000)
        })
    })

    describe("withdraw", () => {
        context("after staking", () => {
            beforeEach(async () => {
                await govToken.approve(gov.address, ether("50"))
                await gov.stake(ether("50"))
            })

            it("reverts if withdrawing more than tokens staked", async () => {
                await expectRevert(gov.withdraw(ether("51")), "SafeMath96: subtraction overflow")
            })

            it("updates the staked amount of the user", async () => {
                await gov.withdraw(ether("50"))
                const staked = await gov.getStaked(accounts[0])
                assert.isTrue(staked.eq(new BN("0")))
            })

            it("uses an expected amount of gas", async () => {
                const { receipt } = await gov.withdraw(ether("50"))
                assert.isAtMost(receipt.gasUsed, 30000)
            })

            it("uses an expected amount of gas for additional withdrawals", async () => {
                await gov.withdraw(ether("25"))
                const { receipt } = await gov.withdraw(ether("25"))
                assert.isAtMost(receipt.gasUsed, 30000)
            })

        })
    })

    describe("propose", () => {
        it("reverts if the proposer does not have enough staked", async () => {
            //Stake 0.1 TCR when min vote is 1
            await govToken.approve(gov.address, ether("0.9"))
            await gov.stake(ether("0.9"))
            await expectRevert(
                gov.propose([accounts[0]], [sampleProposalData]),
                "DAO: staked amount < threshold"
            )
        })

        context("with enough staked", () => {
            beforeEach(async () => {
                await govToken.approve(gov.address, ether("50"))
                await gov.stake(ether("50"))
            })

            it("reverts if no target is specified", async () => {
                await expectRevert(gov.propose([], [sampleProposalData]), "DAO: 0 targets")
            })

            it("reverts if too many targets supplied", async () => {
                await expectRevert(
                    gov.propose(
                        [
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                            accounts[0],
                        ],
                        [sampleProposalData]
                    ),
                    "DAO: Too many targets"
                )
            })

            it("reverts if argument length mismatch", async () => {
                await expectRevert(
                    gov.propose(
                        [accounts[0], accounts[0],  accounts[0], accounts[0]],
                        [sampleProposalData, sampleProposalData]
                    ),
                    "DAO: Argument length mismatch"
                )
            })

            it("stores the successful proposal", async () => {
                await gov.propose([accounts[0]], [sampleProposalData])
                const proposal = await gov.proposals(0)
                const staked = await gov.getStaked(accounts[0])
                assert.equal(accounts[0], proposal.proposer)
                assert.isTrue(proposal.yes.eq(staked))
                assert.equal(0, proposal.no)
                assert.equal(0, proposal.passTime)
                const EnumProposedNum = 0;
                assert.equal(EnumProposedNum, proposal.state)
            })

            it("emits a ProposalCreated event", async () => {
                const { receipt } = await gov.propose([accounts[0]], [sampleProposalData])
                expectEvent(receipt, "ProposalCreated", {
                    proposalId: "0",
                })
            })

            it("uses an expected amount of gas", async () => {
                const { receipt } = await gov.propose([accounts[0]], [sampleProposalData])
                assert.isAtMost(receipt.gasUsed, 300000)
            })
        })
    })

    describe("vote", () => {
        beforeEach(async () => {
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await govToken.approve(gov.address, ether("50"), { from: accounts[2] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"), { from: accounts[2] })
            await gov.propose([accounts[0]], [sampleProposalData])
        })

        it("reverts if the proposal hasn't started", async () => {
            await expectRevert(gov.vote(0, true, ether("50"), { from: accounts[1] }), "DAO: Proposal warming up")
        })

        context("after the proposal is ready", () => {
            beforeEach(async () => {
                await time.increase(twoDays.add(one))
            })

            it("reverts if called by the proposer", async () => {
                await expectRevert(gov.vote(0, true, ether("50")), "DAO: Proposer cannot vote")
            })

            it("reverts if expired", async () => {
                await time.increase(twoDays.mul(new BN("200")))
                await expectRevert(gov.vote(0, true, ether("50"), { from: accounts[1] }), "DAO: Proposal Expired")
            })

            it("reverts if proposal was passed", async () => {
                // total staked is 150, 50 voted true from proposer, 26 additional required to pass 50% threshold.
                await gov.vote(0, true, ether("26"), { from: accounts[1] })
                await expectRevert(
                    gov.vote(0, true, ether("1"), { from: accounts[2] }),
                    "DAO: Proposal not voteable"
                )
            })

            it("reverts if proposal was rejected", async () => {
                await govToken.approve(gov.address, ether("50"), { from: accounts[3] })
                await gov.stake(ether("50"), { from: accounts[3] })
                // total staked is 200, requires 100 'against' votes to pass 50% threshold.
                await gov.vote(0, false, ether("50"), { from: accounts[1] })
                await gov.vote(0, false, ether("50"), { from: accounts[2] })
                await expectRevert(
                    gov.vote(0, false, ether("1"), { from: accounts[3] }),
                    "DAO: Proposal not voteable"
                )
            })

            it("reverts if proposal was executed", async () => {
                await gov.vote(0, true, ether("50"), { from: accounts[1] })
                await time.increase(twoDays.add(one))
                await gov.execute(0)
                await expectRevert(
                    gov.vote(0, true, ether("1"), { from: accounts[2] }),
                    "DAO: Proposal not voteable"
                )
            })

            it("reverts if voting with more tokens than staked", async () => {
                await expectRevert(
                    gov.vote(0, true, ether("51"), { from: accounts[1] }),
                    "DAO: staked amount < voting amount"
                )
            })

            it("allows voting both yes and no", async () => {
                await gov.vote(0, false, ether("25"), { from: accounts[1] })
                await gov.vote(0, true, ether("25"), { from: accounts[1] })
            })

            it("reverts if proposal has expired", async () => {
                await time.increase(threeDays.add(one))
                await expectRevert(
                    gov.vote(0, true, ether("50"), { from: accounts[2] }),
                    "DAO: Proposal Expired"
                )
            })

        })
    })

    describe("execute", () => {
        beforeEach(async () => {
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
        })

        it("reverts if the proposalId does not exist", async () => {
            await expectRevert(gov.execute(0), "DAO: Proposal state != PASSED")
        })

        it("reverts if the proposal has not passed", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await expectRevert(gov.execute(0), "DAO: Proposal state != PASSED")
        })

        it("reverts if the proposal was rejected", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, false, ether("50"), { from: accounts[1] })
            const proposal = await gov.proposals(0)
            const EnumRejectedNum = 3;
            assert.equal(EnumRejectedNum, proposal.state)
            await expectRevert(gov.execute(0), "DAO: Proposal state != PASSED")
        })

        it("reverts if the proposal was already executed", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(twoDays.add(one))
            await gov.execute(0)
            const proposal = await gov.proposals(0)
            const EnumExecutedNum = 2;
            assert.equal(EnumExecutedNum, proposal.state)
            await expectRevert(gov.execute(0), "DAO: Proposal state != PASSED")
        })

        it("reverts if the proposal is still cooling off", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await expectRevert(gov.execute(0), "DAO: Cooling off period not done")
        })

        it("reverts if the target function call fails", async () => {
            await gov.propose([gov.address], [sampleProposalData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(twoDays.add(one))
            await expectRevert(gov.execute(0), "DAO: Failed target execution")
        })

        it("executes internal function calls", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(threeDays.add(one))
            await gov.execute(0)
            assert.equal(1, await gov.coolingOff())
        })

        it("executes external function calls", async () => {
            let vesting = await Vesting.new(govToken.address)
            await vesting.transferOwnership(gov.address)
            await govToken.transfer(vesting.address, web3.utils.toWei("10"))
            await gov.propose([vesting.address], [proposeVestingData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(threeDays.add(one))
            await gov.execute(0)
            let vestingDetails = await vesting.getVesting(accounts[0], 0)
            assert.equal((web3.utils.toWei("5")).toString(), vestingDetails[0].toString())
        })
    })

    describe("setCoolingOff", () => {
        beforeEach(async () => {
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
        })

        it("reverts when called by an external account", async () => {
            await expectRevert(gov.setCoolingOff(0), "DAO: Caller not governance")
        })

        it("sets through a proposal", async () => {
            await gov.propose([gov.address], [setCoolingOffData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(threeDays.add(one))
            await gov.execute(0)
            assert.equal(1, await gov.coolingOff())
        })
    })

    describe("setWarmUp", () => {
        const setWarmUpData = web3.eth.abi.encodeFunctionCall(
            {
                name: "setWarmUp",
                type: "function",
                inputs: [
                    {
                        type: "uint32",
                        name: "newWarmup",
                    },
                ],
            },
            [1]
        )

        beforeEach(async () => {
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
        })

        it("reverts when called by an external account", async () => {
            await expectRevert(gov.setWarmUp(0), "DAO: Caller not governance")
        })

        it("sets through a proposal", async () => {
            await gov.propose([gov.address], [setWarmUpData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(threeDays.add(one))
            await gov.execute(0)
            assert.equal(1, await gov.warmUp())
        })
    })

    describe("setProposalDuration", () => {
        const setProposalDurationData = web3.eth.abi.encodeFunctionCall(
            {
                name: "setProposalDuration",
                type: "function",
                inputs: [
                    {
                        type: "uint32",
                        name: "newProposalDuration",
                    },
                ],
            },
            [1]
        )

        beforeEach(async () => {
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
        })

        it("reverts when called by an external account", async () => {
            await expectRevert(gov.setProposalDuration(0), "DAO: Caller not governance")
        })

        it("sets through a proposal", async () => {
            await gov.propose([gov.address], [setProposalDurationData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(threeDays.add(one))
            await gov.execute(0)
            assert.equal(1, await gov.proposalDuration())
        })
    })

    describe("setLockDuration", () => {
        const setLockDurationData = web3.eth.abi.encodeFunctionCall(
            {
                name: "setLockDuration",
                type: "function",
                inputs: [
                    {
                        type: "uint32",
                        name: "newLockDuration",
                    },
                ],
            },
            [1]
        )

        beforeEach(async () => {
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
        })

        it("reverts when called by an external account", async () => {
            await expectRevert(gov.setLockDuration(0), "DAO: Caller not governance")
        })

        it("sets through a proposal", async () => {
            await gov.propose([gov.address], [setLockDurationData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(threeDays.add(one))
            await gov.execute(0)
            assert.equal(1, await gov.lockDuration())
        })
    })

    describe("setMaxProposalTargets", () => {
        const setMaxProposalTargetsData = web3.eth.abi.encodeFunctionCall(
            {
                name: "setMaxProposalTargets",
                type: "function",
                inputs: [
                    {
                        type: "uint32",
                        name: "newMaxProposalTargets",
                    },
                ],
            },
            [1]
        )

        beforeEach(async () => {
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
        })

        it("reverts when called by an external account", async () => {
            await expectRevert(gov.setMaxProposalTargets(0), "DAO: Caller not governance")
        })

        it("sets through a proposal", async () => {
            await gov.propose([gov.address], [setMaxProposalTargetsData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(threeDays.add(one))
            await gov.execute(0)
            assert.equal(1, await gov.maxProposalTargets())
        })
    })

    describe("setProposalThreshold", () => {
        const setProposalThresholdData = web3.eth.abi.encodeFunctionCall(
            {
                name: "setProposalThreshold",
                type: "function",
                inputs: [
                    {
                        type: "uint96",
                        name: "newThreshold",
                    },
                ],
            },
            [1]
        )

        beforeEach(async () => {
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
        })

        it("reverts when called by an external account", async () => {
            await expectRevert(gov.setProposalThreshold(0), "DAO: Caller not governance")
        })

        it("sets through a proposal", async () => {
            await gov.propose([gov.address], [setProposalThresholdData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(threeDays.add(one))
            await gov.execute(0)
            assert.equal(1, await gov.proposalThreshold())
        })
    })

    describe("erc20Withdraw", () => {
        beforeEach(async () => {
            await govToken.transfer(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
        })

        it("Reverts if transfer fails", async () => {
            const withdrawERC20FailData = web3.eth.abi.encodeFunctionCall(
                {
                    name: "withdrawEC20",
                    type: "function",
                    inputs: [
                        {
                            type: "address",
                            name: "token",
                        },
                        {
                            type: "address",
                            name: "to",
                        },
                        {
                            type: "uint256",
                            name: "amount",
                        },
                    ],
                },
                [testToken.address, accounts[0], ether("1000")]
            )
            await gov.propose([gov.address], [withdrawERC20FailData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(threeDays.add(one))
            await expectRevert.unspecified(gov.execute(0))
        })

        it("Reverts if caller isnt the DAO", async () => {
            await testToken.transfer(gov.address, ether('50'))
            await expectRevert.unspecified(gov.withdrawERC20(govToken.address, accounts[0], ether("50")))
        })

        it("Transfers", async () => {
            await testToken.transfer(gov.address, ether("50"))
            const withdrawERC20Data = web3.eth.abi.encodeFunctionCall(
                {
                    name: "withdrawERC20",
                    type: "function",
                    inputs: [
                        {
                            type: "address",
                            name: "token",
                        },
                        {
                            type: "address",
                            name: "to",
                        },
                        {
                            type: "uint256",
                            name: "amount",
                        },
                    ],
                },
                [testToken.address, accounts[0], ether("50")]
            )
            let balanceBefore = await testToken.balanceOf(accounts[0])
            await gov.propose([gov.address], [withdrawERC20Data])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(threeDays.add(one))
            await gov.execute(0)
            let balanceAfter = await testToken.balanceOf(accounts[0])
            assert.equal((balanceAfter.sub(balanceBefore)).toString(), (ether("50")).toString())
        })
    })

    describe("ethWithdraw", () => {
        beforeEach(async () => {
            await govToken.transfer(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"))
            await govToken.approve(gov.address, ether("50"), { from: accounts[1] })
            await gov.stake(ether("50"))
            await gov.stake(ether("50"), { from: accounts[1] })
            await gov.sendTransaction({ from: accounts[1], value: ether("5")})
        })

        it("Reverts if transfer fails", async () => {
            const withdrawERC20FailData = web3.eth.abi.encodeFunctionCall(
                {
                    name: "withdrawETH",
                    type: "function",
                    inputs: [
                        {
                            type: "address",
                            name: "to",
                        },
                        {
                            type: "uint256",
                            name: "amount",
                        },
                    ],
                },
                [ accounts[0], ether("1000")]
            )
            await gov.propose([gov.address], [withdrawERC20FailData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(threeDays.add(one))
            await expectRevert.unspecified(gov.execute(0))
        })

        it("Reverts if caller isnt the DAO fails", async () => {
            await expectRevert.unspecified(gov.withdrawETH(accounts[0], ether("50")))
        })

        it("Transfers", async () => {
            await testToken.transfer(gov.address, ether("50"))
            const withdrawETHData = web3.eth.abi.encodeFunctionCall(
                {
                    name: "withdrawETH",
                    type: "function",
                    inputs: [
                        {
                            type: "address",
                            name: "to",
                        },
                        {
                            type: "uint256",
                            name: "amount",
                        },
                    ],
                },
                [accounts[3], ether("5")]
            )
            let balanceBefore = new BN(await web3.eth.getBalance(accounts[3]))
            await gov.propose([gov.address], [withdrawETHData])
            await time.increase(twoDays.add(one))
            await gov.vote(0, true, ether("50"), { from: accounts[1] })
            await time.increase(threeDays.add(one))
            await gov.execute(0)
            let balanceAfter = new BN(await web3.eth.getBalance(accounts[3]))
            assert.equal((balanceAfter.sub(balanceBefore)).toString(), (ether("5")).toString())
        })
    })

})