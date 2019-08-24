# test-kernel on the xs platform

working hypothesis: `makeKernel` can be shared between node.js and moddable xs platforms.

## Usage

Set up your moddable SDK as noted below; then:

    npm run test-kernel-xs

which runs `mcconfig -d -m -p lin` in this directory.

**TODO**: try `-p mac`

## Moddable SDK and import paths

@@explain

## Moddable SDK and direnv

*IOU*

https://github.com/direnv/direnv/wiki/VSCode

# paths

patterned after https://github.com/benmosher/eslint-plugin-import/blob/master/.eslintrc.yml

```yml
settings:
  import/resolver:
    node:
      paths: [ src ]
```

## Using tape and other npm goodies

maybe https://jspm.io/ ?
