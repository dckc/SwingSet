import harden from '@agoric/harden';

import { check } from './insist';
import { passStyleOf } from '../src/kernel/marshal';

// Are left and right structurally equivalent? This compares
// pass-by-copy data deeply until non-pass-by-copy values are
// reached. The non-pass-by-copy values at the leaves of the
// comparison may only be pass-by-presence objects. If they are
// anything else, including promises, throw an error.
//
// Pass-by-presence objects compare identities.

function sameStructure(left, right) {
  const leftStyle = passStyleOf(left);
  const rightStyle = passStyleOf(right);
  check(leftStyle !== 'promise')`\
Cannot structurally compare promises: ${left}`;
  check(rightStyle !== 'promise')`\
Cannot structurally compare promises: ${right}`;

  if (leftStyle !== rightStyle) {
    return false;
  }
  switch (leftStyle) {
    case 'null':
    case 'undefined':
    case 'string':
    case 'boolean':
    case 'number':
    case 'symbol':
    case 'bigint':
    case 'presence': {
      return Object.is(left, right);
    }
    case 'copyRecord':
    case 'copyArray': {
      const leftNames = Object.getOwnPropertyNames(left);
      const rightNames = Object.getOwnPropertyNames(right);
      if (leftNames.length !== rightNames.length) {
        return false;
      }
      for (const name of leftNames) {
        // TODO: Better hasOwnProperty check
        if (!Object.getOwnPropertyDescriptor(right, name)) {
          return false;
        }
        // TODO: Make cycle tolerant
        if (!sameStructure(left[name], right[name])) {
          return false;
        }
      }
      return true;
    }
    case 'copyError': {
      return left.name === right.name && left.message === right.message;
    }
    default: {
      throw new TypeError(`unrecognized passStyle ${leftStyle}`);
    }
  }
}
harden(sameStructure);

export { sameStructure };