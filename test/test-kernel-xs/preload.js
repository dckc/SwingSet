// Add makeHandeled to Promise; needed in test-marshal
import maybeExtendPromise from '@agoric/eventual-send';
import { console } from './console';

globalThis.console = console; // used in @agoric/marshal
globalThis.Promise = maybeExtendPromise(Promise);

Object.freeze(Promise);
