// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { insist } from '../../collections/insist';

function makeBidder(E, host, log) {
  let initialized = false;

  let myMoneyPurseP;
  let moneyIssuerP;

  let goodsIssuerP;

  let auctioneerSource;

  const bidder = harden({
    init(myMoneyPurse, myStockPurse, auctioneer) {
      inviteIssuerP = E(host).getInviteIssuer();

      myMoneyPurseP = E.resolve(myMoneyPurse);
      moneyIssuerP = E(myMoneyPurseP).getIssuer();

      goodsIssuerP = goodsIssuer;

      auctioneerSource = auctioneer;

      initialized = true;
      // eslint-disable-next-line no-use-before-define
      return bidder; // bidder and init use each other
    },

    payBobWell(bob) {
      log('++ bidder.payBobWell starting');
      insist(initialized)`\
ERR: alan.payBobWell called before init()`;

      const paymentP = E(myMoneyPurseP).withdraw(10);
      return E(bob).buy('shoe', paymentP);
    },

    acceptOption(allegedInvitePaymentP) {
      return bidder.acceptOptionDirectly(allegedInvitePaymentP);
    },
  });
  return bidder;
}

export default makeBidder;
