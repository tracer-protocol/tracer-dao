# Tracer DAO
The Tracer Decentralised Autonomous Organisation (DAO) maintains the Tracer Factory and services the needs of the Tracer ecosystem. Once deployed from the Factory, all financial contracts are permissionless with absolute economic and regulatory independence unless codified otherwise.

## Contracts
### DAOUpgradeable
An upgradeable DAO utilising a simple propose, vote and execute structure. Able to execute any abritrary action as voted on by DAO stakers.

### CustomUpgradeableProxy
A modified proxy contract allowing it to be upgraded by itself, in essence enabling the Tracer DAO to migrate to a new DAO implementation using the same original proxy via a simple vote, with no need to migrate tokens. All interactions with the DAO should be done via the `CustomUpgradeableProxy` contract.

### TCR
The Tracer ERC20 Token. Initial supply of 1 billion.

### Claim
The initial claim contract serves as a way to bootstrap the Tracer DAO. There is no address whitelisting, enabling 100 people to join the DAO, each receiving 100,000 tokens for doing so.

### Vesting
An initial linear vesting contract with a 6 month cliff and a total vesting period of 3 years. Upon claiming, initial claimers will have 99,999 TCR sent to the vesting contract to be claimed over the next 3 years.

## Contract Addresses
| Contract                   | Address                                                                 |
| :------------------------- | :---------------------------------------------------------------------: |
| `DAOUpgradeable`           | https://etherscan.io/address/0x515f2815c950c8385c1c3c30b63adf3207aa259a |
| `CustomUpgradeableProxy`   | https://etherscan.io/address/0xa84918f3280d488eb3369cb713ec53ce386b6cba |
| `TCR`                      | https://etherscan.io/address/0x9C4A4204B79dd291D6b6571C5BE8BbcD0622F050 |
| `Claim`                    | https://etherscan.io/address/0x2Ad3cf980eB7Cd382ebaf12C7C8D995bfEa17A11 |
| `Vesting`                  | https://etherscan.io/address/0x2B79E11984514Ece5B2Db561F49c0466cC7659EA |

### Running Tests
For compatibility with OpenZeppelin's upgrade functions, run `truffle compile --all && truffle test` to run the tests.
