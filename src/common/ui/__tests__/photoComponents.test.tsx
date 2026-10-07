import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';

import { renderScreen } from '@/common/test-utils/render';
import { MBAttachmentThumb, MBImageViewer, MBPhotoPicker } from '../index';
import {
  ATTACHMENT_URI_MAX_AGE_MS,
  clearAttachmentUriCache,
  stableAttachmentUri,
} from '../common/attachmentUriCache';

/**
 * The three photo components: choosing one, showing one small, showing one big.
 *
 * The property worth the most here is the thumbnail's: a signed URL changes on
 * every fetch, and a list that handed each new URL to `<Image>` would download
 * every photo again on every pull-to-refresh.
 */

beforeEach(() => clearAttachmentUriCache());

/**
 * A thumbnail whose props a test can change in place.
 *
 * `rerender` would swap the whole tree and drop the providers `renderScreen`
 * wraps it in; a list refetch is a prop change on a mounted row, so that is
 * what this reproduces.
 */
let setThumb: (props: { id: string; url: string }) => void = () => {};
function ThumbHarness({ initial }: { initial: { id: string; url: string } }) {
  const [props, setProps] = React.useState(initial);
  setThumb = setProps;
  return <MBAttachmentThumb {...props} testID="thumb" />;
}
const FIRST = { id: 'a1', url: 'https://s/x?sig=1' };
const RESIGNED = { id: 'a1', url: 'https://s/x?sig=2' };

describe('stableAttachmentUri', () => {
  it('keeps the first URL it saw for an attachment', () => {
    expect(stableAttachmentUri('a1', 'https://s/x?sig=1', 1_000)).toBe('https://s/x?sig=1');
    expect(stableAttachmentUri('a1', 'https://s/x?sig=2', 2_000)).toBe('https://s/x?sig=1');
  });

  it('keeps attachments apart', () => {
    stableAttachmentUri('a1', 'https://s/x?sig=1', 1_000);
    expect(stableAttachmentUri('a2', 'https://s/y?sig=1', 1_000)).toBe('https://s/y?sig=1');
  });

  it('adopts the fresh URL once the kept one is near its expiry', () => {
    stableAttachmentUri('a1', 'https://s/x?sig=1', 0);
    expect(stableAttachmentUri('a1', 'https://s/x?sig=2', ATTACHMENT_URI_MAX_AGE_MS - 1)).toBe(
      'https://s/x?sig=1',
    );
    expect(stableAttachmentUri('a1', 'https://s/x?sig=3', ATTACHMENT_URI_MAX_AGE_MS)).toBe(
      'https://s/x?sig=3',
    );
  });

  it('stays bounded over a long session', () => {
    for (let i = 0; i < 400; i++) stableAttachmentUri(`a${i}`, `https://s/${i}?sig=1`, 1_000);
    // The oldest entries were evicted, so a new URL is adopted for them.
    expect(stableAttachmentUri('a0', 'https://s/0?sig=2', 1_000)).toBe('https://s/0?sig=2');
    // The newest are still held.
    expect(stableAttachmentUri('a399', 'https://s/399?sig=2', 1_000)).toBe('https://s/399?sig=1');
  });
});

