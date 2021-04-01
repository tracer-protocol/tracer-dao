# RMIT Blockchain Innovation Hub research collaboration with the Tracer DAO and participation in governance
## Summary

RMIT Blockchain Innovation Hub (a research centre within RMIT University) (RMIT BIH) proposes a research collaboration (section 1) with the Tracer DAO for the development of governance and cryptoeconomic design relating to Tracer and the Tracer DAO (collectively, the Tracer Project). 

In parallel (section 2) some members of the RMIT Blockchain Innovation Hub will participate in Tracer and the Tracer DAO and will be allocated governance tokens in order to do so. These members do not represent RMIT University or the RMIT Blockchain Innovation Hub, and governance decisions made as members of the Tracer DAO should not be understood to be the decisions of RMIT University.

In order to ensure that these members are able to participate in Tracer governance as the network grows and governance tokens are released to the community, the Tracer DAO will provide 17,500,000 Tracer governance tokens (TCR) over 2 years. 2% will be released upfront, and the remaining 98% will be released linearly over 2 years. This may be stopped temporarily or permanently depending on member participation.
## 1. RMIT Blockchain Innovation Hub research collaboration
### 1.1 Deliverables

If this DAO Proposal is accepted, RMIT BIH commits to (Deliverables):

1. Participating in four conferences (two per year during the Term) discussing Tracer related content;

2. Publishing 24 Medium articles relating to Tracer (10 during the first 6 months of the Term, 8 during the second 6 months of the Term, 4 during the third 6 months of the Term and 2 during the final 6 months of the Term);

3. Publishing four academic papers, within a relevant research journal, in accordance with the “Academic research topics” section below;

4. Speaking at events relating to Tracer, within a conference-like setting (at least 1 per year during the Term);

5. Hosting or co-hosting DeFi conferences and events (at least one per year during the Term);

6. Sponsoring teams relevant to the Tracer DAO (including Service Providers) in events, including hackathons and workshops (at least once during the Term); and

7. Promoting job opportunities relevant to the Tracer DAO through relevant RMIT BIH portals.

8. At the end of each quarter, make public and update, via RMIT BIH’s website or social media accounts, a roadmap which details work which will be done for the next quarter in relation to this Offer.

### 1.2 Academic research topics 

The four research papers that will be published either as working papers or in peer reviewed journals by RMIT BIH during the Term are: 

1. A publication pertaining to Tracer’s technical governance specifications, the theoretical grounds for their selection, and implementation;

2. A publication pertaining to an analysis of oracle economics, and what the market can take from oracles’ role within the Tracer ecosystem;

3. A reflective publication documenting any insights, findings, or key takeaways relating to DeFi governance or economics regarding Tracer. The aim of this is to contribute to the development of the literature about DeFi governance; and

4. Another topic to be decided by RMIT BIH in its reasonable discretion and in collaboration with other members of the Tracer community. 

### 1.3 Medium/Blog Article Topics

24 Medium/blog articles that will be published by RMIT BIH pertaining to the Tracer project and its ecosystem. 

### 1.4 Variation and Termination

1. RMIT BIH acknowledges that its engagement can be varied by future Proposals.

2. RMIT BIH expects that any engagement will be terminated if it fails to deliver in accordance with the Deliverables or Commitments specified above.

### 1.5 Conflicts of Interest

RMIT BIH wishes to declare the following conflicts of interest:

- No conflicts of interest to declare.

### 1.6 Interpretation

If this Offer is accepted as a Proposal under the Participation Agreement, RMIT BIH may more formally document aspects of that Proposal.

## 2. Participation in governance

RMIT University cannot be a member of a DAO. However, some members of the RMIT Blockchain Innovation Hub are able to do so in their private capacity.

Individual members will participate in Tracer governance. This participation will draw on the public research of RMIT Blockchain Innovation Hub into Tracer, decentralised finance, and blockchain governance. 

Participation will include but not be limited to:

1. Voting on each Tracer DAO Proposal;

2. Regularly commencing Proposals (at least one Proposal every six months); and

3. Actively engage on Tracer’s communications channels, including at least one monthly post.

These members will exercise their own judgment independent of RMIT University in making governance decisions, and will not be acting as agents of RMIT University while doing so.
## Technical Implementation of Proposal

In order for RMIT to be engaged to provide the services described in the Offer, the following targets and relevant proposalData must be passed to the DAO, via proposal, by a current DAO member, in order to facilitate the execution of that proposal. For each piece of proposal data provided, the function encoded data that must be passed into the DAO is present, as well as the parameters and function calls used to generate this data. By utilising a package such as web3, any DAO member may verify this data using [the web3.eth.abi.decodeParameters function](https://web3js.readthedocs.io/en/v1.2.11/web3-eth-abi.html#decodeparameters).

The steps that the DAO must execute in order to appoint RMIT are as follows:

1. Transfer 350000 TCR tokens to the RMIT multisig

2. Transfer 17150000 TCR tokens to the vesting contract

3. Set up a vesting schedule for 17150000 TCR to be linearly vested to the RMIT multisig over 2 years, claimable at any time during that period

### Step 1

name: Transfer 350000 TCR tokens to the RMIT multisig

target: 0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050

proposalData: 

0xa9059cbb00000000000000000000000071c56d72f1a37eb19e596d7262bb8e07d157a708000000000000000000000000000000000000000000004a1d89bb94865ec00000

raw data:
- Function: transfer
- Parameters:
    - Type: address
    - Name: to
    - Value: 0x71C56D72f1A37eB19E596d7262BB8e07D157A708

    - Type: uint256
    - Name: amount
    - Value: 350000000000000000000000

### Step 2

name: Transfer 17150000 TCR to the vesting contract

target: 0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050

proposalData: 
0xa9059cbb00000000000000000000000090d93f5a390bfdbc401f92e916197ee17470a4470000000000000000000000000000000000000000000e2fa75ce76db822c00000

raw data:
- Function: transfer
- Parameters:
    - Type: address
    - Name: to
    - Value: 0x90d93f5a390bfdbc401f92e916197ee17470a447

    - Type: uint256
    - Name: amount
    - Value: 17150000000000000000000000

### Step 3

name: Set vesting for 17150000 TCR to be linearly vested over 2 years

target: 0x90d93f5a390bfdbc401f92e916197ee17470a447

proposalData: 0x7825e7b500000000000000000000000071c56d72f1a37eb19e596d7262bb8e07d157a7080000000000000000000000000000000000000000000e2fa75ce76db822c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000068

raw data:
- Function: setVestingSchedule
- Parameters:
    - Type: address
    - Name: account
    - Value: 0x71C56D72f1A37eB19E596d7262BB8e07D157A708

    - Type: uint256
    - Name: amount
    - Value: 17150000000000000000000000

    - Type: bool
    - Name: isFixed
    - Value: false

    - Type: uint256
    - Name: cliffWeeks
    - Value: 0

    - Type: uint256
    - Name: vestingWeeks
    - Value: 104