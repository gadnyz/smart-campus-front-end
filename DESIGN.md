---
version: alpha
name: UNH Smart Campus
description: Light-first academic administration UI with calm teal branding, cool slate neutrals, fixed shell navigation, and flat bordered cards.
colors:
  background: "#f1f5f9"
  on-background: "#0f172a"
  background-dark: "#020617"
  on-background-dark: "#f8fafc"
  surface: "#ffffff"
  surface-dim: "#f8fafc"
  surface-bright: "#ffffff"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f8fafc"
  surface-container: "#ffffff"
  surface-container-high: "#f1f5f9"
  surface-container-highest: "#e2e8f0"
  surface-overlay: "#ffffff"
  surface-overlay-dark: "#0f172a"
  on-surface: "#0f172a"
  on-surface-variant: "#64748b"
  inverse-surface: "#0f172a"
  inverse-on-surface: "#f8fafc"
  outline: "#e2e8f0"
  outline-variant: "#cbd5e1"
  surface-tint: "#3b8aa7"
  primary: "#3b8aa7"
  on-primary: "#ffffff"
  primary-container: "#c2dce3"
  on-primary-container: "#1a4452"
  primary-hover: "#337993"
  primary-active: "#2b677d"
  primary-soft: "#6aacc1"
  primary-muted: "#84b5c5"
  primary-pale: "#c2dce3"
  secondary: "#64748b"
  on-secondary: "#ffffff"
  secondary-container: "#f1f5f9"
  on-secondary-container: "#334155"
  info: "#3b82f6"
  info-container: "#dbeafe"
  cyan: "#06b6d4"
  cyan-container: "#cffafe"
  warning: "#f59e0b"
  warning-container: "#fef3c7"
  accent-purple: "#a855f7"
  accent-purple-container: "#f3e8ff"
  success: "#22c55e"
  on-success: "#ffffff"
  danger: "#ef4444"
  on-danger: "#ffffff"
typography:
  display-lg:
    fontFamily: "SF Pro Display, sans-serif"
    fontSize: 2.5rem
    fontWeight: "700"
    lineHeight: 1.5
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: "SF Pro Display, sans-serif"
    fontSize: 1.875rem
    fontWeight: "500"
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-md:
    fontFamily: "SF Pro Display, sans-serif"
    fontSize: 1.75rem
    fontWeight: "700"
    lineHeight: 1.5
    letterSpacing: -0.01em
  title-lg:
    fontFamily: "SF Pro Display, sans-serif"
    fontSize: 1.2rem
    fontWeight: "700"
    lineHeight: 1.2
    letterSpacing: -0.01em
  title-md:
    fontFamily: "SF Pro Display, sans-serif"
    fontSize: 1.1rem
    fontWeight: "700"
    lineHeight: 1.4rem
    letterSpacing: 0
  body-lg:
    fontFamily: "SF Pro Display, sans-serif"
    fontSize: 1rem
    fontWeight: "400"
    lineHeight: 1.5
    letterSpacing: 0
  body-md:
    fontFamily: "SF Pro Display, sans-serif"
    fontSize: 0.95rem
    fontWeight: "400"
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: "SF Pro Display, sans-serif"
    fontSize: 0.92rem
    fontWeight: "400"
    lineHeight: 1.4
    letterSpacing: 0
  label-md:
    fontFamily: "SF Pro Display, sans-serif"
    fontSize: 0.78rem
    fontWeight: "600"
    lineHeight: 1rem
    letterSpacing: 0.01em
  label-sm:
    fontFamily: "SF Pro Display, sans-serif"
    fontSize: 0.72rem
    fontWeight: "700"
    lineHeight: 1rem
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  pill: 999px
  full: 9999px
  hero-outer: 56px
  hero-inner: 53px
spacing:
  unit: 8px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  "2xl": 32px
  "3xl": 40px
  page-padding: 8px
  topbar-padding-inline: 20px
  sidebar-padding: 16px
  card-padding: 32px
  subtopbar-padding-block: 0.9rem
  subtopbar-padding-inline: 1rem
  shell-gap: 12px
  section-gap: 16px
  widget-gap: 32px
