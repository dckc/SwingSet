import { test } from 'tape-promise/tape';
import { buildVatController } from '../src/index';
import buildSharedStringTable from '../src/devices/sharedTable';

async function test0(t, withSES) {
  const config = {
    vatSources: new Map(),
    devices: [['d0', require.resolve('./files-devices/device-0'), {}]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-0'),
  };
  const c = await buildVatController(config, withSES);
  await c.step();
  // console.log(util.inspect(c.dump(), { depth: null }));
  t.deepEqual(JSON.parse(c.dump().log[0]), {
    args: [
      [],
      {
        _bootstrap: { '@qclass': 'slot', index: 0 },
      },
      {
        _dummy: 'dummy',
        d0: { '@qclass': 'slot', index: 1 },
      },
    ],
  });
  t.deepEqual(JSON.parse(c.dump().log[1]), [
    { type: 'export', id: 0 },
    { type: 'deviceImport', id: 40 },
  ]);
  t.end();
}

test('d0 with SES', async t => {
  await test0(t, true);
});

test('d0 without SES', async t => {
  await test0(t, false);
});

async function test1(t, withSES) {
  const sharedArray = [];
  const config = {
    vatSources: new Map(),
    devices: [
      [
        'd1',
        require.resolve('./files-devices/device-1'),
        {
          shared: sharedArray,
        },
      ],
    ],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-1'),
  };
  const c = await buildVatController(config, withSES);
  await c.step();
  c.queueToExport('_bootstrap', 0, 'step1', { body: '{"args":[]}', slots: [] });
  await c.step();
  console.log(c.dump().log);
  t.deepEqual(c.dump().log, [
    'callNow',
    'invoke 0 set',
    '{"data":"{}","slots":[]}',
  ]);
  t.deepEqual(sharedArray, ['pushed']);
  t.end();
}

test('d1 with SES', async t => {
  await test1(t, true);
});

test('d1 without SES', async t => {
  await test1(t, false);
});

async function test2(t, mode, withSES) {
  const config = {
    vatSources: new Map(),
    devices: [['d2', require.resolve('./files-devices/device-2'), {}]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-2'),
  };
  config.vatSources.set('left', require.resolve('./files-devices/vat-left.js'));
  const c = await buildVatController(config, withSES, [mode]);
  await c.step();
  if (mode === '1') {
    t.deepEqual(c.dump().log, ['calling d2.method1', 'method1 hello', 'done']);
  } else if (mode === '2') {
    t.deepEqual(c.dump().log, [
      'calling d2.method2',
      'method2',
      'method3 true',
      'value',
    ]);
  } else if (mode === '3') {
    t.deepEqual(c.dump().log, ['calling d2.method3', 'method3', 'ret true']);
  } else if (mode === '4') {
    t.deepEqual(c.dump().log, [
      'calling d2.method4',
      'method4',
      'ret method4 done',
    ]);
    await c.step();
    t.deepEqual(c.dump().log, [
      'calling d2.method4',
      'method4',
      'ret method4 done',
      'd2.m4 foo',
      'method4.bar hello',
      'd2.m4 did bar',
    ]);
  } else if (mode === '5') {
    t.deepEqual(c.dump().log, ['calling v2.method5', 'called']);
    await c.step();
    t.deepEqual(c.dump().log, [
      'calling v2.method5',
      'called',
      'left5',
      'method5 hello',
      'left5 did d2.method5, got ok',
    ]);
    await c.step();
    t.deepEqual(c.dump().log, [
      'calling v2.method5',
      'called',
      'left5',
      'method5 hello',
      'left5 did d2.method5, got ok',
      'ret done',
    ]);
  }
  t.end();
}

test('d2.1 with SES', async t => {
  await test2(t, '1', true);
});

test('d2.1 without SES', async t => {
  await test2(t, '1', false);
});

test('d2.2 with SES', async t => {
  await test2(t, '2', true);
});

test('d2.2 without SES', async t => {
  await test2(t, '2', false);
});

test('d2.3 with SES', async t => {
  await test2(t, '3', true);
});

test('d2.3 without SES', async t => {
  await test2(t, '3', false);
});

test('d2.4 with SES', async t => {
  await test2(t, '4', true);
});

test('d2.4 without SES', async t => {
  await test2(t, '4', false);
});

test('d2.5 with SES', async t => {
  await test2(t, '5', true);
});

test('d2.5 without SES', async t => {
  await test2(t, '5', false);
});

async function testState(t, withSES) {
  const config = {
    vatSources: new Map(),
    devices: [['d2', require.resolve('./files-devices/device-2'), {}]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-2'),
  };

  const c = await buildVatController(config, withSES, ['state1']);
  t.deepEqual(c.getState().devices.d2.deviceState, 'initial');
  await c.step();
  t.deepEqual(c.dump().log, ['calling setState', 'setState state2', 'called']);
  t.deepEqual(c.getState().devices.d2.deviceState, 'state2');
  t.deepEqual(c.getState().devices.d2.managerState, {
    nextImportID: 10,
    imports: {
      inbound: [],
      outbound: [],
    },
  });
  t.end();
}

test('device state with SES', async t => {
  await testState(t, true);
});

test('device state without SES', async t => {
  await testState(t, false);
});

async function testSetState(t, withSES) {
  const config = {
    vatSources: new Map(),
    devices: [['d2', require.resolve('./files-devices/device-2'), {}]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-2'),
    state: {
      vats: {},
      runQueue: [],
      promises: [],
      nextPromiseIndex: 40,
      devices: {
        d2: {
          deviceState: 'initial state',
          managerState: {
            nextImportID: 10,
            imports: {
              inbound: [],
              outbound: [],
            },
          },
        },
      },
    },
  };
  const argv = ['state2'];
  const c = await buildVatController(config, withSES, argv);
  t.deepEqual(c.getState().devices.d2.deviceState, 'initial state');

  c.callBootstrap('_bootstrap', argv);
  await c.run();
  t.deepEqual(c.dump().log, [
    'calling getState',
    'getState called',
    'got initial state',
  ]);
  t.end();
}

test('set device state with SES', async t => {
  await testSetState(t, true);
});

test('set device state without SES', async t => {
  await testSetState(t, false);
});

async function testSharedTable(t, withSES) {
  const st = buildSharedStringTable();
  console.log(`source: ${st.src}`);
  const config = {
    vatSources: new Map(),
    devices: [['sharedTable', st.src, st.endowments]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-2'),
  };
  config.vatSources.set('left', require.resolve('./files-devices/vat-left.js'));

  const c = await buildVatController(config, withSES, ['table1']);
  console.log('H0');
  await c.step();
  console.log(`table ${st}`);
  t.deepEqual(c.dump().log, ['calling left.leftSharedTable']);
  await c.step();
  t.deepEqual(c.dump().log, [
    'calling left.leftSharedTable',
    'leftSharedTable',
    'has key1= true',
    'got key1= val1',
    'has key2= false',
  ]);
  t.end();
}

test('shared table without SES', async t => {
  await testSharedTable(t, false);
});

test('shared table with SES', async t => {
  await testSharedTable(t, true);
});
