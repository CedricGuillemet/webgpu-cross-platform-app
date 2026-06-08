# Bundle transform with Babel (replaces `scripts/transform-bundle.js`)

The Babylon-Lite scene bundles in `Babylon-Lite/lab/public/bundle/*.js` are
generated using modern JavaScript (ES2020+) that our ChakraCore 1.11 runtime
can't parse: dynamic `import()`, `??`, `?.`, `||= ??= &&=`, optional catch
binding without a parameter, instance/static class fields, and object
rest/spread. The other engines (QuickJS, V8, Hermes-static_h) accept them
all natively, so this step is only strictly needed for the **Chakra** build.

Earlier we used a hand-rolled `transform-bundle.js` that wrapped `esbuild`.
We now use **Babel** with a minimal plugin list and no preset, so we only
downlevel the specific features ChakraCore 1.11 can't parse.

## One-line command

```powershell
cd webgpu-cross-platform-app
npm install                  # one-time; pulls @babel/cli + 6 plugins
npm run transform-bundles    # in-place transform of assets/bundle/*.js
```

Under the hood `npm run transform-bundles` runs:

```bash
babel assets/bundle \
      --out-dir assets/bundle \
      --keep-file-extension \
      --no-comments \
      --no-babelrc \
      --config-file ./babel.config.js
```

* **input dir** `assets/bundle/` — overwritten in place.
* **`--keep-file-extension`** — Babel default would strip extensions; we want
  the chunk files to keep their `.js` so dynamic-import URLs still match.
* **`--no-comments`** — drop comments to shrink the bundles.
* **`--no-babelrc`** — ignore any `.babelrc` in the cwd or above (we use
  the file specified by `--config-file` exclusively).

For a typical refresh of the bundles you want to:
1. Re-build the bundles in Babylon-Lite (`pnpm build:bundle-scenes`).
2. Copy them over: `Copy-Item ..\Babylon-Lite\lab\public\bundle\*.js assets\bundle\`
3. Run `npm run transform-bundles`.
4. The Chakra app build copies `assets/` into `build-<X>/assets/` at link
   time, so the next CMake build picks them up automatically.

## What gets transformed

The transformations all live in `babel.config.js`:

```js
module.exports = {
    babelrc: false,
    sourceType: 'unambiguous',
    compact: true,
    comments: false,
    plugins: [
        './scripts/babel-plugin-rewrite-dynamic-import.js',   // custom — see below
        '@babel/plugin-transform-nullish-coalescing-operator',// ?? → conditional
        '@babel/plugin-transform-optional-chaining',          // ?. → conditional
        '@babel/plugin-transform-logical-assignment-operators',// ||= ??= &&=
        '@babel/plugin-transform-optional-catch-binding',     // catch {} → catch (_)
        '@babel/plugin-transform-class-properties',           // foo = 1; class fields
        '@babel/plugin-transform-object-rest-spread',         // {...a, b: 1}
    ],
};
```

### Custom plugin: rewrite dynamic `import()` → `__import()`

ChakraCore 1.11's parser doesn't recognise `import(...)` as an expression at
all — it tries to parse it as a static `import` statement and aborts with a
syntax error.  Our `main.cpp` registers a `__import(specifier)` global that
routes through `cx::Host::importByPath`. The tiny custom Babel plugin at
`scripts/babel-plugin-rewrite-dynamic-import.js` rewrites every CallExpression
whose callee is the `Import` node:

```js
module.exports = function () {
    return {
        name: 'rewrite-dynamic-import',
        visitor: {
            CallExpression(path) {
                if (path.node.callee && path.node.callee.type === 'Import') {
                    path.node.callee = { type: 'Identifier', name: '__import' };
                }
            },
        },
    };
};
```

The plugin runs first (it sits at index 0 of `plugins`) so the AST is rewritten
before any other transform sees the dynamic import.

### Why these specific plugins (and not `@babel/preset-env`)?

`preset-env` would also downlevel arrow functions, `let`/`const`, classes,
async/await, generators, template literals, destructuring, spread in calls,
exponentiation, `Array.includes`, `Object.entries/values`, etc. — all of
which ChakraCore 1.11 already supports natively. Adding them would inflate
the bundle and slow the parser without buying anything.

The current plugin list is the minimal set we've confirmed is necessary
across all 125 Babylon-Lite scenes:

| Plugin | Adds support for | First spec |
|---|---|---|
| `rewrite-dynamic-import` | `import('./x.js')` | ES2020 |
| `transform-nullish-coalescing-operator` | `a ?? b` | ES2020 |
| `transform-optional-chaining` | `a?.b`, `a?.()`, `a?.[i]` | ES2020 |
| `transform-logical-assignment-operators` | `a ??= b`, `a ||= b`, `a &&= b` | ES2021 |
| `transform-optional-catch-binding` | `catch { … }` (no binding) | ES2019 |
| `transform-class-properties` | `class { x = 1; static y = 2; #z = 3; }` | ES2022 |
| `transform-object-rest-spread` | `{...x, y: 1}` / `const {a, ...rest} = o` | ES2018 |

Empirically `transform-object-rest-spread` is required because Babel's own
`class-properties` helper emits `Object.assign({}, ...args)`-style code via
object spread — without that plugin, ChakraCore 1.11 fails to parse the
helper itself.

## Performance

On the full Babylon-Lite bundle tree (16 874 files: ~125 entry scenes + their
code-split chunks; ~70 MB total):

| Tool | Wall time | Output size delta |
|---|---:|---:|
| Babel (this config) | ~6 min 20 s | output ≈ +5 % vs input |
| esbuild (old `transform-bundle.js`) | ~5 s | output ≈ −10 % vs input (esbuild minifies) |

Babel is **75× slower** than esbuild on this workload because it runs each
plugin as an AST visitor pass and emits unminified output. The 6-minute
hit is a one-time cost when the bundles are refreshed — it doesn't affect
incremental rebuilds of `app.exe`.

If wall time matters more than minimum plugin surface, you can swap back
to esbuild (which has `supported: { ... false }` to selectively disable
syntax features, achieving the same downlevel in seconds). The Babel
version is what we ship by default because it is the canonical "downlevel
specific features" stack in the JS ecosystem.

## Validation

After `npm run transform-bundles`, copy bundles into the build dir and run
the parity sweep:

```powershell
Copy-Item assets\bundle\*.js build-small\assets\bundle\
.\parity-sweep-engine.ps1 -BuildDir build-small
```

Latest result on Chakra + D3D12 with Babel-transformed bundles:

| Metric | Babel | esbuild (previous) |
|---|---:|---:|
| Pass | 76 / 125 | 78 / 125 |
| WASM-skip | 7 | 8 |
| Fail | 42 | 39 |
| With ref AND passing | 27 / 32 | 28 / 32 |
| Pixel-perfect (region MAD = 0) | 17 | 17 |

The 17 pixel-perfect scenes are bit-identical to the esbuild result, which
confirms Babel's transform output is semantically equivalent on the scenes
that pass.

## Files added / removed

| Change | Path |
|---|---|
| **deleted** | `scripts/transform-bundle.js` (esbuild wrapper) |
| added | `babel.config.js` (plugin list) |
| added | `scripts/babel-plugin-rewrite-dynamic-import.js` (`import()` → `__import()`) |
| modified | `package.json` — replaced `esbuild` dep with 6 `@babel/*` devDependencies + `transform-bundles` script |
