const VoteToken = artifacts.require("VoteToken");
const VotingContract = artifacts.require("VotingContract");
const {
  expectRevert,
  expectEvent,
  constants,
} = require("@openzeppelin/test-helpers");

contract("VotingContract", (accounts) => {
  const [owner, voter1, voter2, voter3] = accounts;
  let token, votingContract;
  const voteCost = web3.utils.toWei("1", "ether");

  beforeEach(async () => {
    token = await VoteToken.new(1000, { from: owner });
    votingContract = await VotingContract.new(token.address, voteCost, {
      from: owner,
    });

    // Mint tokens to voters
    await token.mint(voter1, 2, { from: owner });
    await token.mint(voter2, 1, { from: owner });
    await token.mint(voter3, 1, { from: owner });

    // Approve voting contract for voters
    await token.approve(votingContract.address, voteCost, { from: voter1 });
    await token.approve(votingContract.address, voteCost, { from: voter2 });
    await token.approve(votingContract.address, voteCost, { from: voter3 });
  });

  it("should handle full voting process with tokens", async () => {
    // Add candidates
    await votingContract.addCandidate("Alice", { from: owner });
    await votingContract.addCandidate("Bob", { from: owner });

    // Start voting
    await votingContract.startVoting({ from: owner });

    // Vote
    await votingContract.vote("Alice", { from: voter1 });
    await votingContract.vote("Bob", { from: voter2 });

    // Test double voting prevention
    await expectRevert(
      votingContract.vote("Alice", { from: voter1 }),
      "Already voted"
    );

    // End voting
    await votingContract.endVoting({ from: owner });

    // Check results
    const winner = await votingContract.getWinner();
    assert.equal(winner, "Alice", "Incorrect winner");

    // Check token balances
    const contractBalance = await token.balanceOf(votingContract.address);
    assert.equal(
      contractBalance.toString(),
      voteCost * 2,
      "Incorrect token balance"
    );
  });

  it("should prevent voting without tokens", async () => {
    await votingContract.addCandidate("Alice", { from: owner });
    await votingContract.startVoting({ from: owner });

    // Try voting without approval
    await expectRevert(
      votingContract.vote("Alice", { from: voter3 }),
      "Token transfer failed"
    );
  });

  it("should handle case-insensitive voting", async () => {
    await votingContract.addCandidate("Alice", { from: owner });
    await votingContract.startVoting({ from: owner });

    await votingContract.vote("aLiCe", { from: voter1 });
    const candidate = await votingContract.candidates(0);
    assert.equal(
      candidate.voteCount.toString(),
      "1",
      "Case-insensitive vote failed"
    );
  });

  it("should allow token withdrawal", async () => {
    await votingContract.addCandidate("Alice", { from: owner });
    await votingContract.startVoting({ from: owner });
    await votingContract.vote("Alice", { from: voter1 });
    await votingContract.endVoting({ from: owner });

    const initialOwnerBalance = await token.balanceOf(owner);
    await votingContract.withdrawTokens({ from: owner });

    const finalOwnerBalance = await token.balanceOf(owner);
    assert.equal(
      finalOwnerBalance.sub(initialOwnerBalance).toString(),
      voteCost.toString(),
      "Withdrawal failed"
    );
  });
});
