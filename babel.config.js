// Downlevel each bundle file in assets/bundle/ for ChakraCore 1.11.
//
// ChakraCore 1.11 parses ES2017 plus a bit of ES2018, but does NOT support:
//   - nullish coalescing (??)             — ES2020
//   - optional chaining (?.)              — ES2020
//   - logical assignment (||= &&= ??=)    — ES2021
//   - optional catch binding (`catch {}`) — ES2019
//   - class fields (instance + static)    — ES2022
//   - object rest/spread ({...x, y: z})   — ES2018 (NOT supported by Chakra 1.11)
//   - top-level await                     — ES2022
//   - dynamic import(specifier)           — ES2020
//
// Everything else (arrow fns, let/const, classes, async/await, async functions,
// template literals, generators, for-of, destructuring, spread in arrays/calls,
// for-await-of) is fine.
module.exports = {
    babelrc: false,
    sourceType: 'unambiguous',
    compact: true,
    comments: false,
    plugins: [
        './scripts/babel-plugin-rewrite-dynamic-import.js',
        '@babel/plugin-transform-nullish-coalescing-operator',
        '@babel/plugin-transform-optional-chaining',
        '@babel/plugin-transform-logical-assignment-operators',
        '@babel/plugin-transform-optional-catch-binding',
        '@babel/plugin-transform-class-properties',
        '@babel/plugin-transform-object-rest-spread',
    ],
};

