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

    const setMaxTargetsData = web3.eth.abi.encodeFunctionCall(
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
        [100]
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

    /*
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
            await govToken.approve(gov.address, ether("100"))
            await govToken.approve(gov.address, ether("100"), { from: accounts[1] })
            await gov.stake(ether("100"))
            await gov.stake(ether("100"), { from: accounts[1] })

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
    */

    describe("Multisig data storage", () => {
        it("Can keep data about a proposal that exists during upgade", async () => {
            let currentProposalId = 0
            await govToken.approve(gov.address, ether("100"))
            await govToken.approve(gov.address, ether("100"), { from: accounts[1] })
            await gov.stake(ether("100"))
            await gov.stake(ether("100"), { from: accounts[1] })


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

            await gov.propose([gov.address], [setMaxTargetsData])
            await gov.propose([gov.address, gov.address], [upgradeToData, initializeMultisigData])
            await time.increase(warmup.add(one))
            await gov.vote(currentProposalId, true, ether("100"), { from: accounts[1] })
            await gov.vote(currentProposalId + 1, true, ether("100"), { from: accounts[1] }) // upgrade
            await time.increase(cooloff.add(one))
            await gov.execute(currentProposalId + 1);
            await gov.execute(currentProposalId)

            const multisigDao = await MultisigDAOUpgradeable.at(proxy.address)
            assert.equal(100, await multisigDao.maxProposalTargets())
        })
    })
})
