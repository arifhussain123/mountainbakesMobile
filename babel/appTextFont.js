/**
 * Babel plugin: inside src/, `import { Text, TextInput } from 'react-native'`
 * becomes an import from '@/shared/ui/AppText' — wrappers that apply the app
 * font (Urbanist) at the right weight. See src/shared/ui/AppText/AppText.tsx
 * for why this is done at build time instead of editing ~400 files.
 *
 * Only files under <project>/src are touched (never node_modules), and never
 * the wrapper itself (it needs the real components).
 */
const path = require('path');

const SRC = path.join(__dirname, '..', 'src') + path.sep;
const WRAPPER_DIR = path.join(SRC, 'shared', 'ui', 'AppText') + path.sep;
const SWAP = new Set(['Text', 'TextInput']);

module.exports = function appTextFont({ types: t }) {
  return {
    name: 'app-text-font',
    visitor: {
      ImportDeclaration(p, state) {
        const file = state.filename || '';
        if (!file.startsWith(SRC) || file.startsWith(WRAPPER_DIR)) return;
        if (p.node.source.value !== 'react-native' || p.node.importKind === 'type') return;
        const moved = p.node.specifiers.filter(
          (s) => t.isImportSpecifier(s) && s.importKind !== 'type' && SWAP.has(s.imported.name || s.imported.value),
        );
        if (moved.length === 0) return;
        p.node.specifiers = p.node.specifiers.filter((s) => !moved.includes(s));
        const decl = t.importDeclaration(
          moved.map((s) => t.importSpecifier(t.identifier(s.local.name), t.identifier(s.imported.name || s.imported.value))),
          t.stringLiteral('@/shared/ui/AppText'),
        );
        if (p.node.specifiers.length === 0) p.replaceWith(decl);
        else p.insertAfter(decl);
      },
    },
  };
};
