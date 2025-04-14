// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimpleVoting {
    struct Candidate {
        string name;
        uint voteCount;
    }

    struct Voter {
        bool hasVoted;
        string votedFor;
    }

    address public owner;
    IERC20 public votingToken;  // ERC20 token contract
    uint public tokenFee;       // Tokens required to vote

    mapping(address => Voter) public voters;
    Candidate[] public candidates;
    bool public votingActive;

    event Voted(address indexed voter, string candidate);
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

    constructor(address _tokenAddress, uint _tokenFee) {
        owner = msg.sender;
        votingToken = IERC20(_tokenAddress);
        tokenFee = _tokenFee; // e.g., 1 * 10**18 for 1 token (depending on decimals)
    }

    function addCandidate(string memory _name) public onlyOwner whenVotingInactive {
        candidates.push(Candidate({name: _name, voteCount: 0}));
    }

    function startVoting() public onlyOwner whenVotingInactive {
        votingActive = true;
        emit VotingStarted();
    }

    function vote(string memory _candidateName) public whenVotingActive {
        Voter storage sender = voters[msg.sender];
        require(!sender.hasVoted, "Already voted");

        // Transfer tokens to contract as a fee
        require(votingToken.transferFrom(msg.sender, address(this), tokenFee), "Token transfer failed");

        bool candidateFound = false;
        for (uint i = 0; i < candidates.length; i++) {
            if (keccak256(abi.encodePacked(candidates[i].name)) == keccak256(abi.encodePacked(_candidateName))) {
                candidates[i].voteCount++;
                candidateFound = true;
                break;
            }
        }
        require(candidateFound, "Candidate does not exist");

        sender.hasVoted = true;
        sender.votedFor = _candidateName;

        emit Voted(msg.sender, _candidateName);
    }

    function endVoting() public onlyOwner whenVotingActive {
        votingActive = false;
        emit VotingEnded();
    }

    function getWinner() public view returns (string memory) {
        require(!votingActive, "Voting is still active");
        require(candidates.length > 0, "No candidates");

        uint256 winningVoteCount = 0;
        uint256 winningCandidateIndex = 0;

        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > winningVoteCount) {
                winningVoteCount = candidates[i].voteCount;
                winningCandidateIndex = i;
            }
        }

        return candidates[winningCandidateIndex].name;
    }

    // Owner can withdraw collected tokens
    function withdrawTokens(address to) public onlyOwner {
        uint balance = votingToken.balanceOf(address(this));
        require(votingToken.transfer(to, balance), "Withdraw failed");
    }
}
