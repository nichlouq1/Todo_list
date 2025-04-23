import "./VotingToken.sol";
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// VotingToken.sol
contract VoteToken is ERC20, Ownable {
    // Add constructor with required parameters
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) Ownable(msg.sender) { // Pass msg.sender to Ownable
        // Your initialization code...
    }
    
    // Rest of your contract...
}
contract VotingContract {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    struct Voter {
        bool hasVoted;
        string votedFor;
    }

    address public owner;
    IERC20 public immutable token;
    uint256 public immutable voteCost;
    mapping(address => Voter) public voters;
    Candidate[] public candidates;
    mapping(bytes32 => uint256) private candidateNameToIndex;
    bool public votingActive;

    event Voted(address indexed voter, string candidate, uint256 cost);
    event VotingStarted();
    event VotingEnded();

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier whenVotingActive() {
        require(votingActive, "Voting is not active");
        _;
    }

    modifier whenVotingInactive() {
        require(!votingActive, "Voting is active");
        _;
    }

    constructor(address _tokenAddress, uint256 _voteCost) {
        owner = msg.sender;
        token = IERC20(_tokenAddress);
        voteCost = _voteCost;
    }

    function toLower(string memory _str) internal pure returns (string memory) {
        bytes memory strBytes = bytes(_str);
        bytes memory lowerBytes = new bytes(strBytes.length);
        for (uint256 i = 0; i < strBytes.length; i++) {
            if ((uint8(strBytes[i]) >= 65) && (uint8(strBytes[i]) <= 90) )
            {
                lowerBytes[i] = bytes1(uint8(strBytes[i]) + 32);
            } else {
                lowerBytes[i] = strBytes[i];
            }
        }
        return string(lowerBytes);
    }

    function addCandidate(string memory _name) public onlyOwner whenVotingInactive {
        string memory normalizedName = toLower(_name);
        bytes32 nameHash = keccak256(bytes(normalizedName));
        require(candidateNameToIndex[nameHash] == 0, "Candidate exists");
        
        candidates.push(Candidate({
            name: _name,
            voteCount: 0
        }));
        candidateNameToIndex[nameHash] = candidates.length;
    }

    function startVoting() public onlyOwner whenVotingInactive {
        require(candidates.length > 0, "No candidates added");
        votingActive = true;
        emit VotingStarted();
    }

    function vote(string memory _candidateName) public whenVotingActive {
        Voter storage sender = voters[msg.sender];
        require(!sender.hasVoted, "Already voted");
        
        require(token.transferFrom(msg.sender, address(this), voteCost), 
            "Token transfer failed");

        string memory normalizedName = toLower(_candidateName);
        bytes32 nameHash = keccak256(bytes(normalizedName));
        uint256 candidateIndex = candidateNameToIndex[nameHash];
        require(candidateIndex != 0, "Candidate does not exist");

        Candidate storage candidate = candidates[candidateIndex - 1];
        candidate.voteCount++;
        
        sender.hasVoted = true;
        sender.votedFor = candidate.name;
        emit Voted(msg.sender, candidate.name, voteCost);
    }

    function endVoting() public onlyOwner whenVotingActive {
        votingActive = false;
        emit VotingEnded();
    }

    function getWinner() public view returns (string memory) {
        require(!votingActive, "Voting is active");
        require(candidates.length > 0, "No candidates");
        
        uint256 winningVoteCount = 0;
        uint256 winningIndex = 0;
        
        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > winningVoteCount) {
                winningVoteCount = candidates[i].voteCount;
                winningIndex = i;
            }
        }
        
        return candidates[winningIndex].name;
    }

    function withdrawTokens() public onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        token.transfer(owner, balance);
    }
}