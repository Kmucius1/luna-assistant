# LUNA DESIGN BIBLE (NON-NEGOTIABLE)

This design language is permanently locked.

Claude must never redesign Luna. Claude must implement Luna.

If a future request conflicts with this design system, the existing design system takes priority unless explicitly approved by Zoe.

## Design Philosophy

Luna is a luxury iOS application. Not SaaS. Not enterprise. Not Material Design. Not Bootstrap. Not Windows. Not generic.

Every screen should feel like it belongs to one product.

## Visual Personality

**Keywords:** luxury, editorial, minimal, calm, premium, intentional, modern, creative, warm, feminine without being overly feminine, sophisticated, high-end, lifestyle.

**Never use:** corporate, tech startup, neon, gaming, cyberpunk, cartoon, playful, busy, overly colorful, gradient overload, generic dashboards.

## Color Palette (Locked)

**Primary background:** warm ivory, soft cream, natural linen, stone white. Never pure white. Never cold gray.

**Card background:** soft matte white, warm ivory, subtle translucency when using glass.

**Primary text:** rich charcoal, near black, softened slightly from true black.

**Secondary text:** warm gray, muted taupe.

**Accent colors:** muted gold, warm bronze, champagne, forest green, dusty sage, ocean teal, slate blue, deep navy. These are accents only — never dominate the interface.

**Never used** (unless specifically part of photography): bright red, hot pink, neon green, electric blue, purple gradients, rainbow accents, saturated orange.

## Photography (Locked)

Photography is mandatory. Every room uses editorial photography — not stock, not AI that looks fake. Every image should look professionally art directed: natural lighting, soft shadows, real materials, beautiful interiors, luxury fashion, wellness, travel, food, architecture.

No cheesy smiling business people. No fake office meetings. No posed stock photography.

## Iconography (Locked)

No emojis. No cartoon icons. No clipart. One consistent luxury icon family — thin strokes, rounded edges, elegant proportions. Every icon should feel like it belongs to Apple.

## Typography (Locked)

Primary: SF Pro Display, SF Pro Text. Editorial serif for large feature headings only. Never mix multiple decorative fonts. Hierarchy comes from weight and spacing, not excessive styling.

## Spacing (Locked)

Whitespace is part of the design. Minimum breathing room around every card. Never compress layouts to fit more information — if a screen feels crowded, remove elements, never shrink everything.

## Shadows

Very soft, very subtle. No heavy drop shadows. Cards should appear lifted by light, not floating dramatically.

## Corner Radius

Consistent across the app. Large, modern, elegant. No sharp corners. No inconsistent radii.

## Glass

Glass effects follow iOS: subtle blur, subtle transparency. Never frosted to the point of reducing readability.

## Animation

Every animation should feel physical. Cards glide, sheets float, buttons gently respond. No bouncing. No spinning. No flashy transitions.

## Buttons

Large, comfortable, rounded, minimal. No excessive outlines. No bright borders. Primary actions obvious; secondary actions quiet.

## Cards

Every card shares the same language: consistent radius, spacing, photography, typography, shadows. No card should feel like it came from another application.

## Desktop

Desktop is not redesigned. Desktop is simply a larger iPad — same dock, same navigation, same layout, more breathing room, larger photography. Nothing else.

## Responsive Layout Standard (Mandatory)

Every screen must be designed mobile-first. The iPhone experience is the source of truth. Desktop and tablet are expanded versions of the same experience — not separate layouts.

### Device Targets

**Primary device (source of truth): iPhone 17 Pro.** Every screen, animation, spacing decision, widget size, and navigation layout is designed and tested against the iPhone 17 Pro first. If it looks perfect there, it becomes the reference implementation.

**Secondary devices:** iPhone 17, iPhone 17 Pro Max, iPhone 16 Pro/Pro Max, current modern iPhones with Dynamic Island. Older devices remain supported but are not the design reference.

### Mobile

Design and test against iPhone 16/15 Pro and Pro Max in addition to the 17 Pro primary target. Support all modern iPhones through responsive scaling.

The Home screen must always fit without scrolling: greeting, weather widget, daily quote, hero card, room grid, and a persistent bottom dock. If additional content exists, it appears only after a natural scroll.

- Cards resize automatically; spacing compresses proportionally; no element may overlap another.
- Widgets never exceed their allocated space, use predefined size classes (small/medium/large hero — no custom sizes), scale but never overflow or crop incorrectly.
- Room cards use one consistent aspect ratio, resizing proportionally with available width — never stretched.
- Images use `object-fit: cover` with a maintained focal point; never distorted. Portrait stays portrait, landscape stays landscape.
- The bottom dock is persistent, uses iOS glass material, is safe-area aware, and never overlaps content or covers buttons.
- Respect Dynamic Island, status bar, home indicator, bottom inset, and landscape safe areas — nothing important sits underneath system UI.
- Touch targets meet Apple HIG minimums (44×44 points).

### Tablet

Tablet is not desktop — it should feel like a luxury iPad application. Increase breathing room, photography, and card width (3–4 columns depending on width) without stretching cards vertically. Keep the same navigation paradigm and the dock at the bottom. Never move navigation to a sidebar.

