import harden from '@agoric/harden';

export default function makeMerkWrapper(merkState) {
  const merkWrapper = harden({
    sendMsg(msg) {
      const command = JSON.parse(msg);
      const { method, key } = command;
      if (key.includes('undefined')) {
        throw new Error(`key ${key} includes undefined`);
      }
      let result;
      switch (method) {
        case 'get': {
          result = merkState.key;
          break;
        }
        case 'set': {
          const { value } = command;
          merkState.key = value;
          break;
        }
        case 'has': {
          const tempResult = merkState.key;
          result = tempResult ? [true] : [false];
          // array-wrapped for JSON compatibility
          break;
        }
        case 'delete': {
          delete merkState.key;
          break;
        }
        case 'keys': {
          result = Object.getOwnPropertyNames(merkState[key]);
          break;
        }
        case 'entries': {
          const keys = Object.getOwnPropertyNames(merkState[key]);
          result = [];
          for (const subkey of keys) {
            result.push({
              key: subkey,
              value: merkState[key][subkey],
            });
          }
          break;
        }
        case 'values': {
          const keys = Object.getOwnPropertyNames(merkState[key]);
          result = [];
          for (const subkey of keys) {
            result.push(merkState[key][subkey]);
          }
          break;
        }
        case 'size': {
          result = Object.getOwnPropertyNames(merkState[key]).length;
          break;
        }
        default:
          throw new Error(`unexpected message to kvstore ${msg}`);
      }
      // console.log(msg, '=>', result);
      if (result === undefined) {
        return JSON.stringify(null);
      }
      return JSON.stringify(result);
    },
  });
  return merkWrapper;
}
