// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NFT is ERC721, Ownable {
	using Counters for Counters.Counter;

    Counters.Counter private tokenId;

    constructor(string memory tokenName, string memory tokenSymbol) ERC721(tokenName, tokenSymbol) {}

	function mint(address _toAddress) public onlyOwner() {
		tokenId.increment();
		uint256 _tokenId = tokenId.current();
		_mint(_toAddress, _tokenId);
	}

	function getCurrentId() public view returns(uint256) {
		return tokenId.current();
	}
}
