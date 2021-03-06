# Sigma Prime Offer

The Tracer DAO is proposing to engage with Sigma Prime for an audit on the Tracer protocol code - the codebase implementation is as detailed in the specifications outlined in the [Perpetual Swap Whitepaper](https://tracer.finance).

This process will be a month long process in which Sigma Prime will detail any errors with the Tracer Perpetual Swap codebase and initial factory smart contract implementation. Sigma Prime are a very reputable auditing agency, and if given this contract will begin to perform their service as of the 15th of March. The Lion’s Mane team would be working with Sigma Prime throughout the month period to fix any bugs and help them to navigate and understand the codebase. This initiative is in line with the details outlined in the initial Tracer Whitepaper (LINK), suggesting that the DAO should adhere to tight security standards in relation to any deployed smart contracts. 

The current Perpetual Swap codebase can be found here: [Lion's Mane Github](https://github.com/lions-mane).

## Remuneration

1. Sigma Prime has requested for 112050 USDC to be transferred immediately to pay for the audit. Sigma Prime Ethereum Address: 0x9CE6e6E4D9C9d6163258Db90a4AAB86ef4d1F7D5

2. No on-going payments will be made for the service.

## Deliverables

If Sigma Prime is engaged by by a DAO Proposal to provide the services described in this Offer to the DAO, it will provide the services outlined in the consultancy agreement

## Technical Implementation of Proposal

In order for Sigma Prime to be engaged to provide the services described in the Offer, the following targets and relevant proposal data must be passed to the DAO, via Proposal, by a current DAO member, in order to facilitate the execution of that Proposal. For each piece of Proposal data provided, the function encoded data that must be passed into the DAO is present, as well as the parameters and function calls used to generate this data. By utilising a package such as web3, any DAO member may verify this data using the web3.eth.abi.decodeParameters function (https://web3js.readthedocs.io/en/v1.2.11/web3-eth-abi.html#decodeparameters).

The steps that the DAO must execute in order to appoint Lion’s Mane are as follows:

Transfer 112050 USDC tokens to Sigma Prime (0x9CE6e6E4D9C9d6163258Db90a4AAB86ef4d1F7D5).

The following is the data that must be passed to the DAO, via Proposal, as well as the relevant raw data in order to verify the correctness of the Proposal data.

### Step 1

Name: Transfer 112050 USDC tokens to Sigma Prime\
Target: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 (USDC Token Address)\
proposalData: 0xa9059cbb0000000000000000000000009ce6e6e4d9c9d6163258db90a4aab86ef4d1f7d50000000000000000000000000000000000000000000017ba3e1fb5a817880000\
raw data: 
- Function: transfer
- Parameters:
    - Type: address
    - Name: recipient
    - Value: 0x9CE6e6E4D9C9d6163258Db90a4AAB86ef4d1F7D5
    - Type: uint256
    - Name: amount
    - Value: 112050000000000000000000