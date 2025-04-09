// test/SimpleVoting.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleVoting", function () {
  let SimpleVoting;
  let contract;
  let owner, voter1, voter2, voter3;

  before(async () => {
    [owner, voter1, voter2, voter3] = await ethers.getSigners();

    SimpleVoting = await ethers.getContractFactory("SimpleVoting");
    contract = await SimpleVoting.deploy();
    await contract.deployed();
  });

  describe("Deployment", () => {
    it("Should set the right owner", async () => {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("Should initialize with voting inactive", async () => {
      expect(await contract.votingActive()).to.be.false;
    });
  });

  describe("Candidate Management", () => {
    it("Should allow owner to add candidates", async () => {
      await contract.connect(owner).addCandidate("Alice");
      await contract.connect(owner).addCandidate("Bob");

      const candidates = await contract.getCandidates();
      expect(candidates).to.have.lengthOf(2);
    });

    it("Should prevent non-owners from adding candidates", async () => {
      await expect(
        contract.connect(voter1).addCandidate("Eve")
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Voting Process", () => {
    it("Should start and end voting correctly", async () => {
      // Start voting
      await contract.connect(owner).startVoting();
      expect(await contract.votingActive()).to.be.true;

      // End voting
      await contract.connect(owner).endVoting();
      expect(await contract.votingActive()).to.be.false;
    });

    it("Should handle voting correctly", async () => {
      // Reset and start new session
      await contract.connect(owner).startVoting();

      // First vote
      await contract.connect(voter1).vote("Alice");
      const voter1Data = await contract.voters(voter1.address);
      expect(voter1Data.hasVoted).to.be.true;

      // Second vote
      await contract.connect(voter2).vote("Bob");
      const candidateBob = await contract.candidates(1);
      expect(candidateBob.voteCount).to.equal(1);
    });

    it("Should prevent invalid votes", async () => {
      await expect(contract.connect(voter3).vote("Eve")).to.be.revertedWith(
        "Candidate does not exist"
      );
    });
  });

  describe("Edge Cases", () => {
    it("Should prevent double voting", async () => {
      await expect(contract.connect(voter1).vote("Alice")).to.be.revertedWith(
        "Already voted"
      );
    });

    it("Should prevent voting when inactive", async () => {
      await contract.connect(owner).endVoting();
      await expect(contract.connect(voter3).vote("Alice")).to.be.revertedWith(
        "Voting is not active"
      );
    });
  });

  describe("Winner Determination", () => {
    it("Should return correct winner", async () => {
      // Add tie scenario
      await contract.connect(owner).addCandidate("Charlie");
      await contract.connect(owner).startVoting();

      // Cast votes
      await contract.connect(voter3).vote("Charlie");
      await contract.connect(owner).endVoting();

      // Check winner
      const winner = await contract.getWinner();
      expect(["Alice", "Bob", "Charlie"]).to.include(winner);
    });

    it("Should handle empty candidates", async () => {
      const newContract = await SimpleVoting.deploy();
      await newContract.deployed();
      await expect(newContract.getWinner()).to.be.revertedWith("No candidates");
    });
  });
});
