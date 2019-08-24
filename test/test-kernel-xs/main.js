/* global trace */

import { test } from 'tape';

import makePromise from 'kernel/makePromise';

// moddable timer
import { setImmediate, setTimeout } from './moddableTimer';

// import { makeCommsSlots } from './commsSlots/index';

//import buildKernel from './kernel';

// import buildKernel from 'src/kernel/index';

export default function main() {
  trace('hi from test-kernel-xs with build task\n');

  test('hello world tape', t => {
    t.equal(1 + 1, 2);
    t.end();
  });

  test('Promise queue should be higher priority than IO/timer queue', async t => {
    const log = [];
    setImmediate(() => log.push(1));
    setImmediate(() => {
      log.push(2);
      Promise.resolve().then(() => log.push(4));
      log.push(3);
    });
    setImmediate(() => log.push(5));
    setImmediate(() => log.push(6));

    let r;
    const p = new Promise(r0 => (r = r0));
    setTimeout(() => r(), 0.1 * 1000);
    await p;

    t.deepEqual(log, [1, 2, 3, 4, 5, 6]);
    return t.end();
  });

  /*
    test('build kernel', async t => {
      const kernel = buildKernel({ setImmediate });
      await kernel.start(); // empty queue
      const data = kernel.dump();
      t.deepEqual(data.vatTables, []);
      t.deepEqual(data.kernelTable, []);
      t.end();
    });
    */
}