shadows:
  none: "none"
  overlay: "0px 3px 5px rgba(0, 0, 0, 0.02), 0px 0px 2px rgba(0, 0, 0, 0.05), 0px 1px 4px rgba(0, 0, 0, 0.08)"
  focus-ring: "0 0 0 0.2rem rgba(59, 138, 167, 0.18)"
elevation:
  flat:
    shadow: "none"
    borderColor: "#e2e8f0"
  overlay:
    shadow: "0px 3px 5px rgba(0, 0, 0, 0.02), 0px 0px 2px rgba(0, 0, 0, 0.05), 0px 1px 4px rgba(0, 0, 0, 0.08)"
    borderColor: "#e2e8f0"
motion:
  duration-fast: 0.2s
  duration-standard: 0.4s
  duration-slow: 1s
  easing-standard: "cubic-bezier(0.05, 0.74, 0.2, 0.99)"
  easing-gentle: "ease-in-out"
  easing-exit: "cubic-bezier(0, 1, 0, 1)"
layout:
  topbar-height: 4.25rem
  sidebar-width: 18rem
  content-max-width: 1504px
  icon-button-size: 2.5rem
  avatar-size: 2rem
components:
  app-shell-topbar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: 0rem
    height: 4.25rem
    padding: "0 20px"
  app-shell-sidebar:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.on-surface}"
    rounded: 0rem
    padding: "12px 16px 16px 16px"
  card-standard:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.DEFAULT}"
    padding: "{spacing.card-padding}"
  content-subtopbar:
    backgroundColor: transparent
    textColor: "{colors.on-surface}"
    typography: "{typography.title-md}"
    padding: "0.9rem 1rem"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.DEFAULT}"
    height: 2.5rem
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary-outlined:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.DEFAULT}"
    height: 2.5rem
    padding: "0 16px"
  button-icon-circle:
    backgroundColor: transparent
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    height: 2.5rem
    width: 2.5rem
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.DEFAULT}"
    height: 2.5rem
    padding: "0 12px"
  avatar-chip:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    height: 2rem
    width: 2rem
  status-badge-active:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-success}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  auth-shell-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.hero-inner}"
    padding: "80px 32px"
---

## Overview

This design system is a calm, administrative dashboard with a distinctly academic tone. The experience should feel trustworthy, organized, and light rather than corporate-heavy or overly consumerized. Its identity is built from cool slate neutrals, a measured teal primary, and large white working surfaces that keep dense information readable.

The product uses a fixed application shell: a persistent top bar, a persistent left navigation rail, and content that lives inside clean cards. Visual drama is reserved for the authentication screen, where a soft teal gradient halo and oversized rounded frame create a welcoming first impression. Everywhere else, the UI stays restrained and businesslike.

## Colors

The palette is led by a blue-teal primary that communicates stability and institutional confidence rather than urgency or novelty.

- **Primary teal:** Use `primary`, `primary-hover`, and `primary-active` for main actions, focused highlights, active routes, and subtle branded emphasis.
- **Cool slate neutrals:** Backgrounds and shell surfaces are driven by very light slate tones in light mode and deep slate tones in dark mode. The product should feel airy by default.
- **Borders over shadows:** Separation is usually created with `outline` and `outline-variant` rather than heavy depth. Surfaces are crisp, not floating.
- **Utility accents:** Blue, cyan, amber, purple, green, and red are used sparingly for compact status chips, dashboard stat icons, and semantic feedback.

The brand image should never drift into tropical teal, neon cyan, or muddy gray. The default feeling is cool, clean, and institutional.

## Typography

Typography relies on **SF Pro Display** with a single-family system for both brand and UI text. The product uses weight, spacing, and casing changes rather than family changes to create hierarchy.

