/**
 * Image capture and local photo storage.
 *
 * Deliberately NOT re-exported from `@/common/utils`: that barrel is pure, and
 * these load two native modules.
 */
export {
  PHOTO_MESSAGES,
  RETURN_PHOTO_PICKER_OPTIONS,
  deletePersistedPhoto,
  persistPhoto,
  photoExists,
  pickReturnPhoto,
  returnPhotoDir,
  validatePickedAsset,
} from './returnPhoto';
export type {
  LocalPhoto,
  PhotoPickErrorCode,
  PhotoSource,
  PickPhotoResult,
} from './returnPhoto';
