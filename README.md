# SwingSet Vat

[![Build Status][circleci-svg]][circleci-url]
[![dependency status][deps-svg]][deps-url]
[![dev dependency status][dev-deps-svg]][dev-deps-url]
[![License][license-image]][license-url]

This repository contains another proof-of-concept Vat host, like
PlaygroundVat. This one is modeled after KeyKOS "Domains": all Vats run on
top of a "kernel" as if they were userspace processes in an operating system.
Each Vat gets access to a "syscall" object, through which it can send
messages into the kernel. Vats receive message from the kernel via a
"dispatch" function which they register at startup.

Our goal is to experiment with different serialization/queueing mechanisms.
One such mechanism is implemented so far, named "live slots", but we know
this is insufficient to provide persistence across restarts.

More docs are in the works. For now, try:

```
$ npm install
$ npm test
$ bin/vat run demo/encouragementBot
```

This repository is still in early development: APIs and features are not
expected to stabilize for a while.

## REPL Shell

```
$ bin/vat shell demo/encouragementBot
vat>
```

Shell mode gives you an interactive REPL, just like running `node` without
arguments. All vats are loaded, and three additional commands are added to
the environment:

* `dump()`: display the kernel tables, including the run queue
* `step()`: execute the next action on the run queue
* `run()`: keep stepping until the run queue is empty

## Contract Host Examples

The `demo/contractHost` directory contains the basic ERTP examples, ported
from the PlaygroundVat environment, which were themselves ported from the old
es-lab environment. This demonstrates Mints, Purses, and Escrow Agents.

```
$ bin/vat run demo/contractHost -- mint
= loading config from basedir demo/contractHost
= adding vat 'alice' from /home/warner/bindmounts/trees/SwingSet/demo/contractHost/vat-alice.js
= adding vat 'bob' from /home/warner/bindmounts/trees/SwingSet/demo/contractHost/vat-bob.js
= adding vat 'host' from /home/warner/bindmounts/trees/SwingSet/demo/contractHost/vat-host.js
= adding vat 'mint' from /home/warner/bindmounts/trees/SwingSet/demo/contractHost/vat-mint.js
starting mintTest
makeMint
makeEmptyPurse(deposit)
deposit[deposit]#1: bal=0 amt=50
 dep[deposit]#1 (post-P): bal=0 amt=50
getBalance 950
getBalance 50
++ balances: [ 950, 50 ]
++ DONE
= vat finished
```

The driver program (`demo/contractHost/bootstrap.js`) uses the provided
argument to switch modes:

* `mint`: creates a Mint, build a Purse, deposit it into a different Purse
* `trivial`: build a Contract Host, submit a trivial contract, execute
* `alice-first`: Alice and Bob perform a basic money-for-stock escrow transfer
* `bob-first`: same, but exercise different ordering
* `bob-first-lies`: same, but Bob submits a false (non-matching) contract,
  and the Contract Host rejects the operation

The `bob-first-lies` mode does not work yet, as our serialization library
cannot yet handle Errors.

## Vat Basedirs

The main argument to `bin/vat` is a "basedir", which contains sources for all
the Vats that should be loaded into the container.

Every file named `vat-*.js` (e.g. `vat-foo.js` and `vat-bar-none.js`) will
create a new Vat (with names like `foo` and `bar-none`). Each directory named
`vat-*/` that has an `index.js` will also create a new Vat (e.g.
`vat-baz/index.js`).

In addition, a file named `bootstrap.js` must be present. This will contain
the source for the "bootstrap Vat", which behaves like a regular Vat except:

* At startup, its `bootstrap` method will be invoked, as `bootstrap(argv, vats)`
* The `argv` value will be an array of strings, from the command line. So
  running `bin/vat BASEDIR -- x1 x2 x3` will set `argv = ['x1', 'x2', 'x3']`.
* The `vats` value will be an object with keys named after the other Vats
  that were created, and values which are each a Presence for that Vat's root
  object. This allows the bootstrap Vat to invoke the other Vats, and wire
  them together somehow.

The `bootstrap()` invocation is the only way to get anything started: all
other Vats are born without external references, and nothing can be invoked
without an external reference. Those Vats can execute code during their
`setup()` phase, but without Presences they won't be able to interact with
anything else.

## Vat Sources

Each Vat source file (like `vat-foo.js` or `vat-bar.js`) is treated as a
starting point for the `rollup` tool, which converts the Vat's source tree
into a single string (so it can be evaluated in a SES realm). This starting
point can use `import` to reference shared local files. It can also import a
few special non-local modules: `@agoric/nat` and `@agoric/harden`. No other
non-local imports are allowed yet.

The source file is expected to contain a single default export function named
`setup`. This low-level function is invoked with a `syscall` object, and is
expected to return a `dispatch` object.

The "Live Slots" layer provides a function to build `dispatch` out of
`syscall`, as well as a way to register the root object. This requires a few
lines of boilerplate in the `setup()` function.

```js
import harden from '@agoric/harden';

function buildRootObject(E) {
  return harden({
    callRight(arg1, right) {
      console.log(`left.callRight ${arg1}`);
      E(right)
        .bar(2)
        .then(a => console.log(`left.then ${a}`));
      return 3;
    },
  });
}

export default function setup(syscall, state, helpers) {
  const dispatch = helpers.makeLiveSlots(syscall, state, buildRootObject, helpers.vatID);
  return dispatch;
}
```

