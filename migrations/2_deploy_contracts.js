const Auction = artifacts.require("Auction");
const NFT = artifacts.require("NFT");

module.exports = function (deployer) {
  deployer.deploy(Auction);
  deployer.deploy(NFT, "Test", "Test");
};