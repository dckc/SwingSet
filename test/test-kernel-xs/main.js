/* global trace */

import { test } from 'tape';

import testQueuePriority from './test-queue-priority';
import testMarshal from './test-marshal';
import testKernel from './test-kernel';

export default function main() {
  trace('hi from test-kernel-xs with build task\n');

  test('hello world tape', t => {
    t.equal(1 + 1, 2);
    t.end();
  });

  testQueuePriority(test);
  testMarshal(test);
  testKernel(test);

  trace('end of main\n');
}
