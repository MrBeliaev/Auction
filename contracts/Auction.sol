// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Auction is Ownable, Pausable {
    using Counters for Counters.Counter;

    enum Status {
        Active,
        Ended,
        Canceled
    }

    struct Offer {
        address user;
        uint256 value;
    }

    struct AuctionInfo {
        uint256 id;
        address owner;
        address winner;
        address tokenAddress;
        uint256 tokenId;
        uint256 startPrice;
        Offer acceptedOffer;
        bool accepted;
        bool bought;
        Status auctionStatus;
    }

    Counters.Counter public auctionId;
    mapping(uint256 => AuctionInfo) public auctionsById;
    mapping(uint256 => Offer[]) public offers;

    event AuctionStarted(
        uint256 auctionId,
        address indexed owner,
        address indexed tokenAddress,
        uint256 tokenId,
        uint256 price
    );
    event NewOffer(uint256 auctionId, address indexed user, uint256 value);
    event OfferAccepted(uint256 auctionId, address indexed user, uint256 value);
    event Canceled(
        uint256 auctionId,
        address indexed owner,
        address indexed tokenAddress,
        uint256 tokenId
    );
    event Withdraw(
        uint256 auctionId,
        address indexed owner,
        address indexed winner,
        address indexed tokenAddress,
        uint256 tokenId,
        uint256 price
    );

    constructor() {}

    receive() external payable {}

    fallback() external payable {}

    function start(
        address _tokenAddress,
        uint256 _tokenId,
        uint256 _startPrice
    ) external payable whenNotPaused {
        IERC721(_tokenAddress).transferFrom(_msgSender(), owner(), _tokenId);
        auctionId.increment();
        AuctionInfo memory _info;
        _info.id = getCurrentAuctionId();
        _info.owner = _msgSender();
        _info.tokenAddress = _tokenAddress;
        _info.tokenId = _tokenId;
        _info.startPrice = _startPrice;
        _info.auctionStatus = Status.Active;
        auctionsById[getCurrentAuctionId()] = _info;
        emit AuctionStarted(
            getCurrentAuctionId(),
            _msgSender(),
            _tokenAddress,
            _tokenId,
            _startPrice
        );
    }

    function buy(uint256 _auctionId)
        external
        payable
        actualId(_auctionId)
        onlyActive(_auctionId)
    {
        uint256 _price = auctionsById[_auctionId].startPrice;
        transfers(_auctionId, _price);
        auctionsById[_auctionId].bought = true;
    }

    function setOffer(uint256 _auctionId, uint256 _value)
        external
        payable
        actualId(_auctionId)
        onlyActive(_auctionId)
    {
        Offer memory _newOffer;
        _newOffer.user = _msgSender();
        _newOffer.value = _value;
        offers[_auctionId].push(_newOffer);
        emit NewOffer(_auctionId, _msgSender(), _value);
    }

    function acceptOffer(uint256 _auctionId, Offer memory _acceptedOffer)
        external
        actualId(_auctionId)
        onlyActive(_auctionId)
        onlyAuctionsOwner(_auctionId)
    {
        auctionsById[_auctionId].acceptedOffer = _acceptedOffer;
        auctionsById[_auctionId].accepted = true;
        emit OfferAccepted(
            _auctionId,
            _acceptedOffer.user,
            _acceptedOffer.value
        );
    }

    function cancel(uint256 _auctionId)
        external
        actualId(_auctionId)
        onlyActive(_auctionId)
        onlyAuctionsOwner(_auctionId)
    {
        auctionsById[_auctionId].auctionStatus = Status.Canceled;
        address _tokenAddress = auctionsById[_auctionId].tokenAddress;
        uint256 _tokenId = auctionsById[_auctionId].tokenId;
        IERC721(_tokenAddress).transferFrom(owner(), _msgSender(), _tokenId);
        emit Canceled(_auctionId, _msgSender(), _tokenAddress, _tokenId);
    }

    function withdraw(uint256 _auctionId)
        external
        payable
        actualId(_auctionId)
    {
        require(
            _msgSender() == auctionsById[_auctionId].acceptedOffer.user &&
                auctionsById[_auctionId].accepted,
            "Only winner and accepted"
        );
        uint256 _value = auctionsById[_auctionId].acceptedOffer.value;
        transfers(_auctionId, _value);
    }

    function getAuctionInfo(uint256 _auctionId)
        external
        view
        returns (AuctionInfo memory)
    {
        return auctionsById[_auctionId];
    }

    function getOffers(uint256 _auctionId)
        external
        view
        returns (Offer[] memory)
    {
        return offers[_auctionId];
    }

    function getCurrentAuctionId() public view returns (uint256) {
        return auctionId.current();
    }

    function transfers(uint256 _auctionId, uint256 _value) internal {
        require(msg.value == _value, "Not correct value");
        // transfer coin
        address _owner = auctionsById[_auctionId].owner;
        bool sent = payable(_owner).send(_value);
        require(sent, "Failed to send");
        // transfer nft
        address _tokenAddress = auctionsById[_auctionId].tokenAddress;
        uint256 _tokenId = auctionsById[_auctionId].tokenId;
        IERC721(_tokenAddress).transferFrom(owner(), _msgSender(), _tokenId);
        auctionsById[_auctionId].auctionStatus = Status.Ended;
        auctionsById[_auctionId].winner = _msgSender();
        emit Withdraw(
            _auctionId,
            _owner,
            _msgSender(),
            _tokenAddress,
            _tokenId,
            _value
        );
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    modifier onlyAuctionsOwner(uint256 _auctionId) {
        require(
            auctionsById[_auctionId].owner == _msgSender(),
            "Only auctions owner"
        );
        _;
    }

    modifier actualId(uint256 _auctionId) {
        require(getCurrentAuctionId() >= _auctionId, "Auction not found");
        _;
    }

    modifier onlyActive(uint256 _auctionId) {
        require(
            auctionsById[_auctionId].auctionStatus == Status.Active,
            "Only Active Auctions"
        );
        _;
    }
}
