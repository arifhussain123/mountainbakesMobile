/**
 * Babel plugin: inside src/, `import { Text, TextInput } from 'react-native'`
 * becomes an import from src/shared/ui/AppText — wrappers that apply the app
 * font (Urbanist) at the right weight. See src/shared/ui/AppText/AppText.tsx
 * for why this is done at build time instead of editing ~400 files.
 *
 * Only files under <project>/src are touched (never node_modules), and never
 * the wrapper itself (it needs the real components).
 *
 * The import it adds is a RELATIVE path, not '@/shared/ui/AppText':
 * babel-plugin-module-resolver rewrites '@/' aliases in its own pass at
 * Program enter, before this visitor runs, so an injected '@/' path is never
 * rewritten and Metro fails to resolve it (release bundle: "Unable to resolve
 * module @/shared/ui/AppText").
 */
const path = require('path');

const SRC = path.join(__dirname, '..', 'src') + path.sep;
const WRAPPER_DIR = path.join(SRC, 'shared', 'ui', 'AppText') + path.sep;

/** './x' / '../../shared/ui/AppText' from the importing file's folder, with forward slashes. */
function wrapperPathFrom(file) {
  const rel = path.relative(path.dirname(file), path.join(SRC, 'shared', 'ui', 'AppText')).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}
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
          t.stringLiteral(wrapperPathFrom(file)),
        );
        if (p.node.specifiers.length === 0) p.replaceWith(decl);
        else p.insertAfter(decl);
      },
    },
  };
};