describe('MBAttachmentThumb', () => {
  it('does not change its source when a refetch re-signs the URL', async () => {
    const screen = await renderScreen(<ThumbHarness initial={FIRST} />);
    expect(screen.getByTestId('thumb-image').props.source).toEqual({ uri: 'https://s/x?sig=1' });

    await act(async () => setThumb(RESIGNED));

    expect(screen.getByTestId('thumb-image').props.source).toEqual({ uri: 'https://s/x?sig=1' });
  });

  it('decodes at the size it is drawn', async () => {
    const screen = await renderScreen(
      <MBAttachmentThumb id="a1" url="https://s/x?sig=1" testID="thumb" />,
    );
    expect(screen.getByTestId('thumb-image').props.resizeMethod).toBe('resize');
  });

  it('shows the other photo when a recycled row is given another attachment', async () => {
    const screen = await renderScreen(<ThumbHarness initial={FIRST} />);

    await act(async () => setThumb({ id: 'a2', url: 'https://s/y?sig=1' }));

    expect(screen.getByTestId('thumb-image').props.source).toEqual({ uri: 'https://s/y?sig=1' });
  });

  it('retries once with the fresh URL when the kept one fails, then gives up', async () => {
    const screen = await renderScreen(<ThumbHarness initial={FIRST} />);
    await act(async () => setThumb(RESIGNED));

    // The kept (expired) URL fails: the newest one is tried.
    await act(async () => {
      screen.getByTestId('thumb-image').props.onError();
    });
    expect(screen.getByTestId('thumb-image').props.source).toEqual({ uri: 'https://s/x?sig=2' });

    // That one fails too: stop asking, and say so with the fallback glyph.
    await act(async () => {
      screen.getByTestId('thumb-image').props.onError();
    });
    expect(screen.queryByTestId('thumb-image')).toBeNull();
  });

  it('opens on tap when it is given somewhere to go', async () => {
    const onPress = jest.fn();
    const screen = await renderScreen(
      <MBAttachmentThumb
        id="a1"
        url="https://s/x?sig=1"
        onPress={onPress}
        accessibilityLabel="View photo"
        testID="thumb"
      />,
    );

    await fireEvent.press(screen.getByLabelText('View photo'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('MBImageViewer', () => {
  it('shows the whole image with the lines that say what it is', async () => {
    const screen = await renderScreen(
      <MBImageViewer
        visible
        uri="https://s/x?sig=1"
        onClose={() => {}}
        title="Return photo"
        captions={['12 × Cream Puff', 'Return r1', 'Committee Chowk', '', null]}
        testID="viewer"
      />,
    );

    const image = screen.getByTestId('viewer-image');
    expect(image.props.source).toEqual({ uri: 'https://s/x?sig=1' });
    expect(image.props.resizeMode).toBe('contain');
    expect(screen.getByText('12 × Cream Puff')).toBeTruthy();
    expect(screen.getByText('Committee Chowk')).toBeTruthy();
  });

  it('closes from its Close control', async () => {
    const onClose = jest.fn();
    const screen = await renderScreen(
      <MBImageViewer visible uri="https://s/x?sig=1" onClose={onClose} testID="viewer" />,
    );

    await fireEvent.press(screen.getByTestId('viewer-close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('says so when the photo cannot be loaded', async () => {
    const screen = await renderScreen(
      <MBImageViewer visible uri="https://s/x?sig=1" onClose={() => {}} testID="viewer" />,
    );

    await act(async () => {
      screen.getByTestId('viewer-image').props.onError();
    });

    expect(screen.getByText('This photo could not be loaded.')).toBeTruthy();
  });

  it('renders nothing with no photo', async () => {
    const screen = await renderScreen(
      <MBImageViewer visible uri={null} onClose={() => {}} testID="viewer" />,
    );
    expect(screen.queryByTestId('viewer-image')).toBeNull();
  });
});

describe('MBPhotoPicker', () => {
  const base = {
    title: 'Return Photo',
    helperText: 'Capture or upload a photo of the returned item',
    onPick: jest.fn(),
    onRemove: jest.fn(),
    testID: 'photo',
  };

  beforeEach(() => jest.clearAllMocks());

  it('offers the camera and the gallery, with the helper text, when empty', async () => {
    const screen = await renderScreen(<MBPhotoPicker {...base} photoUri={null} />);

    expect(screen.getByText('Return Photo')).toBeTruthy();
    expect(screen.getByText('Capture or upload a photo of the returned item')).toBeTruthy();

    await fireEvent.press(screen.getByText('Camera'));
    await fireEvent.press(screen.getByText('Gallery'));

    expect(base.onPick.mock.calls).toEqual([['camera'], ['gallery']]);
  });

  it('shows the preview with Retake, Replace and Remove once chosen', async () => {
    const screen = await renderScreen(<MBPhotoPicker {...base} photoUri="file:///cache/p.jpg" />);

    expect(screen.getByTestId('photo-preview').props.source).toEqual({ uri: 'file:///cache/p.jpg' });
    expect(screen.queryByText('Camera')).toBeNull();

    await fireEvent.press(screen.getByText('Retake'));
    await fireEvent.press(screen.getByText('Replace'));
    await fireEvent.press(screen.getByText('Remove'));

    expect(base.onPick.mock.calls).toEqual([['camera'], ['gallery']]);
    expect(base.onRemove).toHaveBeenCalledTimes(1);
  });

  it('shows an error and its way out', async () => {
    const onErrorAction = jest.fn();
    const screen = await renderScreen(
      <MBPhotoPicker
        {...base}
        photoUri={null}
        error="Camera permission is required to capture a return photo."
        errorActionLabel="Open settings"
        onErrorAction={onErrorAction}
      />,
    );

    expect(
      screen.getByText('Camera permission is required to capture a return photo.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText('Open settings'));
    expect(onErrorAction).toHaveBeenCalledTimes(1);
  });

  it('cannot be tapped while a pick is in flight', async () => {
    const screen = await renderScreen(<MBPhotoPicker {...base} photoUri={null} busy />);

    await fireEvent.press(screen.getByTestId('photo-camera'));

    expect(base.onPick).not.toHaveBeenCalled();
  });
});
