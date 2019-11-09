import {
  nodeSourceAccess,
  loadBasedirRd,
  buildVatControllerRd,
} from './controller';
import { buildMailboxStateMap, buildMailbox } from './devices/mailbox';
import { buildTimer } from './devices/timer';

export {
  nodeSourceAccess,
  loadBasedirRd,
  buildVatControllerRd,
  buildMailboxStateMap,
  buildMailbox,
  buildTimer,
};

export function getVatTPSourcePath() {
  return require.resolve('./vats/vat-tp/vattp');
}

export function getCommsSourcePath() {
  return require.resolve('./vats/comms');
}

export function getTimerWrapperSourcePath() {
  return require.resolve('./vats/vat-timerWrapper');
}
