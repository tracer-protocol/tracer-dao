// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/proxy/Initializable.sol";

contract DAOMock is Initializable {
    address public govToken;
    uint32 public warmUp; // time before voting can start
    uint32 public coolingOff; //cooling off period in hours
    uint32 public proposalDuration; // proposal duration in days
    uint32 public lockDuration; // time tokens are not withdrawable after voting or proposing
    uint32 public maxProposalTargets;
    uint96 public proposalThreshold;
    uint256 public totalStaked;
    uint256 internal proposalCounter;
    uint8 public quorumDivisor;

    mapping(uint256 => Proposal) internal proposals;

    struct Proposal {
        // The list of targets where calls will be made to
        address[] targets;
        // The list of the call datas for each individual call
        bytes[] proposalData;
    }

    function name() public view returns (string memory) {
        return "DAOMock";
    }

    function initialize(
        address _govToken,
        uint32 _maxProposalTargets,
        uint32 _warmUp,
        uint32 _coolingOff,
        uint32 _proposalDuration,
        uint32 _lockDuration,
        uint96 _proposalThreshold,
        uint8 _quorumDivisor
    ) public initializer {
        maxProposalTargets = _maxProposalTargets; //10
        govToken = _govToken;
        warmUp = _warmUp; //2days
        coolingOff = _coolingOff; //2days
        proposalDuration = _proposalDuration; //3days
        lockDuration = _lockDuration; //7days
        proposalThreshold = _proposalThreshold; //2e19
        quorumDivisor = _quorumDivisor; //2
    }

    /**
     * @notice Proposes a function execution on a contract by the governance contract.
     * @param targets the target contracts to execute the proposalData on
     * @param  proposalData ABI encoded data containing the function signature and parameters to be
     *         executed as part of this proposal.
     */
    function propose(address[] memory targets, bytes[] memory proposalData)
        public
    {
        proposals[proposalCounter] = Proposal({
            targets: targets,
            proposalData: proposalData
        });
        proposalCounter += 1;
    }

    /**
     * @notice Executes a given proposal. This calls a function on some contract
     * @dev Ensures execution succeeds but ignores return data
     * @param proposalId the id of the proposal to execute
     */
    function execute(uint256 proposalId) external {
        for (uint256 i = 0; i < proposals[proposalId].targets.length; i++) {
            (bool success, bytes memory data) = proposals[proposalId].targets[i]
                .call(proposals[proposalId].proposalData[i]);
            require(success, "DAO: Failed target execution");
        }
    }
}
