/**
 * Stand-in for `lucide-react-native/icons/<name>`.
 *
 * The real modules are ESM `.mjs`, which sits outside the preset's transform and
 * arrives unparsed. Pointing Jest at the CJS build instead parses fine but pulls
 * ~1500 icon modules through babel per suite — it took the full run from 12s to
 * 685s and timed four screen suites out.
 *
 * Nothing under test asserts on a glyph: which icon a route declares is enforced
 * by the `IconKey` type at compile time and by `ICONS[key]` being an explicit
 * map, so a stub costs no coverage.
 */
const React = require('react');

function LucideIconStub(props) {
  return React.createElement('LucideIcon', props);
}
LucideIconStub.displayName = 'LucideIconStub';

module.exports = LucideIconStub;
module.exports.default = LucideIconStub;
