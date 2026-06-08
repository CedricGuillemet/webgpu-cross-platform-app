// Custom Babel plugin: rewrite dynamic import(specifier) to __import(specifier).
// Old ChakraCore (1.11) can't parse `import(...)` syntax at all, so we replace
// the AST `Import` callee node with a normal `__import` Identifier — Babel emits
// it as a plain function call that Chakra parses fine. Main.cpp registers
// `__import` to route the call through cx::Host::importByPath.
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
