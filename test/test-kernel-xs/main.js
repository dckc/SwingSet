/* global trace */

import { test } from 'tape';
import { setImmediate } from './moddableTimer';
import testQueuePriority from './test-queue-priority';
import testMarshal from './test-marshal';

import buildKernel from 'kernel/index';

export default function main() {
  trace('hi from test-kernel-xs with build task\n');

  test('hello world tape', t => {
    t.equal(1 + 1, 2);
    t.end();
  });

  testQueuePriority(test);
  testMarshal(test);

  test('build kernel', async t => {
    const kernel = buildKernel({ setImmediate });
    await kernel.start(); // empty queue
    const data = kernel.dump();
    t.deepEqual(data.vatTables, []);
    t.deepEqual(data.kernelTable, []);
    t.end();
  });

  trace('end of main\n');
}