- **Brand and section titles:** Heavier weights with tight tracking and short line lengths.
- **Body text:** Compact but readable. This interface is optimized for dense admin workflows, so body text should remain efficient rather than editorial.
- **Kickers and metadata:** Small uppercase labels with increased letter spacing. These labels are important to the product's information architecture and should remain quiet but unmistakable.

Avoid decorative typography, wide tracking on long strings, or dramatic size jumps inside forms and tables.

## Layout

The layout is shell-first and productivity-oriented.

- **Top bar:** Fixed, slim, and always visible. It acts as chrome, not content.
- **Sidebar:** Fixed and collapsible, with clear grouping through uppercase section headers and nested indentation.
- **Content area:** Uses small page padding and large internal card padding. The outer frame is compact; the inner work surfaces are generous.
- **Responsive behavior:** On desktop, content shifts around the sidebar. On mobile, the sidebar becomes an overlay and the shell relies on a mask layer.
- **Auth view:** Uses a centered, vertically balanced composition with a large rounded panel inside a soft brand gradient frame.

Spacing follows an 8px rhythm, but cards are intentionally roomier at 32px to make structured admin content feel premium and scannable.

## Elevation & Depth

This system is mostly flat. Depth is introduced carefully and only where the shell needs it.

- **Standard cards:** No shadow by default. Depth comes from white surfaces, rounded corners, and thin borders against a slate page background.
- **Overlays and transient panels:** Use the `overlay` shadow token. This shadow is subtle and compact, supporting menus and sliding panels without turning the interface glossy.
- **Focus states:** Accessibility emphasis comes from a teal halo, not from shape distortion or animation-heavy treatments.

If a screen starts to feel layered or "material-heavy," it has gone too far.

## Shapes

Shape language is soft but controlled.

- **Cards and standard controls:** Medium-soft radii around 8px.
- **User chrome:** Top-bar user controls are pill-shaped; icon actions are circular.
- **Auth shell:** The sign-in frame uses oversized radii to create a more ceremonial entry point.
- **Tables and forms:** Stay rectilinear and crisp. Rounded corners should soften the experience, not make it toy-like.

The product should feel approachable, but never bubbly.

## Components

### Application Shell

The shell is the primary design anchor. The top bar is a white strip with a 1px bottom border. The sidebar is another white surface, separated by a right border. Both are intentionally simple so content cards and status accents carry the visual interest.

### Cards

Cards are the dominant surface pattern. They should always feel calm, structured, and easy to scan. Use large internal padding, minimal ornamentation, and clear type hierarchy. Cards should not rely on gradients or heavy shadows.

### Buttons

Primary buttons use the teal accent and small-to-medium sizing. Secondary actions are often outlined or text-based, especially in utility headers. Icon-only actions should remain circular and understated.

### Forms

Forms are compact, direct, and validation-aware. Input fields should prioritize clarity over decoration. Use inline error text and concise helper messages. Form layouts should stay in straightforward grid structures.

### Status and Avatar Elements

Status chips should be compact and semantic. Avatars use soft teal fills and white initials, matching the brand without competing with content.

### Authentication Panel

The authentication experience is the one intentionally expressive surface in the system. It uses a large rounded panel nested inside a brand-tinted gradient frame, but the panel content itself remains restrained and highly legible.

## Do's and Don'ts

- **Do** keep the overall feel light, crisp, and administrative.
- **Do** use the teal brand color as emphasis, not wallpaper.
- **Do** preserve the strong contrast between white work surfaces and cool slate page backgrounds.
- **Do** favor borders, spacing, and typography hierarchy over effects.
- **Do** keep dashboard icons and semantic accent colors compact and purposeful.

- **Don't** add heavy drop shadows to standard cards.
- **Don't** introduce warm neutrals, black-heavy UI chrome, or saturated competing brand colors.
- **Don't** turn every action into a primary-colored button.
- **Don't** overload table and form screens with decorative banners, gradients, or illustrations.
- **Don't** make the main application shell feel playful; reserve that softer energy for login and brand moments.
