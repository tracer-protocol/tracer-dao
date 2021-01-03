const HDWalletProvider = require("@truffle/hdwallet-provider");
const mnemonic = ""

module.exports = {
  // Uncommenting the defaults below
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
    },
    test: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
    },
    DAODEPLOY: {
      network_id: '1',
      gasPrice: 95000000000,
      provider: function() {
        return new HDWalletProvider(mnemonic, "");
      },
    },
  },
  //
  // Configure your compilers
  compilers: {
    solc: {
      version: '0.6.12', // Fetch exact version from solc-bin (default: truffle's version)
      settings: {
        // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: false,
          runs: 200,
        },
        evmVersion: 'constantinople',
      },
    },
  },
  plugins: [
    'truffle-plugin-verify'
  ]
}
