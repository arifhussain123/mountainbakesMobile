import ReactNativeBlobUtil from 'react-native-blob-util';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

import {
  RETURN_PHOTO_MAX_BYTES,
  RETURN_PHOTO_MAX_DIMENSION,
  RETURN_PHOTO_MAX_ORIGINAL_BYTES,
  RETURN_PHOTO_QUALITY,
} from '@/shared/types/attachment.types';
import {
  PHOTO_MESSAGES,
  deletePersistedPhoto,
  persistPhoto,
  photoExists,
  pickReturnPhoto,
  returnPhotoDir,
} from '../returnPhoto';

/**
 * The return photo, from the picker's answer to a file this app will queue.
 *
 * The picker is native and mocked in `jest.setup.js`, so nothing here proves a
 * camera opens or that a real frame comes back at 150 KB — that needs a device.
 * What it pins is everything decided in JS: the options the native side is
 * asked for, which answers become which results, and that a file the native
 * pass failed to shrink is refused rather than queued.
 */

const camera = launchCamera as jest.Mock;
const library = launchImageLibrary as jest.Mock;
const fs = ReactNativeBlobUtil.fs as unknown as {
  stat: jest.Mock;
  cp: jest.Mock;
  mkdir: jest.Mock;
  unlink: jest.Mock;
  exists: jest.Mock;
};
const files = (globalThis as unknown as { __blobFiles: Set<string> }).__blobFiles;

const ASSET = {
  uri: 'file:///data/user/0/test/cache/rn_image_picker_lib_temp_1.jpg',
  type: 'image/jpeg',
  fileSize: 148_000,
  width: 1280,
  height: 960,
  fileName: 'rn_image_picker_lib_temp_1.jpg',
};

beforeEach(() => {
  jest.clearAllMocks();
  files.clear();
});

describe('what the picker is asked for', () => {
  it('shrinks and compresses natively, from the shared constants', async () => {
    camera.mockResolvedValueOnce({ assets: [ASSET] });
    await pickReturnPhoto('camera');

    expect(camera).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaType: 'photo',
        maxWidth: RETURN_PHOTO_MAX_DIMENSION,
        maxHeight: RETURN_PHOTO_MAX_DIMENSION,
        quality: RETURN_PHOTO_QUALITY,
        includeBase64: false,
      }),
    );
  });

  it('never asks to save into the shared gallery', async () => {
    // `saveToPhotos` is the one option that needs the legacy storage
    // permission on older Androids, which this app does not declare.
    camera.mockResolvedValueOnce({ assets: [ASSET] });
    await pickReturnPhoto('camera');
    expect(camera.mock.calls[0][0].saveToPhotos).toBe(false);
  });

  it('takes one image from the system photo picker', async () => {
    library.mockResolvedValueOnce({ assets: [ASSET] });
    await pickReturnPhoto('gallery');

    expect(library).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaType: 'photo',
        selectionLimit: 1,
        maxWidth: RETURN_PHOTO_MAX_DIMENSION,
        maxHeight: RETURN_PHOTO_MAX_DIMENSION,
        quality: RETURN_PHOTO_QUALITY,
      }),
    );
    expect(camera).not.toHaveBeenCalled();
  });
});

