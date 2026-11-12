import { transformSync } from '@babel/core';
import { FONT, resolveFace } from '@/shared/ui/AppText';

describe('resolveFace (Urbanist weight → bundled face)', () => {
  it('maps each fontWeight to its own face', () => {
    expect(resolveFace({ fontWeight: '400' }, null)).toBe(FONT.regular);
    expect(resolveFace({ fontWeight: '500' }, null)).toBe(FONT.medium);
    expect(resolveFace({ fontWeight: '600' }, null)).toBe(FONT.semibold);
    expect(resolveFace({ fontWeight: '700' }, null)).toBe(FONT.bold);
    expect(resolveFace({ fontWeight: 'bold' }, null)).toBe(FONT.bold);
    expect(resolveFace({ fontWeight: '800' }, null)).toBe(FONT.bold);
  });

  it('reads the weight through style arrays (last one wins)', () => {
    expect(resolveFace([{ fontWeight: '700' }, { fontSize: 12 }, { fontWeight: '500' }], null)).toBe(FONT.medium);
  });

  it('a nested Text without its own weight keeps its parent\'s face', () => {
    expect(resolveFace({ fontSize: 12 }, FONT.bold)).toBe(FONT.bold);
    expect(resolveFace(undefined, null)).toBe(FONT.regular);
  });

  it('leaves an explicit fontFamily alone (icon fonts, monospace)', () => {
    expect(resolveFace({ fontFamily: 'monospace', fontWeight: '700' }, null)).toBeNull();
  });
});

// No Node typings in this project's tsconfig; jest runs under Node, so these exist at runtime.
declare const __dirname: string;
declare function require(id: string): unknown;
const join = (...parts: string[]) => parts.join('/').replace(/\/[^/]+\/\.\.\//g, '/');

describe('babel/appTextFont', () => {
  const plugin = require('../babel/appTextFont') as object;
  const run = (code: string, file: string) =>
    transformSync(code, {
      filename: file,
      babelrc: false,
      configFile: false,
      parserOpts: { plugins: ['typescript', 'jsx'] },
      plugins: [plugin],
    })!.code!;
  const inSrc = join(__dirname, '..', 'src', 'features', 'x', 'Y.tsx');

  it('moves Text/TextInput imports from react-native to the AppText wrappers inside src/', () => {
    const out = run("import { View, Text as T, TextInput } from 'react-native';", inSrc);
    expect(out).toMatch(/import \{ View \} from ['"]react-native['"];/);
    expect(out).toMatch(/import \{ Text as T, TextInput \} from ['"]\.\.\/\.\.\/shared\/ui\/AppText['"];/);
  });

  it('replaces the whole import when only Text was imported', () => {
    expect(run("import { Text } from 'react-native';", inSrc)).toMatch(/^import \{ Text \} from ['"]\.\.\/\.\.\/shared\/ui\/AppText['"];$/);
  });

  it('adds a path that resolves under the real babel.config.js (no unresolved @/ alias)', () => {
    const out = transformSync("import { Text } from 'react-native';\nexport const X = Text;", {
      filename: inSrc,
      cwd: join(__dirname, '..'),
      root: join(__dirname, '..'),
      configFile: join(__dirname, '..', 'babel.config.js'),
      babelrc: false,
    })!.code!;
    expect(out).not.toMatch(/@\/shared\/ui\/AppText/);
    expect(out).toMatch(/\.\.\/\.\.\/shared\/ui\/AppText/);
  });

  it('never touches the wrapper itself, files outside src/, or type-only imports', () => {
    const wrapper = join(__dirname, '..', 'src', 'shared', 'ui', 'AppText', 'AppText.tsx');
    expect(run("import { Text } from 'react-native';", wrapper)).toMatch(/from ['"]react-native['"]/);
    expect(run("import { Text } from 'react-native';", join(__dirname, 'x.tsx'))).toMatch(/from ['"]react-native['"]/);
    expect(run("import type { Text } from 'react-native';", inSrc)).toMatch(/from ['"]react-native['"]/);
  });
});
