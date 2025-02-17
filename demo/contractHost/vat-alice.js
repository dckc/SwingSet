// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { allComparable } from '../../collections/sameStructure';
import { makeCollect } from './contractHost';

function makeAliceMaker(E, host, log) {
  const collect = makeCollect(E, log);

  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPaymentBalance(name, paymentP) {
    return E(paymentP)
      .getXferBalance()
      .then(amount => log(name, ' xfer balance ', amount));
  }

  return harden({
    make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      timerP,
      myMoneyPurseP,
      myStockPurseP,
      myOptFinPurseP = undefined,
      optFredP = undefined,
    ) {
      const inviteIssuerP = E(host).getInviteIssuer();
      const inviteIssuerLabel = harden({
        issuer: inviteIssuerP,
        description: 'contract host',
      });
      const moneyIssuerP = E(myMoneyPurseP).getIssuer();
      const stockIssuerP = E(myStockPurseP).getIssuer();
      const optFinIssuerP = myOptFinPurseP && E(myOptFinPurseP).getIssuer();

      const alice = harden({
        payBobWell(bob) {
          log('++ alice.payBobWell starting');
          const paymentP = E(myMoneyPurseP).withdraw(10);
          return E(bob).buy('shoe', paymentP);
        },

        acceptInvite(allegedInvitePaymentP) {
          log('++ alice.acceptInvite starting');
          showPaymentBalance('alice invite', allegedInvitePaymentP);

          const allegedInviteAmountP = E(
            allegedInvitePaymentP,
          ).getXferBalance();

          const verifiedInviteP = E.resolve(allegedInviteAmountP).then(
            allegedInviteAmount => {
              const clams10 = harden({
                label: {
                  issuer: moneyIssuerP,
                  description: 'clams',
                },
                quantity: 10,
              });
              const fudco7 = harden({
                label: {
                  issuer: stockIssuerP,
                  description: 'fudco',
                },
                quantity: 7,
              });

              const inviteAmountP = allComparable(
                harden({
                  label: inviteIssuerLabel,
                  quantity: {
                    installation: escrowExchangeInstallationP,
                    terms: [clams10, fudco7],
                    seatIdentity: allegedInviteAmount.quantity.seatIdentity,
                    seatDesc: 'left',
                  },
                }),
              );

              return E.resolve(inviteAmountP).then(inviteAmount => {
                return E(inviteIssuerP).getExclusive(
                  inviteAmount,
                  allegedInvitePaymentP,
                  'verified invite',
                );
              });
            },
          );

          return E.resolve(
            showPaymentBalance('verified invite', verifiedInviteP),
          ).then(_ => {
            const seatP = E(host).redeem(verifiedInviteP);
            const moneyPaymentP = E(myMoneyPurseP).withdraw(10);
            E(seatP).offer(moneyPaymentP);
            return collect(seatP, myStockPurseP, myMoneyPurseP, 'alice escrow');
          });
        },

        acceptOption(allegedInvitePaymentP) {
          if (optFredP) {
            return alice.acceptOptionForFred(allegedInvitePaymentP);
          }
          return alice.acceptOptionDirectly(allegedInvitePaymentP);
        },

        acceptOptionDirectly(allegedInvitePaymentP) {
          log('++ alice.acceptOptionDirectly starting');
          showPaymentBalance('alice invite', allegedInvitePaymentP);

          const allegedInviteAmountP = E(
            allegedInvitePaymentP,
          ).getXferBalance();

          const verifiedInvitePaymentP = E.resolve(allegedInviteAmountP).then(
            allegedInviteAmount => {
              const smackers10 = harden({
                label: {
                  issuer: moneyIssuerP,
                  description: 'smackers',
                },
                quantity: 10,
              });
              const yoyodyne7 = harden({
                label: {
                  issuer: stockIssuerP,
                  description: 'yoyodyne',
                },
                quantity: 7,
              });

              const inviteAmountP = allComparable(
                harden({
                  label: inviteIssuerLabel,
                  quantity: {
                    installation: coveredCallInstallationP,
                    terms: [
                      escrowExchangeInstallationP,
                      smackers10,
                      yoyodyne7,
                      timerP,
                      'singularity',
                    ],
                    seatIdentity: allegedInviteAmount.quantity.seatIdentity,
                    seatDesc: 'holder',
                  },
                }),
              );

              return E.resolve(inviteAmountP).then(inviteAmount => {
                return E(inviteIssuerP).getExclusive(
                  inviteAmount,
                  allegedInvitePaymentP,
                  'verified invite',
                );
              });
            },
          );

          return E.resolve(
            showPaymentBalance('verified invite', verifiedInvitePaymentP),
          ).then(_ => {
            const seatP = E(host).redeem(verifiedInvitePaymentP);
            const moneyPaymentP = E(myMoneyPurseP).withdraw(10);
            E(seatP).offer(moneyPaymentP);
            return collect(seatP, myStockPurseP, myMoneyPurseP, 'alice option');
          });
        },

        acceptOptionForFred(allegedInvitePaymentP) {
          log('++ alice.acceptOptionForFred starting');
          const finNeededP = E(E(optFinIssuerP).getAssay()).make(55);
          const inviteNeededP = E(allegedInvitePaymentP).getXferBalance();

          const terms = harden([finNeededP, inviteNeededP]);
          const invitesP = E(escrowExchangeInstallationP).spawn(terms);
          const fredInviteP = invitesP.then(invites => invites[0]);
          const aliceForFredInviteP = invitesP.then(invites => invites[1]);
          const doneP = Promise.all([
            E(optFredP).acceptOptionOffer(fredInviteP),
            E(alice).completeOptionsSale(
              aliceForFredInviteP,
              allegedInvitePaymentP,
            ),
          ]);
          doneP.then(
            _res => log('++ alice.acceptOptionForFred done'),
            rej => log('++ alice.acceptOptionForFred reject: ', rej),
          );
          return doneP;
        },

        completeOptionsSale(aliceForFredInviteP, allegedInvitePaymentP) {
          log('++ alice.completeOptionsSale starting');
          const aliceForFredSeatP = E(host).redeem(aliceForFredInviteP);

          E(aliceForFredSeatP).offer(allegedInvitePaymentP);
          const myInvitePurseP = E(inviteIssuerP).makeEmptyPurse();
          return collect(
            aliceForFredSeatP,
            myOptFinPurseP,
            myInvitePurseP,
            'alice options sale',
          );
        },
      });
      return alice;
    },
  });
}

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeAliceMaker(host) {
        return harden(makeAliceMaker(E, host, log));
      },
    }),
  );
}
export default harden(setup);
