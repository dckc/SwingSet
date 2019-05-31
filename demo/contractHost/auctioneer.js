/* global E makePromise */
// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

// A Seller will provide a good to be auctioned and a currency in which bids
// must be expressed. The Auctioneer will create two seats which can offer
// CoveredBids. The highest CoveredBid will get the Seller's good, and a refund
// of the difference between the bids. The lower bid will get its money back.

// The bidders are called alan and barb internally, but as returned, they are
// merely the left and right seats.

// Caveats:
// The buyers want to know that the other seat isn't a shill for the seller.
// The buyers want assurances that their bids are secret. Hard on public chains.
// The Seller might like to provide a minimum price.
// The Auctioneer might want a cut before returning the proceeds to the seller.
// Notice that the auctioneer and the seller don't learn the winner's bid.
// function auctioneer(saleTerms, saleItem, currencyNeeded, inviteMaker) {
function auctioneer(saleTerms, inviteMaker) {
  // a Covered bid includes a bid amount that matches the currency specified by
  // the seller. phase1() provides access to the bid. abort() allows the bidder
  // to cancel before the auction closes. The winning bidder's winner() is
  // called, providing the goods and a refund of the difference between the
  // bids. loser() is called for the other bidder, returning their entire bid.
  function makeCoveredBid(escrowedBidP) {
    const bidP = E(currencyNeeded).getExclusiveAll(escrowedBidP, 'a bid');
    // this is the good if we won
    const winnings = makePromise();
    // might be whole or partial bid
    const refund = makePromise();
    return harden({
      phase1() {
        return bidP;
      },
      abort(reason) {
        winnings.reject(reason);
        refund.res(bidP);
      },
      winner(goods, overbid) {
        winnings.res(goods);
        refund.res(overbid);
      },
      loser() {
        winnings.reject();
        refund.res(bidP);
      },
    });
  }

  // Promise wiring /////////////////////////////////////////////////////////

  const alanPayment = makePromise();
  const alanTransfer = makeCoveredBid(saleTerms, alanPayment.p);

  const barbPayment = makePromise();
  const barbTransfer = makeCoveredBid(saleTerms, barbPayment.p);

  const sellerProceeds = makePromise();
  const returnedGoods = makePromise();

  // Why does escrow.js say 'TODO Use cancellation tokens instead'?
  const alanCancel = makePromise();
  const barbCancel = makePromise();
  const sellerCancel = makePromise();

  // The Auction ////////////////////////////////////////////////////////////

  const decisionP = Promise.race([
    Promise.all([alanTransfer.phase1(), barbTransfer.phase1()]),
    alanCancel.p,
    barbCancel.p,
  ]);
  decisionP.then(
    _ => {
      // compare bids
      const alanFunds = alanPayment.phase1();
      const barbFunds = barbPayment.phase1();
      const alanMargin =
        alanFunds.getXferBalance() - barbFunds.getXferBalance();
      if (alanMargin > 0) { // barb wins on ties
        const refund = alanFunds.transfer(alanMargin);
        sellerProceeds.res(alanFunds);
        alanPayment.winner(saleItem, refund);
        barbPayment.loser(barbFunds);
      } else {
        const refund = barbFunds.transfer(-alanMargin);
        sellerProceeds.res(barbFunds);
        barbPayment.winner(saleItem, refund);
        alanPayment.loser(alanFunds);
      }
    },
    reason => {
      alanTransfer.abort(reason);
      barbTransfer.abort(reason);
      returnedGoods.res(saleItem);
    },
  );

  // Seats //////////////////////////////////////////////////////////////////

  const alanSeat = harden({
    offer: alanPayment.res,
    cancel: alanCancel.reject,
    getWinnings: alanTransfer.getWinnings,
    getRefund: alanTransfer.getRefund,
  });

  const barbSeat = harden({
    offer: barbPayment.res,
    cancel: barbCancel.reject,
    getWinnings: barbTransfer.getWinnings,
    getRefund: barbTransfer.getRefund,
  });

  const sellerSeat = harden({
    cancel: sellerCancel.reject,
    getProceeds: sellerProceeds,
    noSale: returnedGoods,
  });

  return harden([
    inviteMaker.make('seller', sellerSeat),
    inviteMaker.make('left', alanSeat),
    inviteMaker.make('right', barbSeat),
  ]);
}

const auctioneerSrc = `(${auctioneer})`;

export { auctioneer, auctioneerSrc };
