/* global setImmediate */
import fs from 'fs';
import path from 'path';
// import { rollup } from 'rollup';
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import SES from 'ses';

import merk from 'merk';
import levelup from 'levelup';
import leveldown from 'leveldown';

import kernelSourceFunc from './bundles/kernel';
import buildKernelNonSES from './kernel/index';
import bundleSource from './build-source-bundle';

import makeMerkWrapper from './externalState/merk/merkWrapper';

async function loadState(basedir) {
  const stateDB = levelup(leveldown(path.resolve(basedir, './state')));
  const merkState = await merk(stateDB);
  const merkWrapper = makeMerkWrapper(merkState);
  return merkWrapper;
}

export function loadBasedir(basedir, _stateArg) {
  console.log(`= loading config from basedir ${basedir}`);
  const vatSources = new Map();
  const subs = fs.readdirSync(basedir, { withFileTypes: true });
  subs.forEach(dirent => {
    if (dirent.name.endsWith('~')) {
      return;
    }
    if (
      dirent.name.startsWith('vat-') &&
      dirent.isFile() &&
      dirent.name.endsWith('.js')
    ) {
      const name = dirent.name.slice('vat-'.length, -'.js'.length);
      const indexJS = path.resolve(basedir, dirent.name);
      vatSources.set(name, indexJS);
    }
  });
  let bootstrapIndexJS = path.resolve(basedir, 'bootstrap.js');
  try {
    fs.statSync(bootstrapIndexJS);
  } catch (e) {
    bootstrapIndexJS = undefined;
  }
  const state = loadState(basedir);
  return { vatSources, bootstrapIndexJS, state };
}

function getKernelSource() {
  return `(${kernelSourceFunc})`;
}

// this feeds the SES realm's (real/safe) confineExpr() back into the Realm
// when it does require('@agoric/evaluate'), so we can get the same
// functionality both with and without SES
function makeEvaluate(e) {
  const { confineExpr } = e;
  return (source, endowments = {}) => confineExpr(source, endowments);
}

function buildSESKernel(state) {
  const s = SES.makeSESRootRealm({
    consoleMode: 'allow',
    errorStackMode: 'allow',
  });
  const r = s.makeRequire({
    '@agoric/evaluate': {
      attenuatorSource: `${makeEvaluate}`,
      confineExpr: s.global.SES.confineExpr,
    },
    '@agoric/harden': true,
    '@agoric/nat': Nat,
  });
  const kernelSource = getKernelSource();
  // console.log('building kernel');
  const buildKernel = s.evaluate(kernelSource, { require: r })();
  const kernelEndowments = { setImmediate };
  const kernel = buildKernel(kernelEndowments, state);
  return { kernel, s, r };
}

function buildNonSESKernel(state) {
  const kernelEndowments = { setImmediate };
  const kernel = buildKernelNonSES(kernelEndowments, state);
  return { kernel };
}

export async function buildVatController(config, withSES = true, argv = []) {
  const { state } = config;
  // console.log('in main');
  const { kernel, s, r } = withSES
    ? buildSESKernel(state)
    : buildNonSESKernel(state);
  // console.log('kernel', kernel);

  async function addVat(vatID, sourceIndex, _options) {
    if (!(sourceIndex[0] === '.' || path.isAbsolute(sourceIndex))) {
      throw Error(
        'sourceIndex must be relative (./foo) or absolute (/foo) not bare (foo)',
      );
    }

    // we load the sourceIndex (and everything it imports), and expect to get
    // two symbols from each Vat: 'start' and 'dispatch'. The code in
    // bootstrap.js gets a 'controller' object which can invoke start()
    // (which is expected to initialize some state and export some facetIDs)
    let setup;

    if (withSES) {
      // TODO: if the 'require' we provide here supplies a non-pure module,
      // that could open a communication channel between otherwise isolated
      // Vats. For now that's just harden and Nat, but others might get added
      // in the future, so pay attention to what we allow in. We could build
      // a new makeRequire for each Vat, but 1: performance and 2: the same
      // comms problem exists between otherwise-isolated code within a single
      // Vat so it doesn't really help anyways
      // const r = s.makeRequire({ '@agoric/harden': true, '@agoric/nat': Nat });
      let source = await bundleSource(`${sourceIndex}`);
      source = `(${source})`;
      setup = s.evaluate(source, { require: r })();
    } else {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      setup = require(`${sourceIndex}`).default;
    }
    kernel.addVat(vatID, setup);
  }

  async function addDevice(name, sourceIndex, endowments) {
    if (!(sourceIndex[0] === '.' || path.isAbsolute(sourceIndex))) {
      throw Error(
        'sourceIndex must be relative (./foo) or absolute (/foo) not bare (foo)',
      );
    }

    let setup;
    if (withSES) {
      let source = await bundleSource(`${sourceIndex}`);
      source = `(${source})`;
      setup = s.evaluate(source, { require: r })();
    } else {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      setup = require(`${sourceIndex}`).default;
    }
    kernel.addDevice(name, setup, endowments);
  }

  // the kernel won't leak our objects into the Vats, we must do
  // the same in this wrapper
  const controller = harden({
    async addVat(vatID, sourceIndex, options = {}) {
      console.log(`= adding vat '${vatID}' from ${sourceIndex}`);
      await addVat(vatID, sourceIndex, options);
    },

    log(str) {
      kernel.log(str);
    },

    dump() {
      return JSON.parse(JSON.stringify(kernel.dump()));
    },

    async run() {
      await kernel.run();
    },

    async step() {
      await kernel.step();
    },

    queueToExport(vatID, facetID, method, argsString) {
      kernel.queueToExport(vatID, facetID, method, argsString, []);
    },

    callBootstrap(vatID, bootstrapArgv) {
      kernel.callBootstrap(`${vatID}`, JSON.stringify(bootstrapArgv));
    },

    async commitState() {
      await merk.commit(state);
    },

    getRootHash() {
      return merk.hash(state);
    },

    async queryState(pathStr, _height) {
      // pathStr is / delineated coming in,
      // but merk needs . delineation.
      function slashToDot(slashPath) {
        return slashPath.replace(/\//g, '.');
      }

      const dotPath = slashToDot(pathStr);

      // we ignore height for now and only get the latest
      // TODO: use height
      const proof = await merk.proof(state, dotPath);
      const rootHash = merk.hash(state);

      const value = merk.verify(rootHash, proof, dotPath);
      // return {
      //   index: // The index of the key in the tree.
      //   key: // Key ([]byte): The key of the matching data.
      //   value: // Value ([]byte): The value of the matching data.
      //   proof, // Proof (Proof): Serialized proof for the value data, if requested, to be verified against the AppHash for the given Height.
      // }
      return {
        key: pathStr,
        value,
        proof,
      };
    },
  });

  if (config.devices) {
    for (const [name, srcpath, endowments] of config.devices) {
      // eslint-disable-next-line no-await-in-loop
      await addDevice(name, srcpath, endowments);
    }
  }

  if (config.vatSources) {
    for (const vatID of config.vatSources.keys()) {
      // eslint-disable-next-line no-await-in-loop
      await controller.addVat(vatID, config.vatSources.get(vatID));
    }
  }

  if (config.bootstrapIndexJS) {
    await addVat('_bootstrap', config.bootstrapIndexJS, {});
  }

  return controller;
}
