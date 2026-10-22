---
name: Elite Scholar
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4d4635'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#7f7663'
  outline-variant: '#d0c5af'
  surface-tint: '#735c00'
  primary: '#735c00'
  on-primary: '#ffffff'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#e9c349'
  secondary: '#5d5f5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e2'
  on-secondary-container: '#636564'
  tertiary: '#4e6073'
  on-tertiary: '#ffffff'
  tertiary-container: '#a2b5ca'
  on-tertiary-container: '#344759'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c6'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#d1e5fb'
  tertiary-fixed-dim: '#b5c9de'
  on-tertiary-fixed: '#081d2d'
  on-tertiary-fixed-variant: '#36495a'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
  surface-warm: '#fff8f0'
  gold-hover: '#b08e2b'
  outline-muted: '#c4c7c7'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: 0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Source Serif 4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Source Serif 4
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-edge: 32px
  stack-sm: 16px
  stack-md: 32px
  stack-lg: 64px
  container-max: 1200px
---

## Brand & Style
The brand identity is "Elite Scholar," a premium educational platform that balances academic authority with a modern, welcoming atmosphere. The design style is **Corporate / Modern** with a refined, **Editorial** touch. It avoids the coldness of typical SaaS by utilizing a warm "parchment" background and sophisticated serif typography for body text, creating a digital experience that feels as trustworthy and high-end as a physical prestige institution. The emotional response should be one of calm focus, accessibility, and professional growth.

## Colors
The palette is centered around **Gold (#d4af37)**, used as the primary action color to denote achievement and premium status. This is balanced against a deep **Onyx (#1a1c1c)** for high-contrast text and a soft **Warm Parchment (#fff8f0)** for primary containers. 

Functional surfaces use a neutral grey scale for UI housing (surface-container-low), while interactive elements leverage the primary gold or a muted steel blue for secondary accents. Backgrounds should remain off-white or very light grey to maintain readability and reduce eye strain.

## Typography
The system employs a dual-font strategy. **Hanken Grotesk** (Sans-Serif) is used for structural UI elements, headlines, and navigation to provide a clean, modern framework. **Source Serif 4** (Serif) is utilized for all long-form body content and descriptions to evoke a sense of literary authority and improve reading comfort. 

Labels are consistently uppercase with generous letter spacing (8%) to create a clear visual distinction from interactive text. Headlines utilize tighter line-heights and medium-to-semibold weights to command attention.

## Layout & Spacing
The system uses a **Fixed Grid** approach for centralized content (like authentication or detail views) and a fluid 12-column grid for dashboard layouts. The core spacing rhythm is built on an 8px base unit.

- **Vertical Spacing:** Use `stack-md` (32px) for standard section separation and `stack-lg` (64px) for major layout transitions.
- **Form Spacing:** Internal form elements follow a `stack-sm` (16px) rhythm.
- **Adaptive Rules:** On mobile, the `margin-edge` reduces from 32px to 16px. Centered cards expand to fill the width minus the margin, while maintaining their internal padding.

## Elevation & Depth
Depth is conveyed through **Low-contrast outlines** and subtle **Ambient shadows**. 
- **Surfaces:** Use a slight 1px border (`outline-variant`) at 30-60% opacity rather than heavy shadows to define card boundaries.
- **Shadows:** The `shadow-sm` utility is used sparingly on active containers (like the main form card) to lift it slightly from the base background. 
- **Interactive Depth:** Buttons and tabs use a 1px vertical translation (`-translate-y-[1px]`) on hover accompanied by a slightly deepened shadow to provide tactile feedback without looking skeuomorphic.

## Shapes
The shape language is consistently **Rounded**, using an 8px (0.5rem) base radius for inputs and small buttons. Larger containers, such as the primary authentication card, utilize a more pronounced 16px (1rem) radius to feel more approachable and modern. Inner elements (like tab indicators or radio toggles) use a 6px (0.375rem) radius to ensure they fit harmoniously within their parent containers.

## Components
- **Buttons:** Primary buttons are large (18px text, 16px vertical padding), using the primary gold background and white text. They always feature uppercase text and a semibold weight.
- **Input Fields:** Inputs use `surface-container-lowest` (pure white) backgrounds with a 1px border. The focus state is a 1px ring of the primary gold.
- **Tabs:** Segmented controls use a sliding background indicator. The inactive state uses `on-surface-variant` (grey), and the active state switches to the primary brand color.
- **Checkboxes:** Small, 4x4 units with primary gold fills when checked. 
- **Toggles/Radio Groups:** Styled as segmented buttons rather than traditional radio circles, providing a larger tap target and a cleaner UI.
- **Back Navigation:** Minimalist icon + uppercase label, positioned at the top-left margin of the viewport.