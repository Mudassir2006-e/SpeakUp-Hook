---
name: ENG-LISTON Heritage
colors:
  surface: '#fff8f1'
  surface-dim: '#dfd9d1'
  surface-bright: '#fff8f1'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f9f3eb'
  surface-container: '#f4ede5'
  surface-container-high: '#eee7df'
  surface-container-highest: '#e8e1da'
  on-surface: '#1e1b17'
  on-surface-variant: '#444748'
  inverse-surface: '#33302b'
  inverse-on-surface: '#f7f0e8'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1b1b'
  on-tertiary-container: '#858383'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c9c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#fff8f1'
  on-background: '#1e1b17'
  surface-variant: '#e8e1da'
  charcoal-text: '#1a1a1a'
  gold-accent: '#d4af37'
  obsidian-dark: '#0a0a0a'
  cream-bg: '#fff8f0'
  surface-border: rgba(26, 26, 26, 0.1)
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: '0'
  body-lg:
    fontFamily: Source Serif 4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.7'
  body-md:
    fontFamily: Source Serif 4
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-lg:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  margin-mobile: 20px
  margin-desktop: 48px
  gutter: 24px
  container-max: 1140px
  stack-sm: 16px
  stack-md: 32px
  stack-lg: 64px
  base: 8px
---

## Brand & Style
The brand identity is rooted in "Premium Executive Education," targeting global leaders and high-achieving professionals. It evokes an emotional response of **prestige, intellectual authority, and disciplined excellence**.

The design style is a sophisticated blend of **Modern Corporate and Editorial Minimalism**. It utilizes heavy whitespace to suggest "breathing room" for complex thoughts, paired with sharp typographic hierarchy and gold accents to signal high-value services. The aesthetic is "quiet luxury"—avoiding loud gradients or excessive ornamentation in favor of precise alignment and high-quality imagery.

## Colors
The palette is built on a foundation of **Charcoal (#1a1a1a)** and **Cream (#fff8f0)**, providing a warmer, more academic feel than pure black and white. 

- **Primary:** Deep Charcoal for text and primary interactive states, representing stability.
- **Secondary:** Metallic Gold for highlights, signals of excellence, and specialized CTA accents.
- **Neutral:** A warm cream background that reduces eye strain and provides a premium, paper-like feel.
- **Dark Mode:** Inverts to an "Obsidian" theme using #0a0a0a as the base surface with off-white text to maintain legibility without losing the premium character.

## Typography
The system uses a high-contrast typographic pairing:
- **Hanken Grotesk (Sans):** Used for headlines and functional UI labels. It provides a sharp, modern, and efficient container for the brand's technical authority.
- **Source Serif 4 (Serif):** Used for body copy and italicized emphasis. This injects a literary, academic, and trustworthy tone into the long-form content.

**Key Rule:** Headlines should use tight line heights (1.1-1.3) and slight negative letter spacing for a "locked-in" editorial look. Labels must always be uppercase with generous tracking (0.05em to 0.1em) to maintain a premium navigational feel.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy within a 1140px centered container for desktop, ensuring readability is never compromised by overly wide line lengths.

- **Grid:** A 12-column system is used for complex sections like the Bento grid, while simpler sections favor a 2-column "split" (Hero/Features).
- **Vertical Rhythm:** Large vertical gaps (`stack-lg` of 64px) are used between major thematic sections to clearly delineate the narrative flow.
- **Mobile Adaptation:** Margins shrink from 48px to 20px. Stacked elements reflow from horizontal to vertical, and display type scales down by approximately 25% to fit narrow viewports.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Subtle Glassmorphism** rather than traditional heavy shadows.

- **Surfaces:** Use slightly different shades of Cream and White to separate content blocks (e.g., a white card on a cream background).
- **Glassmorphism:** The Navigation Bar uses a 90% opacity blur (`backdrop-filter: blur(8px)`) to maintain context while scrolling.
- **Shadows:** Only used sparingly on interactive cards and the Navigation Bar. Shadows must be "Ambient"—highly diffused with low opacity (e.g., `rgba(0,0,0,0.05)`), appearing as a soft glow rather than a hard drop shadow.
- **Outlines:** Low-contrast borders (1px) in `rgba(0,0,0,0.1)` define card boundaries without creating visual noise.

## Shapes
The shape language is **Soft and Precise**. 
- **Standard UI Elements:** Use a base 4px (0.25rem) radius for a disciplined, architectural feel.
- **Buttons & Chips:** Are more rounded (0.5rem to 0.75rem) to signify touchability and provide a slight contrast to the rigid grid.
- **Imagery:** Cards and video containers use a 0.5rem (8px) radius to soften the visual impact of photography.
- **Pills:** Used exclusively for status indicators and the "Play" button background.

## Components
- **Buttons:**
    - *Primary:* Solid charcoal or white background, uppercase label-sm typography, 4px-8px radius.
    - *Action:* Floating buttons (like WhatsApp) use a circular shape with high-elevation shadows.
- **Navigation:**
    - Sticky top bar with a thin bottom border. Active links are indicated by a 2px gold bottom border.
- **Cards (Bento Style):**
    - Cards utilize a white background, subtle 1px borders, and internal padding of 40px (stack-md). 
    - Hover states should trigger a subtle lift (`translateY(-4px)`) and a slight shadow increase.
- **Input Fields:**
    - Minimalist design with a thin border. Focus state switches border color to gold.
- **Iconography:**
    - Use Material Symbols (Outlined) with a light weight (200-300) to match the refined typography. Fill icons only for specific active states (e.g., Play button).