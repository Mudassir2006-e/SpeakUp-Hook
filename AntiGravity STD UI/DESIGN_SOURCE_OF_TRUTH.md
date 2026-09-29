# SpeakUp — Design Source of Truth

> **Master Visual Reference**: Google Stitch Design System  
> **Brand**: SpeakUp  
> **Aesthetic Philosophy**: Modern Corporate / Academic Prestige & Editorial Minimalism

This document formalizes the exact visual and interactive design implemented for the SpeakUp frontend from the supplied Google Stitch design files. All future backend integration, database connections, and functional extensions must strictly adapt to this UI foundation without altering layout geometry, typography hierarchy, or visual language.

---

## 1. Brand Identity & Logo

- **Brand Name**: `SpeakUp` (Never use ENG-LISTON or Englishin).
- **Core Domain**: High-level professional executive English education, speaking cadence, articulation, and grammar architecture.
- **Logo Symbol**: The official standalone prestige microphone emblem featuring:
  - Outer resonance speech wave arcs (gold `#D4AF37`)
  - Architectural cradle bracket in deep obsidian (`#141416` in light mode, `#E5E2E1` in dark mode)
  - Microphone capsule body in warm metallic gold gradient (`#F2D06B` to `#A8811A`)
  - Acoustic grille slits and ascending upward vocal arc
  - Apex beacon star representing clarity and intellectual authority
- **Typography Pairing in Wordmark**: `Hanken Grotesk` Bold uppercase tracking with tight letter-spacing.

---

## 2. Color Palette & Theming

The system implements a dual-theme architecture (Warm Heritage Light Mode and Obsidian Dark Mode), dynamically toggled and persisted via `ThemeProvider`.

### Light Mode (Warm Heritage)
- **Background (`--bg-main`)**: `#fff8f0` (Warm parchment cream)
- **Primary Text (`--text-main`)**: `#1a1a1a` (Deep charcoal onyx)
- **Secondary / Muted Text (`--text-muted`)**: `#5d5f5e` (Editorial neutral grey)
- **Primary Action / Accent (`--gold-accent`)**: `#d4af37` (Metallic Gold)
- **Gold Hover (`--gold-hover`)**: `#b08e2b`
- **Surface Lowest / Cards (`--surface-lowest`)**: `#ffffff`
- **Surface Low (`--surface-low`)**: `#f9f3eb`
- **Surface Medium (`--surface`)**: `#f4ede5`
- **Surface High (`--surface-high`)**: `#eee7df`
- **Surface Highest (`--surface-highest`)**: `#e8e1da`
- **Border / Outlines (`--surface-border`)**: `rgba(26, 26, 26, 0.1)` / `#d0c5af`

### Dark Mode (Obsidian Prestige)
- **Background (`--bg-main`)**: `#0a0a0a` (Pure Obsidian Black)
- **Primary Text (`--text-main`)**: `#f7f0e8` (Soft Parchment Off-White)
- **Secondary / Muted Text (`--text-muted`)**: `#a8a5a0` (Warm Muted Silver)
- **Accent (`--gold-accent`)**: `#d4af37` (Illuminated Gold)
- **Surface Lowest / Cards (`--surface-lowest`)**: `#141416`
- **Surface Low (`--surface-low`)**: `#1a1a1e`
- **Surface Medium (`--surface`)**: `#222226`
- **Surface High (`--surface-high`)**: `#2a2a2f`
- **Border / Outlines (`--surface-border`)**: `rgba(255, 255, 255, 0.1)` / `#3a3a3e`

---

## 3. Typography Hierarchy

The system enforces a strict dual-font typographic rhythm:

1. **Hanken Grotesk (Sans-Serif)**:
   - Used for all structural UI components, navigation, buttons, labels, and headlines.
   - **Display Large**: `text-4xl sm:text-5xl lg:text-6xl`, font weight 700/800, line-height `1.08`, tracking `-0.02em`.
   - **Headline Medium**: `text-2xl to 3xl`, font weight 600/700, line-height `1.2`.
   - **Label Large / Small**: Uppercase, letter-spacing `0.08em` to `0.2em`, font weight 600/700.

2. **Source Serif 4 (Serif)**:
   - Used for all body copy, narrative descriptions, lecture notes, and literary quotes.
   - Injects academic authority, reading comfort, and editorial prestige.
   - **Body Large**: `18px`, line-height `1.7`, regular or italic for quotes.
   - **Body Medium**: `15px–16px`, line-height `1.6`.

3. **Material Symbols Outlined**:
   - Light weight (200–300), 20px–24px base size, filled for primary play/check active states.

---

## 4. Spacing & Grid System

- **Base Rhythm**: 8px incremental scale (8, 16, 24, 32, 48, 64px).
- **Container Max**: Centered `1200px` (Public site) and `1140px` (Curriculum detail & reading).
- **Page Gutters**: `24px` on desktop, `16px–20px` on mobile viewports.
- **Section Transitions**: `py-12` to `py-20` vertical breathing room.
- **Bento Grids**: 12-column layouts adaptable to `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

---

## 5. Component Specifications

### Buttons
- **Primary Buttons**: Full pill shape (`rounded-full`), solid charcoal (`#1a1a1a`) or white in dark mode, hover gold (`#d4af37`), uppercase tracking `0.1em–0.2em`, bold font weight.
- **Secondary Buttons**: Transparent with 1px border (`--surface-border`), hover border and text gold (`#d4af37`), pill shape.
- **Action Chips & Segmented Controls**: Rounded-lg or pill, subtle background with clear active indicators.

