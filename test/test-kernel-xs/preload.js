import Nat from '@agoric/nat';
// Add makeHandeled to Promise; needed in test-marshal
import maybeExtendPromise from '@agoric/eventual-send';
import { console } from './console';

global.console = console; // used in @agoric/marshal
global.Promise = maybeExtendPromise(Promise);

Object.freeze(Promise);

export function usesNat() {
  Nat;
}