### Desktop

Desktop should emulate an iPad Pro experience, not a traditional web dashboard. Never introduce side navigation or a left sidebar. Never create dense tables. Instead: center the application, cap max content width, use a floating app container, keep the dock persistent, and scale up photography and spacing. Large empty margins create luxury, not wasted space.

### Responsive Scaling Rules

Never use fixed pixel layouts — use responsive sizing throughout (grid auto-fit, flexible cards, clamp typography, responsive spacing, CSS Grid, Flexbox, fluid containers). No hardcoded widths unless absolutely necessary.

When screen width changes, in priority order: maintain spacing → maintain aspect ratio → maintain image quality → maintain typography hierarchy → reduce card width only as a last resort. Never squash cards.

Vertical scrolling is acceptable. Horizontal scrolling is not, ever.

### Universal Layout

```
┌──────────────────────────────┐
│ Status Bar                   │
├──────────────────────────────┤
│ Header                       │
├──────────────────────────────┤
│ Hero / Primary Widget        │
├──────────────────────────────┤
│ Content Sections             │
│                              │
├──────────────────────────────┤
│ Floating Dock                │
└──────────────────────────────┘
```

Every page follows this same structure so users never have to relearn the interface.

### Quality Assurance Checklist

A build is not complete unless it passes all of the following.

**Mobile:** fits all supported iPhone sizes · no horizontal scrolling · dock always visible · hero card scales correctly · widgets never overlap · cards remain proportional · safe areas respected · touch targets meet Apple HIG (44×44 min).

**Tablet:** feels like an iPad app · no desktop sidebar · dock remains at bottom · larger spacing without breaking proportions · hero photography scales naturally.

**Desktop:** centered application container · looks like a luxury iPad experience · bottom dock preserved · maximum width enforced · no enterprise dashboard layout · no oversized empty panels · elegant margins around the application.

### The iPhone Test

Every new screen must pass this before it's considered complete:
- Does it feel comfortable on an iPhone 17 Pro?
- Can everything important be reached with one thumb?
- Are touch targets large enough?
- Does it respect the safe areas?
- Does it still feel calm and premium?

Only after passing does Claude optimize the iPad and desktop layouts.

## Room Themes (Locked)

Every room has a permanent emotional identity:

- **Today** — morning sunlight, warm apartment, cream, coffee, golden light, organized
- **Food** — editorial cookbook, natural wood, fresh ingredients, clean kitchen, warm ceramics
- **Style** — luxury wardrobe, soft fabrics, jewelry, editorial fashion, perfume, neutral tones
- **Fitness** — boutique gym, strength, natural light, minimal equipment, athletic elegance
- **Work** — creative office, MacBook, notebook, coffee, architecture, focus
- **Atelier** — fashion studio, fabric, sketches, mannequins, creative workspace, museum inspiration
- **Wellness** — spa, beach, pool, candles, skincare, nature, relaxation
- **Astrology** — night sky, moonlight, observatory, constellations, crystals, mystical without cliché
- **Money** — leather notebook, luxury office, financial clarity, minimal desk, confidence
- **Brain Dump** — creative desk, paper, ideas, sticky notes, sketchbook, calm organization
- **Travel** — airport lounge, boutique hotels, ocean, mountains, beautiful destinations, elegance
- **Next Move** — pathways, architecture, doors, bridges, mountains, new beginnings, purpose

## Final Design Rule

If any newly built screen looks like it belongs in another application, it must be redesigned before it is accepted. Every engineer compares a new screen against the approved Home screen before merging — if typography, colors, spacing, photography, iconography, or motion drift from the established language, the implementation is not complete.

## Design Immutability

The approved Home screen is the visual benchmark for Luna. Every future screen must feel like it was designed by the same person, on the same day, for the same product.

No future feature may introduce a new design language, color palette, card style, navigation pattern, icon family, typography system, or interaction model without an intentional update to this Design Bible.

Consistency is a product feature.

## Luna Prosperity — Night Theme (approved by Zoe, 2026-10-04)

Luna Prosperity (`/prosperity`) is a second Luna environment with an intentional, approved exception to the ivory palette: a **midnight** look. It is the only area allowed to use it, and its styles are scoped to the Prosperity shell so nothing leaks into the rest of Luna.

- **Background:** deep midnight navy / near-black blue. Never pure black.
- **Surfaces:** soft translucent glass over midnight, hairline champagne borders.
- **Text:** warm ivory primary, muted ivory secondary.
- **Accents:** champagne and muted gold (primary), with a very restrained dusty lavender as a tertiary accent only. No neon, no purple gradients, no glow overload.
- **Everything else in this Bible still applies:** no emojis, one thin-stroke rounded icon family, SF Pro + editorial serif for large headings only, large consistent radius, physical animation, mobile-first on iPhone 17 Pro, floating glass dock, no sidebar, no dense enterprise tables.
- **Clip Studio exception:** an editor needs a wide canvas and a bottom timeline. On desktop it renders inside the centered floating app container; the timeline is a bottom panel, never a sidebar.
