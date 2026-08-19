# `assets/icons/` is intentionally empty

Icons are **not** files in this project. They come from `lucide-react-native`,
drawn through `react-native-svg`, and are reached by key:

```ts
import { MBIcon } from '@/components';
<MBIcon name="orders" size="tab" />
```

The one map is `src/constants/navigationIcons.ts` — an `IconKey` to a Lucide
component, deep-imported per icon (`lucide-react-native/icons/<name>`) so the
release build does not ship the whole barrel. Screens import a key, never an
icon component and never a pixel size; sizes are `theme.iconSize` tokens.

**Do not add PNG or SVG icons here.** A second icon source means two families in
one interface — different stroke weights, different optical sizes, different
corner treatments — which is exactly the mismatch that makes an app look
assembled rather than designed. If an icon is missing, it is almost certainly in
Lucide under another name; add it to `navigationIcons.ts`.

This directory is kept, with this note, because the asset layout calls for it and
an unexplained absence invites someone to fill it.

For drawings that are *not* icons — empty states, error states — see
`assets/illustrations/`.
