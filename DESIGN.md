# DESIGN.md

Source inspiration: `Lovable` from `VoltAgent/awesome-design-md`
Reference: `https://github.com/VoltAgent/awesome-design-md/tree/main/design-md/lovable`

## Visual Theme & Atmosphere

The interface should feel warm, capable, and editorial instead of glossy or cyberpunk. Base the page on a creamy parchment background with near-black text, generous whitespace, and subtle tonal depth. The result should feel like a well-made notebook for serious work, not a generic admin dashboard.

Key qualities:

- Warm cream foundation instead of pure white
- Charcoal text instead of pure black
- Borders used for containment more than floating shadows
- Calm, tactile controls with inset treatment on primary actions
- Large editorial headings with tight tracking

## Color Palette & Roles

- `--lovable-cream: #f7f4ed`
- `--lovable-surface: #fcfbf8`
- `--lovable-border: #eceae4`
- `--lovable-ink: #1c1c1c`
- `--lovable-muted: #5f5f5d`
- `--lovable-ink-soft: rgba(28, 28, 28, 0.82)`
- `--lovable-ink-faint: rgba(28, 28, 28, 0.4)`
- `--lovable-wash: rgba(28, 28, 28, 0.04)`
- `--lovable-focus: rgba(0, 0, 0, 0.1)`

## Typography Rules

- Preferred family: `Camera Plain Variable, ui-sans-serif, system-ui`
- Use 600 for headings, 400 for body and controls
- Tight negative tracking on large titles
- Body copy should be easy and quiet, not high-contrast and harsh

Suggested scale:

- Hero: `clamp(2.8rem, 5vw, 4.2rem)` weight 600 tracking `-0.04em`
- Section heading: `clamp(1.8rem, 3vw, 2.8rem)` weight 600 tracking `-0.03em`
- Body: `1rem` to `1.0625rem` weight 400
- Caption/meta: `0.875rem`

## Component Styling

### Buttons

- Primary button:
  - dark charcoal background
  - cream text
  - 6px to 10px radius
  - subtle inset highlight and ring
- Secondary button:
  - transparent or cream background
  - `1px solid rgba(28, 28, 28, 0.4)` border
  - charcoal text

### Cards

- Use cream or off-white surfaces
- Prefer `1px solid #eceae4`
- Radius between `12px` and `18px`
- Avoid heavy card shadows

### Inputs

- Cream background
- Border with `#eceae4`
- Charcoal text
- Soft focus shadow instead of neon ring

## Layout Principles

- Let section spacing breathe
- Use asymmetric layouts when helpful, but preserve clarity
- Keep admin workflows readable and calm
- Prefer a few strong surfaces over many nested cards

## Motion

- Keep transitions soft and brief
- Use opacity and transform, not dramatic bounce
- Motion should communicate state, not decoration

## Do

- Use warm neutrals
- Make important controls feel tactile
- Keep hierarchy strong through size and spacing
- Preserve admin usability first

## Don’t

- Don’t use purple-on-dark AI aesthetics
- Don’t wrap everything in identical cards
- Don’t use pure black or pure white
- Don’t add decorative gradients without purpose
