# Tamrakar Complex V2.1 — Visibility and UI Quality Audit

## Confirmed implementation issues

1. The homepage looked for nested \`sections_control\`, but the settings hook
   returned flat entries as well. Missing flags hid offers, marketplace,
   price finder and other content without any intended user action.
2. The Reveal component started with \`opacity-0\` and depended on an
   intersection observer to render visible content.
3. Global \`.home-world .rounded-3xl\`, \`.rounded-2xl\`, and shadow rules
   deliberately overrode premium geometry. Every third section was forced
   cream, breaking dark mode and background continuity.
4. The flagship showcase stacked a redundant hero, repeated trust banners
   and speculative fallback prices.

## Corrections on this branch

- Merge default homepage section values with both flat and nested admin
  configuration, never override an explicit boolean false.
- Progressively enhance scroll effects: default visibility is 100%.
- Remove globally flattened corners, block shadows, and generic group hover
  transforms; let each component own its shapes.
- Replace duplicate brand billboard with a curated editorial heading.
- Replace hard-coded fallback prices with "Price on request"; prices from
  actual product data are shown only if greater than zero.
- Align navy, teal, lime, cobalt and warm neutral surfaces around a quiet
  editorial hierarchy; 44px mobile targets and clear keyboard outlines.

## Validation

Review preview at 360, 390, 768 and 1440 widths. Verify intentional
disabled sections remain off and incomplete settings do not make content
disappear. Inspect dark mode, empty marketplace data, keyboard navigation,
and reduced-motion behavior. Run unit tests, route checks, build, and Chrome
smoke checks independently. The repository's baseline TypeScript checks
contain errors outside these changes and require separate triage.
