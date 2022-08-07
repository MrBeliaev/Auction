const TestNFT = artifacts.require('NFT')
const Auction = artifacts.require('Auction')

const AuctionStatus = {
    Active: "0",
    Ended: "1",
    Canceled: "2"
}
const zeroAddress = "0x"+"0".repeat(40)

contract('Auction', ([owner, user1, user2, user3, user4, user5, user6, user7, user8, user9]) => {
    it('Deploy', async () => {
        testnft = await TestNFT.new("TestNFT", "NFT")
        auction = await Auction.new()
        console.log("TestNFT deployed to:", testnft.address)
        console.log("Auction deployed to:", auction.address)
    })
    it('Mint NFT', async () => {
        await testnft.mint(user1)
        user1NFTId = (await testnft.getCurrentId()).toString()
        await testnft.mint(user2)
        user2NFTId = (await testnft.getCurrentId()).toString()
        await testnft.mint(user3)
        user3NFTId = (await testnft.getCurrentId()).toString()
        let owner1 = await testnft.ownerOf(user1NFTId)
        let owner2 = await testnft.ownerOf(user2NFTId)
        let owner3 = await testnft.ownerOf(user3NFTId)
        assert.equal(owner1, user1)
        assert.equal(owner2, user2)
        assert.equal(owner3, user3)
    })
    it('start from user1, event AuctionStarted', async () => {
        startPrice1 = web3.utils.toWei("10", "ether")
        await testnft.approve(auction.address, user1NFTId, {from: user1})
        AuctionStarted = await auction.start(testnft.address, user1NFTId, startPrice1, {from: user1})
        user1AuctionId = (await auction.getCurrentAuctionId()).toString()
        const log = AuctionStarted.logs[0]
        assert.equal(log.event, 'AuctionStarted')
        const event = log.args
        assert.equal(event.auctionId.toString(), user1AuctionId)
        assert.equal(event.owner, user1)
        assert.equal(event.tokenAddress, testnft.address)
        assert.equal(event.tokenId.toString(), user1NFTId)
        assert.equal(event.price.toString(), startPrice1)
    })
    it('start from user2, user3', async () => {
        startPrice2 = web3.utils.toWei("20", "ether")
        await testnft.approve(auction.address, user2NFTId, {from: user2})
        await auction.start(testnft.address, user2NFTId, startPrice2, {from: user2})
        user2AuctionId = (await auction.getCurrentAuctionId()).toString()
        startPrice3 = web3.utils.toWei("30", "ether")
        await testnft.setApprovalForAll(auction.address, true, {from: user3})
        await auction.start(testnft.address, user3NFTId, startPrice3, {from: user3})
        user3AuctionId = (await auction.getCurrentAuctionId()).toString()
        let owner2 = await testnft.ownerOf(user2NFTId)
        assert.equal(owner2, owner)
        let owner3 = await testnft.ownerOf(user3NFTId)
        assert.equal(owner3, owner)
    })
    it('buy error "Auction not found"', async () => {
        try {
            await auction.buy(10, {from: user4, value: startPrice1})
        } catch (e) {
            assert(e.message, "Auction not found")
        }
    })
    it('getAuctionInfo 1', async () => {
        let info = await auction.getAuctionInfo(user1AuctionId)
        assert.equal(info.id.toString(), user1AuctionId)
        assert.equal(info.owner, user1)
        assert.equal(info.winner, zeroAddress)
        assert.equal(info.tokenAddress, testnft.address)
        assert.equal(info.tokenId.toString(), user1NFTId)
        assert.equal(info.startPrice.toString(), startPrice1)
        assert.equal(info.acceptedOffer.user, zeroAddress)
        assert.equal(info.acceptedOffer.value, 0)
        assert.equal(info.accepted, false)
        assert.equal(info.bought, false)
        assert.equal(info.auctionStatus.toString(), AuctionStatus.Active)
    })
    it('buy user4 user1Auction, event Withdraw', async () => {
        await testnft.setApprovalForAll(auction.address, true)
        balanceUser1Before = web3.utils.fromWei(await web3.eth.getBalance(user1), "ether")
        balanceUser4Before = web3.utils.fromWei(await web3.eth.getBalance(user4), "ether")
        Withdraw = await auction.buy(user1AuctionId, {from: user4, value: startPrice1})
        balanceUser1After = web3.utils.fromWei(await web3.eth.getBalance(user1), "ether")
        balanceUser4After = web3.utils.fromWei(await web3.eth.getBalance(user4), "ether")
        let owner1 = await testnft.ownerOf(user1NFTId)
        assert.equal(owner1, user4)
        const log = Withdraw.logs[0]
        assert.equal(log.event, 'Withdraw')
        const event = log.args
        assert.equal(event.auctionId.toString(), user1AuctionId)
        assert.equal(event.owner, user1)
        assert.equal(event.winner, user4)
        assert.equal(event.tokenAddress, testnft.address)
        assert.equal(event.tokenId.toString(), user1NFTId)
        assert.equal(event.price.toString(), startPrice1)
        assert.equal(balanceUser1After-balanceUser1Before, web3.utils.fromWei(startPrice1, "ether"))
        assert.equal(Math.round(balanceUser4Before)-Math.round(balanceUser4After), web3.utils.fromWei(startPrice1, "ether"))
    })
    it('buy error "Only Active Auctions"', async () => {
        try {
            await auction.buy(user1AuctionId, {from: user4, value: startPrice1})
        } catch (e) {
            assert(e.message, "Only Active Auctions")
        }
    })
    it('getAuctionInfo 1', async () => {
        let info = await auction.getAuctionInfo(user1AuctionId)
        assert.equal(info.id.toString(), user1AuctionId)
        assert.equal(info.owner, user1)
        assert.equal(info.winner, user4)
        assert.equal(info.tokenAddress, testnft.address)
        assert.equal(info.tokenId.toString(), user1NFTId)
        assert.equal(info.startPrice.toString(), startPrice1)
        assert.equal(info.acceptedOffer.user, zeroAddress)
        assert.equal(info.acceptedOffer.value, 0)
        assert.equal(info.accepted, false)
        assert.equal(info.bought, true)
        assert.equal(info.auctionStatus.toString(), AuctionStatus.Ended)
    })
    it('setOffers to user2AuctionId, event NewOffer', async () => {
        user4ToUser2Offer = web3.utils.toWei("15", "ether")
        NewOffer = await auction.setOffer(user2AuctionId, user4ToUser2Offer, {from: user4})
        user5ToUser2Offer = web3.utils.toWei("16", "ether")
        await auction.setOffer(user2AuctionId, user5ToUser2Offer, {from: user5})
        user6ToUser2Offer = web3.utils.toWei("18", "ether")
        await auction.setOffer(user2AuctionId, user6ToUser2Offer, {from: user6})
        const log = NewOffer.logs[0]
        assert.equal(log.event, 'NewOffer')
        const event = log.args
        assert.equal(event.auctionId.toString(), user2AuctionId)
        assert.equal(event.user, user4)
        assert.equal(event.value.toString(), user4ToUser2Offer)
    })
    it('getOffers', async () => {
        offers = await auction.getOffers(user2AuctionId)
        assert.equal(offers.length, 3)
        // console.log(offers)
    })
    it('acceptOffer error "Only auctions owner"', async () => {
        try {
            await auction.acceptOffer(
                user2AuctionId, {user: user6, value: user6ToUser2Offer}, {from: user1})
        } catch (e) {
            assert(e.message, "Only auctions owner")
        }
    })
    it('acceptOffer user6, event OfferAccepted', async () => {
        OfferAccepted = await auction.acceptOffer(
            user2AuctionId, {user: user6, value: user6ToUser2Offer}, {from: user2})
        const log = OfferAccepted.logs[0]
        assert.equal(log.event, 'OfferAccepted')
        const event = log.args
        assert.equal(event.auctionId.toString(), user2AuctionId)
        assert.equal(event.user, user6)
        assert.equal(event.value.toString(), user6ToUser2Offer)
    })
    it('withdraw error "Only winner and accepted"', async () => {
        try {
            await auction.withdraw(user2AuctionId, {from: user4, value: user6ToUser2Offer})
        } catch (e) {
            assert(e.message, "Only winner and accepted")
        }
    })
    it('withdraw error "Not correct value"', async () => {
        try {
            await auction.withdraw(user2AuctionId, {from: user6, value: user5ToUser2Offer})
        } catch (e) {
            assert(e.message, "Not correct value")
        }
    })
    it('withdraw', async () => {
        balanceUser2Before = web3.utils.fromWei(await web3.eth.getBalance(user2), "ether")
        balanceUser6Before = web3.utils.fromWei(await web3.eth.getBalance(user6), "ether")
        await auction.withdraw(user2AuctionId, {from: user6, value: user6ToUser2Offer})
        balanceUser2After = web3.utils.fromWei(await web3.eth.getBalance(user2), "ether")
        balanceUser6After = web3.utils.fromWei(await web3.eth.getBalance(user6), "ether")
        let owner2 = await testnft.ownerOf(user2NFTId)
        assert.equal(owner2, user6)
        assert.equal(balanceUser2After-balanceUser2Before, web3.utils.fromWei(user6ToUser2Offer, "ether"))
        assert.equal(Math.round(balanceUser6Before)-Math.round(balanceUser6After), web3.utils.fromWei(user6ToUser2Offer, "ether"))
    })
    it('getAuctionInfo 2', async () => {
        let info = await auction.getAuctionInfo(user2AuctionId)
        assert.equal(info.id.toString(), user2AuctionId)
        assert.equal(info.owner, user2)
        assert.equal(info.winner, user6)
        assert.equal(info.tokenAddress, testnft.address)
        assert.equal(info.tokenId.toString(), user2NFTId)
        assert.equal(info.startPrice.toString(), startPrice2)
        assert.equal(info.acceptedOffer.user, user6)
        assert.equal(info.acceptedOffer.value, user6ToUser2Offer)
        assert.equal(info.accepted, true)
        assert.equal(info.bought, false)
        assert.equal(info.auctionStatus.toString(), AuctionStatus.Ended)
    })
    it('cancel user3, event Canceled', async () => {
        Canceled = await auction.cancel(user3AuctionId, {from: user3})
        let owner3 = await testnft.ownerOf(user3NFTId)
        assert.equal(owner3, user3)
        const log = Canceled.logs[0]
        assert.equal(log.event, 'Canceled')
        const event = log.args
        assert.equal(event.auctionId.toString(), user3AuctionId)
        assert.equal(event.owner, user3)
        assert.equal(event.tokenAddress, testnft.address)
        assert.equal(event.tokenId.toString(), user3NFTId)
    })
    it('getAuctionInfo 3', async () => {
        let info = await auction.getAuctionInfo(user3AuctionId)
        assert.equal(info.id.toString(), user3AuctionId)
        assert.equal(info.owner, user3)
        assert.equal(info.winner, zeroAddress)
        assert.equal(info.tokenAddress, testnft.address)
        assert.equal(info.tokenId.toString(), user3NFTId)
        assert.equal(info.startPrice.toString(), startPrice3)
        assert.equal(info.acceptedOffer.user, zeroAddress)
        assert.equal(info.acceptedOffer.value, 0)
        assert.equal(info.accepted, false)
        assert.equal(info.bought, false)
        assert.equal(info.auctionStatus.toString(), AuctionStatus.Canceled)
    })
})