## Exposed (pass-by-presence) Objects

The Live Slots system enables delivery of messages to remote "Callable
Objects" objects, as long as those objects are of a particular form. All
Callable Objects must follow these rules:

* all enumerable properties must be functions
* all properties, and the object itself, must be `harden()`ed

The system can pass-by-copy "Data Objects" with similar rules:

* all enumerable properties must be non-functions
* the object's prototype must be Array or Object (or null)
* all properties, and the object itself, must be `harden()`ed

## Root Objects

The "Root Object" is a callable object returned by `buildRootObject()`. It
will be made available to the Bootstrap Vat.

## Sending Messages with Presences

When a Callable Object is sent to another Vat, it arrives as a Presence. This
is a special (empty) object that represents the Callable Object, and can be
used to send it messages. The special `E()` wrapper is used to get a proxy
from which methods can be invoked.

Suppose Vat "bob" defines a Root Object with a method named `bar`. The
bootstrap receives this as `vats.bob`, and can send a message like this:

```js
function bootstrap(argv, vats) {
  E(vats.bob).bar('hello bob');
}
```

In the future, this `E()` wrapper is intended to be replace with so-called
"bang syntax", which will look like:

```js
function bootstrap(argv, vats) {
  vats.bob!bar('hello bob');
}
```

The `!` operator (pronounced "bang") has the same left-to-right precedence as
the `.` "dot" operator, so that example is equivalent to
`(vats.bob)!bar('hello bob')`.


## Other uses for E

The main purpose of the E wrapper (and bang syntax) is to provide an
"eventual send" operator, in which the message is always delivered on some
later turn of the event loop. This happens regardless of whether the target
is local or in some other Vat:

```js
const t1 = {
  foo() { console.log('foo called'); },
};
E(t1).foo()
console.log('E() called');
```

will print:

```
E() called
foo called
```

This is equivalent to:

```
Promise.resolve(t1).then(x => x.foo())
```

## Return Values

Eventual-sends return a Promise for their eventual result:

```js
const fooP = E(bob).foo();
fooP.then(resolution => console.log('foo said', resolution),
          rejection => console.log('foo errored with', rejection));
```

## Sending Messages to Promises

The `E()` wrapper also accepts Promises, just like `Promise.resolve`. The
method will be invoked (on some future turn) on whatever the Promise resolves
to.

If `E()` is called on a Promise which rejects, the method is not invoked, and
the return promise's `rejection` function is called instead:

```js
const badP = Promise.reject(new Error());
const p2 = E(badP).foo();
p2.then(undefined, rej => console.log('rejected', rej));
// prints 'rejected'
```

If the Promise resolves to a non-object (e.g. a number, or undefined), there
will be nothing to look up the method name on, and the method delivery will
fail with a `ReferenceError`.

## Promise Pipelining

In `fooP = E(bob).foo()`, `fooP` represents the (eventual) return value of
whatever `foo()` executes. If that return value is also a Callable Object, it
is possible to queue messages to be delivered to that future target. The
Promise returned by an eventual-send can be used in an `E()` wrapper too, and
the method invoked will be turned into a queued message that won't be
delivered until the first promise resolves:

```js
const db = E(databaseServer).openDB();
const row = E(db).select(criteria)
const success = E(row).modify(newValue);
success.then(res => console.log('row modified'));
```

If you don't care about them, the intermediate values can be discarded:

```js
E(E(E(databaseServer).openDB()).select(criteria)).modify(newValue)
  .then(res => console.log('row modified'));
```

This will be more pleasant with bang-syntax:

```js
databaseServer!openDB()!select(criteria)!modify(newValue)
  .then(res => console.log('row modified'));
```

This sequence could be expressed with plain `then()` clauses, but by chaining
them together without `then`, the kernel has enough information to
speculatively deliver the later messages to the Vat in charge of answering
the earlier messages. This avoids unnecessary roundtrips, by sending the
later messages during "downtime" while the target Vat thinks about the answer
to the first one.

This drastic reduction in latency is significant when the Vats are far away
from each other, and the inter-Vat communication delay is large. The SwingSet
container does not yet provide complete facilities for off-host messaging,
but once that is implemented, promise pipelining will make a big difference.

## Presence Identity Comparison

Presences preserve identity as they move from one Vat to another:

* Sending the same Callable Object multiple times will deliver the same
  Presence on the receiving Vat
* Sending a Presence back to its "home Vat" will arrive as the original
  Callable Object
* Sending a Callable Object to two different Vats will result in Presences
  that cannot be compared directly, because those two Vats can only
  communicate with messages. But if those two Vats both send those Presences
  to a third Vat, they will arrive as the same Presence object

Promises are *not* intended to preserve identity. Vat code should not compare
objects for identity until they pass out of a `.then()` resolution handler.

[circleci-svg]: https://circleci.com/gh/Agoric/SwingSet.svg?style=svg
[circleci-url]: https://circleci.com/gh/Agoric/SwingSet
[deps-svg]: https://david-dm.org/Agoric/SwingSet.svg
[deps-url]: https://david-dm.org/Agoric/SwingSet
[dev-deps-svg]: https://david-dm.org/Agoric/SwingSet/dev-status.svg
[dev-deps-url]: https://david-dm.org/Agoric/SwingSet?type=dev
[license-image]: https://img.shields.io/badge/License-Apache%202.0-blue.svg
[license-url]: LICENSE
