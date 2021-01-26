# Lion’s Mane Offer
## Proposed Services Company
**Lion’s Mane**\
lionsmane.eth.link\
0xa6a006C12338cdcDbC882c6ab97E4F9F82340651\
## Summary
Lion’s Mane (a company incorporated in the BVI) (Lion’s Mane) offers its services to the Tracer DAO (DAO) in order to work with the DAO on the development of Tracer and the Tracer DAO (collectively, the Tracer Project).

## Remuneration
To assist in creating a thriving ecosystem for the Tracer Project, Lion’s Mane requests: 
1. $75,000 USD (or equivalent) per month (or part thereof) starting on the day that Lion’s Mane is engaged and ending when Lion’s Mane is no longer engaged by the DAO, to be paid on the last day of each calendar month. If a payment does not occur because the DAO has insufficient funds, the amount of that payment will accrue and be paid to Lion’s Mane when the DAO has sufficient funds to pay for that calendar month;
2. 21,500,000 TCR vested on the day that Lion’s Mane is engaged (if engaged);
3. 32,250,000 TCR vested on the day that is six months after the day that Lion’s Mane is engaged; and
4. 161,250,000 TCR vested on a pro rata basis over three years, starting on the day that Lion’s Mane is engaged,
for the incentivisation of the team’s current and future employees.

## Deliverables
If Lion’s Mane is engaged by a DAO Proposal to provide the services described in this Offer to the DAO, it will provide the following services (Deliverables):
1. Working with the DAO on the development of Tracer and the Tracer DAO;
2. Facilitating alpha and (if needed) beta testing of the Tracer DAO and Tracer, including, but not limited to, the procurement and presentation of persons for DAO selection (by way of DAO Proposal), development of testing infrastructure, and collection of feedback;
3. If the DAO votes to engage a third party to perform any audit process, working with that third party to assist that audit process;
4. Working with the DAO to establish a frontend for Tracer DAO TCR Holders to interact with the Governance Mechanism (DAO Frontend), including:
    1. If the DAO, by way of Proposal, engages a third party to host a DAO Frontend, facilitating that process; and
    2. If the DAO, by way of Proposal, builds and deploy its own DAO Frontend, facilitating that process;
5. Facilitating the establishment of a frontend for Tracer (including, but not limited to, establishing and managing an interface to the protocol, establishing and managing a Discord, establishing and managing a Twitter account and writing and posting whitepaper(s), articles, or other materials in relation to Tracer and the Tracer DAO);
6. Facilitating the transformation of successful DAO Proposals into code, to allow the Tracer DAO Schemes and Tracer Schemes to develop in accordance with successful DAO Proposals; and
7. Participating in discussions relating to the Tracer Project (including via community or private forums and any other interface used by Governance Token Holders or the public to discuss the Tracer Project or Proposals) and providing commentary and feedback in relation to the Tracer Project or Proposals.

## Commitments 
If Lion’s Mane is engaged to provide the Deliverables, it will:
1. For the first 12 months of its engagement, not:
    1. Vote in relation to a Proposal using those TCR tokens received in connection with this Offer; or 
    2. Commence a Proposal.
2. Prior to selling any TCR tokens received in connection with this Offer, make public, via Lion’s Mane’s website or social media accounts:
    1. When the tokens will be sold;
    2. Where and how the tokens will be sold; and
    3. Why the tokens are being sold. 
3. At the end of each quarter, make public, via Lion’s Mane’s website or social media accounts, its expenses incurred in relation to this Offer.
4. At the end of each quarter, make public and update, via Lion’s Mane’s website or social media accounts, a roadmap which details work which will be done for the next quarter in relation to this Offer.
5. At the end of each quarter, make public and update, via Lion’s Mane’s website or social media accounts, a breakdown of how it plans to allocate its resources (for example, between research and development, software development and community involvement) for the next quarter in relation to this Offer.

## Variation and Termination
1. Lion’s Mane acknowledges that, if engaged, its engagement can be varied by future Proposals; which Proposals, as noted above, Lion’s Mane cannot vote in favour of or against under certain circumstances.
2. Lion’s Mane expects that any engagement will be terminated if it fails to deliver in accordance with the Deliverables or Commitments specified above.


## Conflicts of Interest
In the context of the Tracer Project, conflicts of interest include:
1. Existing Service Providers who are Related Parties; and
2. Existing (vested and unvested) holdings of TCR tokens.

Lion’s Mane wishes to declare the following conflicts of interest:
1. No conflicts of interest to declare.

## Interpretation
Unless otherwise defined in this Offer, all terms beginning with a capital letter which are defined in the Participation Agreement shall have the same meanings herein as therein, unless the context hereof otherwise requires.
If this Offer is accepted as a Proposal under the Participation Agreement, Lion’s Mane may more formally document aspects of that Proposal.

