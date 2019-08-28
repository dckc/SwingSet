# test-kernel on the xs platform

working hypothesis: `makeKernel` can be shared between node.js and moddable xs platforms.

## Usage

Set up your moddable SDK as noted below; then:

    npm run test-kernel-xs

which runs `mcconfig -d -m -p lin` in this directory.

**TODO**: try `-p mac`

## Current status: 12 PASS, 4 FAIL

as of:

 - c8a3d5d 2019-08-28 test-kernel-xs: build kernel test runs, fails

The first couple `throw!`s are expected:

```
hi from test-kernel-xs with build task
/home/connolly/projects/agoric/SwingSet/node_modules/@agoric/marshal/marshal.js (183) # Break: throw!
/home/connolly/projects/agoric/SwingSet/node_modules/@agoric/marshal/marshal.js (215) # Break: throw!
serialize static data thrown: Cannot pass unregistered symbols
serialize static data FAIL
/home/connolly/projects/agoric/SwingSet/node_modules/@agoric/marshal/marshal.js (271) # Break: throw!
Warning: ibid cycle at 0
/home/connolly/projects/agoric/SwingSet/src/kernel/liveSlots.js (150) # Break: importPromise: cannot coerce undefined to object!
unserialize promise thrown: importPromise: cannot coerce undefined to object
unserialize promise FAIL
/home/connolly/projects/agoric/SwingSet/node_modules/@agoric/marshal/marshal.js (133) # Break: throw!
/home/connolly/projects/agoric/SwingSet/node_modules/@agoric/marshal/marshal.js (448) # Break: throw!
prototype undefined of undefined is not already in the fringeSet
/home/connolly/projects/agoric/SwingSet/test/test-kernel-xs/harden-xs/harden.esm.js (120) # Break: throw!
end of main
hello world tape PASS
unserialize static data PASS
serialize ibid cycle PASS
forbid ibid cycle PASS
unserialize ibid cycle PASS
serialize exports PASS
deserialize imports PASS
deserialize exports PASS
serialize imports PASS
null cannot be pass-by-presence PASS
mal-formed @qclass PASS
/home/connolly/projects/agoric/SwingSet/test/test-kernel-xs/npm_facade/tape.js (104) # Break: throw!
build kernel thrown: 
build kernel FAIL
/home/connolly/projects/agoric/SwingSet/test/test-kernel-xs/npm_facade/tape.js (48) # Break: throw!
/home/connolly/projects/agoric/SwingSet/test/test-kernel-xs/npm_facade/tape.js (34) # Break: throw!
Promise queue should be higher priority than IO/timer queue not deepEqual: {"actual":[1,2,3,5,6,4],"expected":[1,2,3,4,5,6]} : {"actual":{"type":"number","value":5},"expected":{"type":"number","value":4}}
Promise queue should be higher priority than IO/timer queue FAIL
serialize promise PASS
```

## tape work-alike: xs is esm only

At first I tried to get `tape` and its dependencies to run on xs;
but they're mostly cjs modules. Pretty soon I realized it would
be much more straightforward to just rewrite the bits we need.

 - b1e9acf 2019-08-24 xs: oops! forgot to commit tape facade
 - 3810d3a 2019-08-25 xs tape facade: fail on exceptions
 - 657fe25 2019-08-28 xs tape work-alike: detail from deepEqual; fixes


## Moddable SDK and import paths

In the Moddable SDK, a `manifest.json` file maps import specifiers to
files. The mapping is not sensitive to where the import specifier was
found. So `./state/index` under `kernel/` maps to the same place as
`./state/index` under `kernel/commsSlots/`. I tried various work-arounds
until I discovered that any import specifier starting with `../` would
mess up the build directory structure.

See also [struggling with relative imports
#251](https://github.com/Moddable-OpenSource/moddable/issues/251) Aug
20.

### Work-around: all paths relative to `src/`

patterned after https://github.com/benmosher/eslint-plugin-import/blob/master/.eslintrc.yml :

```yml
settings:
  import/resolver:
    node:
      paths: [ src ]
```

darn; **breaks vs-code's goto definition**, though. :-/

 - bbdc7d5 2019-08-28 xs: adjust import paths in kernel
 - bcc368e 2019-08-24 SwingSet on xs: test-queue-priority, imports


## SwingSet, Promise.makeHandled, and @agoric/eventual-send

 - 2d71fd2 2019-08-24 xs: test-marshal w/o Promise.makeHandled
 - ff77d7f 2019-08-25 xs: struggling toward Promise.makeHandled
 - 27a1410 2019-08-26 @agoric/eventual-send@0.2.3
 - ffe8c0d 2019-08-26 eventual-send: delay WeakMap til after xs preload
 - 876de72 2019-08-27 eventual-send: ensureMaps() needed in resolve() too
 - 3f02373 2019-08-28 update package-lock for @agoric/eventual-send
 

## xs preload for vetted customization code

 - 261aa02 2019-08-24 xs: oops: forgot to commit moddableTimer.js
 - 10f2793 2019-08-24 harden KLUDGEs for xs
 - fc8988b 2019-08-24 from @agoric/harden@0.0.4
 - a852420 2019-08-27 test-kernel-xs: factor out preload.js
 - e6ed771 2019-08-28 xs preload: Nat too

## Misc xs

 - 4512639 2019-08-20 toward test-kernel on xs: skeleton
 - 4b4342b 2019-08-24 xs: toward test-marshal: trouble with cyclic value
 - 8067e38 2019-08-26 xs fix allows ibid cycle to work
 - 5c112d6 2019-08-28 xs: don't strip any functions
 - 5157654 2019-08-28 xs: avoid ?.toString no function in template literals

for reference: `git log --author=dckc --pretty=format:' - %h %ad %s' --date=short`

### Moddable SDK and direnv

*IOU*

https://github.com/direnv/direnv/wiki/VSCode

## Issues

 - [Moddable-OpenSource author:dckc](https://github.com/issues?utf8=✓&q=is%3Aissue+archived%3Afalse+user%3AModdable-opensource+author%3Adckc+)
 - [Agoric issues mentions:dckc](https://github.com/issues?utf8=✓&q=is%3Aissue+archived%3Afalse+mentions%3Adckc+user%3AAgoric+)
 - [Agoric issues author:dckc](https://github.com/issues?q=is%3Aissue+archived%3Afalse+user%3AAgoric+author%3Adckc)
 
https://github.com/Agoric/SwingSet/issues/created_by/dckc
