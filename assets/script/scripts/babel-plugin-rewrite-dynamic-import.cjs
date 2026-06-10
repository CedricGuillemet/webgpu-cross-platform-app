// Custom Babel plugin: rewrite dynamic `import(specifier)` to `__import(specifier)`.
// Legacy Chakra (Windows SDK / Edge) can't parse `import(...)` syntax at all,
// so we replace the AST `Import` callee node with a normal `__import` Identifier
// — Babel emits it as a plain function call that Chakra parses fine. DawnTest's
// main.cpp registers `__import` as a host function that routes the call through
// the bundle's module resolver.
//
// This is a verbatim copy of the plugin used by the legacy assets/bundle pipeline
// (webgpu-cross-platform-app/scripts/babel-plugin-rewrite-dynamic-import.js).
// Kept in-tree so assets/script/ is self-contained (no parent-dir requires).
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
