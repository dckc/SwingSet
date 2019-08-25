// ack Paul Roub Aug 2014
// https://stackoverflow.com/a/25456134/7963

import { console } from './console';

const { freeze } = Object;

function deepEqual(x, y) {
  if (x === y) {
    return true;
  }
  if (
    typeof x === 'object' &&
    x != null &&
    (typeof y === 'object' && y != null)
  ) {
    if (Object.keys(x).length !== Object.keys(y).length) {
      return false;
    }

    for (const prop in x) {
      // eslint-disable-next-line no-prototype-builtins
      if (y.hasOwnProperty(prop)) {
        if (!deepEqual(x[prop], y[prop])) {
          return false;
        }
      } else {
        return false;
      }
    }

    return true;
  }
  return false;
}

export async function test(label, run) {
  let result = null;

  function fail(info) {
    console.log(label, info);
    result = false;
  }

  const t = freeze({
    end() {
      result = true;
    },
    equal(a, b) {
      if (a !== b) {
        fail('not equal. IOU details');
      }
    },
    deepEqual: (a, b) => deepEqual(a, b),
    throws(thunk, pattern) {
      try {
        thunk();
        result = false;
      } catch (ex) {
        result = ex.message.match(pattern);
      }
    },
    ok(a) {
      result = !!a;
    },
    notOk(a) {
      result = !a;
    },
    is(a, b) {
      result = Object.is(a, b);
    },
  });

  try {
    await run(t);
  } catch (ex) {
    fail(`thrown: ${ex.message}`);
  }

  if (result === null) {
    fail('not ended');
  }
  console.log(label, result ? 'PASS' : 'FAIL');
}

test.skip = function skip(label) {
  console.log(label, 'SKIP');
};