### Cards & Bento Panels
- Subtle 1px borders (`rgba(26,26,26,0.1)` in light mode, `rgba(255,255,255,0.1)` in dark mode).
- Subtle ambient hover elevation: `-translate-y-1` accompanied by soft diffused shadow (`box-shadow: 0 14px 34px -10px rgba(0,0,0,0.08)`).
- Never use harsh dark shadows.

### Input Fields & Forms
- Rounded corners (`rounded-xl` / `12px`).
- Background: Surface Lowest (`#ffffff` light, `#141416` dark).
- Border: 1px outline variant, switching on focus to a 1px ring of gold (`#d4af37`).
- Form labels: Uppercase label-sm font, generous letter-spacing.
- Password inputs include interactive visibility toggles (eye icons).

---

## 6. Authentication Architecture

- **Dedicated Layout**: Independent of the public navigation and footer; uses a top-left "Back to Home" pill and a minimal copyright notice.
- **Card Format**: Max width `440px–540px`, centered vertically and horizontally.
- **Verification Flow**:
  - 6 individual numeric OTP input boxes with automatic focus shifting, backspace retreat, and clipboard paste support.
  - 59-second resend countdown timer (`00:59` to `00:00`).
  - Seamless "Change Email" modal/route.
- **Password Policies**: Strict 8-character indicator with number and symbol validation note.

---

## 7. Student LMS Architecture

- **Sidebar**:
  - Collapsible desktop panel with smooth transition from expanded (64-width) to compact icon mode (20-width).
  - Preserves brand symbol, clear active state highlighting with gold indicators, and integrated profile access.
- **Dashboard**:
  - Preserved exactly from the approved Stitch dashboard composition.
  - Active enrolled course status with progress bar.
  - "Request Access" interactive modal featuring course details, fee confirmation notice, and submission confirmation state.
- **Course Player (`/lms/learn`)**:
  - Left curriculum accordion sidebar with module-by-module breakdown and completed/active/locked status indicators.
  - 3 integrated learning tabs:
    1. **Videos**: 16:9 studio masterclass player with custom video controls (Play, Replay 10s, Forward 10s, Volume, Speed 1.0x-1.5x, Scrubber, Fullscreen, Autoplay Next, Mark as Complete).
    2. **Notes**: Curated lecture notes with one-click "Copy Notes" action and blockquotes.
    3. **Practice**: Interactive sentence construction and audio speech recording simulator with submission feedback.
- **Certificates**:
  - Institutional credential preview with unique serial ID (`SPK-2026-A1-8842`), issued date, and PDF download action.

---

## 8. Complete Route Structure

| Route | Page Purpose | Key Features |
|---|---|---|
| `/` | Public Home | Hero, Admission Open badge, Free Demo, Standard of Excellence bento grid, Live Workshop card, Leadership links |
| `/about` | Leadership & Faculty | Sir Mudassir Ali biography, Practical English philosophy, Distinguished faculty cards |
| `/courses` | Course Catalog | Curricula grid, duration/level tags, links to Course Outline and Enrollment |
| `/course-outline` | Interactive Syllabus | Course selector dropdown, module accordion, learning objectives, lesson details |
| `/methodology` | Pedagogical Framework | 5-stage cyclical methodology (Learn, Practice, Communicate, Get Feedback, Improve), LMS overview |
| `/pricing` | Pricing & Enrollment | USD/PKR dual currency toggle, Dual bank account details (Meezan & Standard Chartered), Terms & Conditions |
| `/reviews` | Alumni Testimonials | Bento review grid, executive quotes, career trajectory outcomes |
| `/book-session` | Session Booking | Multi-field advisory request form with country code, mobile network, and confirmation state |
| `/demo` | Video Demonstrations | Masterclass video card previews with interactive modal player |
| `/faq` | Frequently Asked Questions | Categorized accordion FAQs (Enrollment, LMS, Certification) |
| `/lms-journey` | Architecture of Excellence | Account verification vs Individual course approval bento breakdown, three pillars |
| `/privacy` | Privacy & Compliance | Institutional protocols, 6 security pillars, student data rights |
| `/auth/login` | Student Portal Login | Tab switcher, email, password with eye toggle, demo credentials helper |
| `/auth/register` | Student Registration | Student/Professional toggle, phone with country code, course selection, bank notice |
| `/auth/forgot-password` | Password Recovery | Clean email entry card, Send Code trigger |
| `/auth/verify` | Email Verification | 6-digit numeric OTP inputs, 59-second resend countdown timer, Change email action |
| `/auth/change-email` | Update Email Address | New email entry and return to verification |
| `/auth/reset-password` | Password Reset | New password & confirmation with validation policy indicator |
| `/lms/dashboard` | Student LMS Dashboard | Collapsible sidebar, active progress, Request Access popup with state handling |
| `/lms/courses` | Enrolled Courses | Filterable active courses (In Progress / Completed), access badges, Continue button |
| `/lms/learn` | Course Learning Player | Studio video player, custom controls, Lecture Notes with copy action, Practice drills |
| `/lms/profile` | Scholar Profile | Personal information, photo upload trigger, enrolled status, security action links |
