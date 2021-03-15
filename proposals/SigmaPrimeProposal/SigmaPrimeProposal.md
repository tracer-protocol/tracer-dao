# Sigma Prime Offer

The Tracer DAO is considering engaging Sigma Prime for an audit of Tracer’s code.

This audit will likely be a month long process, during which Sigma Prime will detail any errors found with the Tracer Perpetual Swap codebase and initial factory smart contract implementation. Sigma Prime are a preeminent auditing team, and, if engaged by the Tracer DAO, will commence work on 15 March 2021. The Lion’s Mane team would work with Sigma Prime throughout the audit to fix any bugs and help them to navigate and understand the codebase.

The current Perpetual Swap codebase can be found [here](https://github.com/lions-mane/tracer-protocol).

## Remuneration

1. Sigma Prime has requested for 112050 USDT to be transferred immediately to pay for the audit. Sigma Prime Ethereum Address: 0x9CE6e6E4D9C9d6163258Db90a4AAB86ef4d1F7D5

2. No on-going payments will be made for the service.

## Deliverables

If Sigma Prime is engaged by by a DAO Proposal to provide the services described in this Offer to the DAO, it will provide the services outlined in the [consultancy agreement](https://github.com/lions-mane/tracer-dao/blob/sigmaprime-proposal/proposals/SigmaPrimeProposal/Sigma_Prime_Tracer_DAO_Consultancy_Agreement.pdf)

## Technical Implementation of Proposal

In order for Sigma Prime to be engaged to provide the services described in the Offer, the following targets and relevant proposal data must be passed to the DAO, via Proposal, by a current DAO member, in order to facilitate the execution of that Proposal. For each piece of Proposal data provided, the function encoded data that must be passed into the DAO is present, as well as the parameters and function calls used to generate this data. By utilising a package such as web3, any DAO member may verify this data using the web3.eth.abi.decodeParameters function (https://web3js.readthedocs.io/en/v1.2.11/web3-eth-abi.html#decodeparameters).

The steps that the DAO must execute in order to appoint Lion’s Mane are as follows:

Transfer 112050 USDT tokens to Sigma Prime (0x9CE6e6E4D9C9d6163258Db90a4AAB86ef4d1F7D5).

The following is the data that must be passed to the DAO, via Proposal, as well as the relevant raw data in order to verify the correctness of the Proposal data.

### Step 1

Name: Transfer 112050 USDT tokens to Sigma Prime\
Target: 0xdAC17F958D2ee523a2206206994597C13D831ec7 (USDT Token Address)\
proposalData: 0xa9059cbb0000000000000000000000009ce6e6e4d9c9d6163258db90a4aab86ef4d1f7d50000000000000000000000000000000000000000000000000000001a16b35080\
raw data: 
- Function: transfer
- Parameters:
    - Type: address
    - Name: recipient
    - Value: 0x9CE6e6E4D9C9d6163258Db90a4AAB86ef4d1F7D5
    - Type: uint256
    - Name: amount
    - Value: 112050000000