describe('what comes back', () => {
  it('returns the optimised photo with its real size and dimensions', async () => {
    camera.mockResolvedValueOnce({ assets: [ASSET] });

    expect(await pickReturnPhoto('camera')).toEqual({
      status: 'picked',
      photo: {
        uri: ASSET.uri,
        mimeType: 'image/jpeg',
        sizeBytes: 148_000,
        width: 1280,
        height: 960,
      },
    });
  });

  it('reports the original size when the platform can tell it', async () => {
    fs.stat.mockResolvedValueOnce({ size: 3_400_000 });
    library.mockResolvedValueOnce({
      assets: [{ ...ASSET, originalPath: 'content://media/picker/0/1234' }],
    });

    const result = await pickReturnPhoto('gallery');
    expect(result.status === 'picked' && result.photo.originalBytes).toBe(3_400_000);
  });

  it('treats a cancel as a cancel, not as an error', async () => {
    camera.mockResolvedValueOnce({ didCancel: true });
    expect(await pickReturnPhoto('camera')).toEqual({ status: 'cancelled' });
  });

  it('names the permission and offers settings when it is refused', async () => {
    camera.mockResolvedValueOnce({ errorCode: 'permission', errorMessage: 'denied' });

    expect(await pickReturnPhoto('camera')).toEqual({
      status: 'error',
      code: 'permission',
      message: 'Camera permission is required to capture a return photo.',
      canOpenSettings: true,
    });
  });

  it('says so when the device has no camera', async () => {
    camera.mockResolvedValueOnce({ errorCode: 'camera_unavailable' });

    const result = await pickReturnPhoto('camera');
    expect(result).toMatchObject({
      status: 'error',
      code: 'camera_unavailable',
      canOpenSettings: false,
    });
  });

  it.each([
    ['any other picker error', { errorCode: 'others', errorMessage: 'boom' }],
    ['no asset at all', { assets: [] }],
    ['an asset with no file', { assets: [{ ...ASSET, uri: undefined }] }],
    ['an asset with no size', { assets: [{ ...ASSET, fileSize: undefined }] }],
    ['something that is not an image', { assets: [{ ...ASSET, type: 'video/mp4' }] }],
    ['an image format the server refuses', { assets: [{ ...ASSET, type: 'image/heic' }] }],
  ])('refuses %s with the try-another-image message', async (_label, response) => {
    camera.mockResolvedValueOnce(response);

    expect(await pickReturnPhoto('camera')).toMatchObject({
      status: 'error',
      code: 'unprocessable',
      message: PHOTO_MESSAGES.unprocessable,
    });
  });

  /**
   * The one that matters most. When the native resize fails, the picker hands
   * back the ORIGINAL file and reports success — so the size is the only sign
   * that nothing was compressed. That file must be refused, never queued.
   */
  it('refuses a photo over the server ceiling rather than sending the original', async () => {
    camera.mockResolvedValueOnce({
      assets: [{ ...ASSET, fileSize: RETURN_PHOTO_MAX_BYTES + 1, width: 4000, height: 3000 }],
    });

    expect(await pickReturnPhoto('camera')).toMatchObject({
      status: 'error',
      code: 'too_large',
      message: 'Unable to process this photo. Please try another image.',
    });
  });

  it('accepts a photo exactly at the ceiling', async () => {
    camera.mockResolvedValueOnce({ assets: [{ ...ASSET, fileSize: RETURN_PHOTO_MAX_BYTES }] });
    expect((await pickReturnPhoto('camera')).status).toBe('picked');
  });

  it('refuses an original too large to have been processed safely', async () => {
    fs.stat.mockResolvedValueOnce({ size: RETURN_PHOTO_MAX_ORIGINAL_BYTES + 1 });
    library.mockResolvedValueOnce({
      assets: [{ ...ASSET, originalPath: 'content://media/picker/0/huge' }],
    });

    expect(await pickReturnPhoto('gallery')).toMatchObject({ status: 'error', code: 'too_large' });
  });

  it('never throws, even when the native module does', async () => {
    camera.mockRejectedValueOnce(new Error('Activity is null'));

    await expect(pickReturnPhoto('camera')).resolves.toMatchObject({
      status: 'error',
      code: 'unprocessable',
    });
  });
});

describe('keeping the photo', () => {
  it('copies it out of the cache into the documents directory', async () => {
    files.add('/data/user/0/test/cache/rn_image_picker_lib_temp_1.jpg');

    const stored = await persistPhoto(ASSET.uri, 'image/jpeg');

    expect(stored).toMatch(
      /^file:\/\/\/data\/user\/0\/test\/files\/return-photos\/[0-9a-f-]{36}\.jpg$/,
    );
    expect(returnPhotoDir()).toBe('/data/user/0/test/files/return-photos');
    // A copy: the screen is still showing the cache file as its preview.
    expect(files.has('/data/user/0/test/cache/rn_image_picker_lib_temp_1.jpg')).toBe(true);
    expect(await photoExists(stored)).toBe(true);
  });

  it('creates the directory once and reuses it', async () => {
    files.add('/data/user/0/test/cache/rn_image_picker_lib_temp_1.jpg');

    await persistPhoto(ASSET.uri);
    await persistPhoto(ASSET.uri);

    expect(fs.mkdir).toHaveBeenCalledTimes(1);
    expect(fs.cp).toHaveBeenCalledTimes(2);
  });

  it('gives every copy its own name', async () => {
    files.add('/data/user/0/test/cache/rn_image_picker_lib_temp_1.jpg');
    const a = await persistPhoto(ASSET.uri);
    const b = await persistPhoto(ASSET.uri);
    expect(a).not.toBe(b);
  });

  it('fails loudly when the source is gone — there is no photo to queue', async () => {
    await expect(persistPhoto('file:///data/user/0/test/cache/missing.jpg')).rejects.toThrow();
  });

  it('deletes a stored photo', async () => {
    files.add('/data/user/0/test/cache/rn_image_picker_lib_temp_1.jpg');
    const stored = await persistPhoto(ASSET.uri);

    await deletePersistedPhoto(stored);

    expect(await photoExists(stored)).toBe(false);
  });

  it('never throws from a delete', async () => {
    fs.unlink.mockRejectedValueOnce(new Error('EACCES'));
    await expect(deletePersistedPhoto('file:///anywhere/x.jpg')).resolves.toBeUndefined();
    await expect(deletePersistedPhoto(null)).resolves.toBeUndefined();
  });

  it('reports a missing file as missing rather than throwing', async () => {
    fs.exists.mockRejectedValueOnce(new Error('boom'));
    expect(await photoExists('file:///anywhere/x.jpg')).toBe(false);
  });
});