## Technical Implementation of Proposal
In order for Lion’s Mane to be engaged to provide the services described in the Offer, the following targets and relevant Proposal data must be passed to the DAO, via Proposal, by a current DAO member, in order to facilitate the execution of that Proposal. For each piece of Proposal data provided, the function encoded data that must be passed into the DAO is provided below, as well as the parameters and function calls used to generate this data. By utilising a package such as web3, any DAO member may verify this data using the web3.eth.abi.decodeParameters function (https://web3js.readthedocs.io/en/v1.2.11/web3-eth-abi.html#decodeparameters).

Currently, Lion's Mane's request of $75,000 USD per month will be implemented as a social contract between the Tracer DAO and Lion’s Mane. These funds will only be requested by Lion's Mane once the Tracer DAO treasury holds $1,000,000 USD (or equivalent), or more, in reserves. In the future, Lion’s Mane will produce a template for this type of request, in order to allow future beneficiaries of successful Proposals to request funds from the Tracer DAO when the treasury is above a set amount in reserves, in a trustless way.

The steps that the DAO must execute in order to appoint Lion’s Mane are as follows:
1. Transfer 21500000 TCR tokens to the Lion’s Mane multisig (0xa6a006C12338cdcDbC882c6ab97E4F9F82340651).
2. Transfer 193500000 TCR to the Lion's Mane vesting contract (0x90D93f5A390bFDBC401f92e916197ee17470a447).
3. Set up a vesting schedule for 32250000 TCR to be transferred to the Lion’s Mane multisig exactly 6 months after the Proposal executes.
4. Set up a vesting schedule for 161250000 TCR to be linearly vested to the Lion’s Mane multisig over 3 years, claimable at any time during that period.

In order to formally pass this proposal to the DAO, the following must be submitted using the ```propose``` function
- targets = ["0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050", "0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050", "0x90D93f5A390bFDBC401f92e916197ee17470a447", "0x90D93f5A390bFDBC401f92e916197ee17470a447"]
- proposalData = ["0xa9059cbb000000000000000000000000a6a006c12338cdcdbc882c6ab97e4f9f8234065100000000000000000000000000000000000000000011c8cd55de35f505800000", "0xa9059cbb00000000000000000000000090d93f5a390bfdbc401f92e916197ee17470a447000000000000000000000000000000000000000000a00f3804cfe59d31800000", "0x7825e7b5000000000000000000000000a6a006c12338cdcdbc882c6ab97e4f9f823406510000000000000000000000000000000000000000001aad3400cd50ef884000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000001a", "0x7825e7b5000000000000000000000000a6a006c12338cdcdbc882c6ab97e4f9f82340651000000000000000000000000000000000000000000856204040294ada940000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000009c"]

### Step 1
Name: Transfer 21500000 TCR tokens to the Lion’s Mane multisig.\
Target: 0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050 (Tracer Token Address)\
proposalData: 0xa9059cbb000000000000000000000000a6a006c12338cdcdbc882c6ab97e4f9f8234065100000000000000000000000000000000000000000011c8cd55de35f505800000\
raw data: 
- Function: transfer
- Parameters:
    - Type: address
    - Name: recipient
    - Value: 0xa6a006C12338cdcDbC882c6ab97E4F9F82340651
    - Type: uint256
    - Name: amount
    - Value: 21500000000000000000000000

### Step 2
Name: Transfer 193500000 TCR to the proposed vesting contract.\
Target: 0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050 (Tracer Token Address)\
proposalData: 0xa9059cbb00000000000000000000000090d93f5a390bfdbc401f92e916197ee17470a447000000000000000000000000000000000000000000a00f3804cfe59d31800000\
raw data: 
- Function: transfer
- Parameters:
    - Type: address
    - Name: recipient
    - Value: 0x90D93f5A390bFDBC401f92e916197ee17470a447
    - Type: uint256
    - Name: amount
    - Value: 193500000000000000000000000

### Step 3
Name: Set up a vesting schedule for the Lion’s Mane multisig for 32250000 TCR to be released exactly 6 months after the Proposal executes.\
Target: 0x90D93f5A390bFDBC401f92e916197ee17470a447\
proposalData:
0x7825e7b5000000000000000000000000a6a006c12338cdcdbc882c6ab97e4f9f823406510000000000000000000000000000000000000000001aad3400cd50ef884000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000001a\
raw data: 
- Function: setVestingSchedule
- Parameters:
    - Type: address
    - Name: recipient
    - Value: 0xa6a006C12338cdcDbC882c6ab97E4F9F82340651
    - Type: uint256
    - Name: amount
    - Value: 32250000000000000000000000
    - Type: bool
    - Name: isFixed
    - Value: false
    - Type: uint256
    - Name: cliffWeeks
    - Value: 26
    - Type: uint256
    - Name: vestingWeeks
    - Value: 26

### Step 4
Name: Set Vesting for 161250000 TCR to be linearly vested over 3 years\
Target: 0x90D93f5A390bFDBC401f92e916197ee17470a447\
proposalData:
0x7825e7b5000000000000000000000000a6a006c12338cdcdbc882c6ab97e4f9f82340651000000000000000000000000000000000000000000856204040294ada940000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000009c\
raw data: 
- Function: setVestingSchedule
- Parameters:
    - Type: address
    - Name: recipient
    - Value: 0xa6a006C12338cdcDbC882c6ab97E4F9F82340651
    - Type: uint256
    - Name: amount
    - Value: 161250000000000000000000000
    - Type: bool
    - Name: isFixed
    - Value: false
    - Type: uint256
    - Name: cliffWeeks
    - Value: 0
    - Type: uint256
    - Name: vestingWeeks
    - Value: 156


## Copyright Waiver
Copyright and related rights are waived pursuant to CC0.
