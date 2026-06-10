// Babel config for downleveling bundled scene scripts to legacy Chakra (Edge/IE11 era).
//
// Matches the long-standing webgpu-cross-platform-app/babel.config.js plugin set,
// updated for whichever combinations actually appear in the scene200 lite bundle
// once esbuild has run. Plugins listed cover the ES2018+ syntax that Chakra 1.11
// (legacy Edge SDK Chakra) cannot parse:
//
//   - nullish coalescing (??)             — ES2020
//   - optional chaining (?.)              — ES2020
//   - logical assignment (||= &&= ??=)    — ES2021
//   - optional catch binding (`catch {}`) — ES2019
//   - class fields (instance + static)    — ES2022
//   - object rest/spread ({...x, y: z})   — ES2018
//   - dynamic import(specifier)           — ES2020 (rewritten to __import)
//
// We deliberately do NOT use @babel/preset-env because we want surgical syntax
// downlevels without the runtime helper bundle that preset-env injects.
module.exports = {
    babelrc: false,
    sourceType: 'unambiguous',
    compact: true,
    comments: false,
    plugins: [
        './scripts/babel-plugin-rewrite-dynamic-import.cjs',
        '@babel/plugin-transform-nullish-coalescing-operator',
        '@babel/plugin-transform-optional-chaining',
        '@babel/plugin-transform-logical-assignment-operators',
        '@babel/plugin-transform-optional-catch-binding',
        '@babel/plugin-transform-class-properties',
        '@babel/plugin-transform-object-rest-spread',
    ],
};
