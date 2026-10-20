import ReactNativeBlobUtil from 'react-native-blob-util';

/**
 * Writes text the app built itself (the web's client-side CSV downloads, e.g.
 * the Admin Dashboard's Export CSV) to `fileName` in the app's cache and
 * returns its path, ready for `shareFile` — a real file, as the web saves one.
 */
export async function writeTextFile(fileName: string, text: string): Promise<string> {
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName.replace(/[\\/:*?"<>|]/g, '-')}`;
  await ReactNativeBlobUtil.fs.writeFile(path, text, 'utf8');
  return path;
}
