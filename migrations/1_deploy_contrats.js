// migrations/2_deploy_contracts.js
const VotingToken = artifacts.require("VotingToken");
const VotingContract = artifacts.require("VotingContract");

module.exports = async function (deployer) {
  // Deploy with smaller initial parameters
  await deployer.deploy(VotingToken, "VoteToken", "VOTE");
  const token = await VotingToken.deployed();

  // Use smaller vote cost (1 token)
  const voteCost = web3.utils.toWei("1", "ether");

  await deployer.deploy(VotingContract, token.address, voteCost);
};
