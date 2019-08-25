/* global trace */

import { test } from 'tape';

import makePromise from 'kernel/makePromise';

import { console } from './console';
import testQueuePriority from './test-queue-priority';
import testMarshal from './test-marshal';

global.console = console; // used in @agoric/marshal

// import { makeCommsSlots } from './commsSlots/index';

// import buildKernel from './kernel';

// import buildKernel from 'src/kernel/index';

export default function main() {
  trace('hi from test-kernel-xs with build task\n');

  test('hello world tape', t => {
    t.equal(1 + 1, 2);
    t.end();
  });

  testQueuePriority(test);
  testMarshal(test);

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
