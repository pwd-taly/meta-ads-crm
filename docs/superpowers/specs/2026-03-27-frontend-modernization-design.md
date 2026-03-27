# Frontend Modernization Design Spec
**Date:** 2026-03-27
**Project:** Meta Ads CRM
**Scope:** Complete frontend visual and UX modernization using Approach 3 (Hybrid)
**Status:** Design approved

---

## Overview

The Meta Ads CRM frontend feels dated and uncomfortable to use. This spec outlines a comprehensive modernization that combines a modern component system with targeted UX improvements. The goal is to achieve state-of-the-art visual design and comfort of use while maintaining the existing tech stack and information architecture.

**Key Outcomes:**
- Modern, professional visual aesthetic
- Improved data scanability and clarity
- Smoother, more pleasant interactions
- Consistent design language across all pages
- No breaking changes to component APIs

---

## Visual Design System

### Color Palette

**Base Colors:**
- Background: `#0f1117` (softer dark than current `#0a0a0a`)
- Surface: `#161b22` (slightly lighter for cards and containers)
- Border: `#30363d` (subtle dividers)
- Text Primary: `#e6edf3` (high contrast white-ish)
- Text Secondary: `#8b949e` (muted for secondary information)

**Semantic Colors:**
- Primary Accent: `#06b6d4` (cyan/teal - modern, friendly)
- Success: `#3fb950` (green)
- Warning: `#d29922` (amber)
- Danger: `#f85149` (red)
- Info: `#58a6ff` (blue)

**Grayscale (Tailwind 50-950):**
- 50: `#f6f8fa`
- 100: `#eaeef2`
- 200: `#d0d7de`
- 300: `#afb8c1`
- 400: `#8b949e`
- 500: `#6e7681`
- 600: `#57606a`
- 700: `#424a53`
- 800: `#30363d`
- 900: `#161b22`
- 950: `#0f1117`

**Implementation:** Update Tailwind config with custom color palette using these hex values.

### Typography

**Font Stack:**
- Primary: `Geist` (or `Inter` as fallback) - modern, high legibility, excellent for interfaces

**Font Scale & Usage:**
- H1: 32px, weight 700, line-height 1.2
- H2: 24px, weight 600, line-height 1.3
- H3: 20px, weight 600, line-height 1.4
- Subtitle: 14px, weight 500, line-height 1.5
- Body: 14px, weight 400, line-height 1.6
- Small/Captions: 12px, weight 400, line-height 1.5

**Improvements:**
- Increase line-height across body text (from default) for better readability
- Better contrast in heading hierarchy—use color accents strategically
- Consistent letter-spacing for improved scannability

### Spacing System

**Grid:** 8px base unit
**Common Spacing Values:**
- xs: 4px (gap inside compact buttons)
- sm: 8px (button padding, small gaps)
- md: 12px (standard padding, gaps)
- lg: 16px (card padding, section gaps)
- xl: 24px (major section spacing)
- 2xl: 32px (page-level spacing)

**Application:**
- Button padding: `px-4 py-2` (md horizontal, sm vertical)
- Card padding: `p-6` (lg)
- Section gaps: `gap-6` or `gap-8` (lg/xl)
- Page margins: `p-8` or `px-8 py-6` (xl/lg)

### Component Styling

**Border Radius:**
- Buttons: `rounded-md` (6px)
- Cards/Containers: `rounded-lg` (8px)
- Modals: `rounded-lg` (8px)
- Inputs: `rounded-md` (6px)
- Icons in buttons: `rounded` (4px)

**Shadows:**
- Subtle (hover states): `shadow-sm` (0 1px 2px rgba(0,0,0,0.05))
- Cards (resting): `shadow` (0 1px 3px rgba(0,0,0,0.1))
- Modals/Popovers: `shadow-lg` (0 10px 15px rgba(0,0,0,0.2))
- Elevation on hover: increase by one level (e.g., shadow → shadow-md)

**Borders:**
- Default border: 1px solid `#30363d`
- Focus state border: 2px solid primary accent
- Hover state: subtle background color shift, no border change (unless input)

**Transitions:**
- Default: `transition-all duration-200` (200ms for smooth feel)
- Hover state changes should use this
- Loading animations: 500ms or 300ms depending on context

---

## Dashboard Improvements

### Layout Structure

**Top Section: Key Metrics (3 cards in responsive grid)**
- Card 1: Total Leads + leads today + % change
- Card 2: Conversion Rate % + sparkline trend
- Card 3: Total Revenue + % change from previous period

**Middle Section: Leads Chart**
- Selectable time range tabs (7d, 30d, 3m) with underline indicator on active
- Clean recharts line chart with gradient fill
- Interactive tooltip on hover
- Clear legend below chart

**Bottom Section: Recent Activity Sidebar**
- Optional: small right sidebar showing 5 most recent leads
- Quick actions: View, Message, Edit
- Scrollable if more than 5 leads

### Visual Enhancements

**Metric Cards:**
- Modern gradient background: `from-slate-800/50 to-slate-900/50`
- Border: `1px solid #30363d`
- Large metric number with secondary smaller label
- Percentage change: green text for positive, red for negative, with icon (↑/↓)
- Subtle icon in top-right corner (users, percent, dollar)

**Charts:**
- Custom color scheme: use primary accent for line/bar, soften secondary colors
- No grid lines or minimal grid
- Cleaner axes with better labels
- Tooltip: white background, dark text, rounded, shadow
- Legend: horizontal, centered below chart

**Spacing:**
- Gap between metric cards: `gap-6`
- Gap between sections: `gap-8`
- Overall padding: `p-8`

---

## Navigation & Layout

### Sidebar

**Styling:**
- Width: 240px (unchanged)
- Modern list items with icons + text
- Active state: soft background color (`bg-slate-800/50`) + left border accent (4px, primary color)
- Hover state: `bg-slate-800/30` + subtle scale (1.02)
- Text: white for active, muted gray for inactive

**Spacing:**
- Item padding: `px-4 py-3` (md/sm)
- Gap between items: 4px
- Icon + text gap: 12px

**Transitions:**
- All hover changes: 150ms smooth

### Top Bar

**Content:**
- Left: optional breadcrumb navigation (e.g., "Dashboard > Analytics")
- Right: user profile dropdown + logout
- Height: 56px (standard)

**Styling:**
- Border-bottom: 1px solid `#30363d`
- Background: same as page (no contrast)
- Better padding and alignment

**Breadcrumbs:**
- Small text (12px), muted color
- Separators: `/` in gray
- Last item: white/bright

---

## Tables & Data Views

### Leads Table

**Header:**
- Column headers: semibold (600), slightly larger (14px)
- Sortable columns: add up/down arrow icon on hover
- Better padding: `px-4 py-3`

**Rows:**
- Alternating background: every other row with `bg-slate-800/30`
- Row height: 44px (more generous than current)
- Hover state: `bg-slate-700/40` with quick action buttons appearing

**Columns & Styling:**
- Status: colored pill badge (green for booked/closed, gray for new, red for lost)
- Phone/Email: smaller, muted text
- Date: relative format (e.g., "2 days ago") with tooltip for exact time
- Quick actions: "View" button appears on hover (icon + text)

**Pagination:**
- Clean controls: previous/next buttons + page indicator "Page 2 of 10"
- Rows per page selector (10, 25, 50)

### Campaign/Ads Table

**Same modern table treatment as Leads Table**
- Metrics (Spend, CPL, Leads, ROAS) in clear columns
- Add optional sparkline in column to show trend
- Status indicators for active/paused campaigns

### Lead Detail View

**Layout:**
- Card-based with sections
- Section grouping:
  - Contact Info (name, email, phone)
  - Campaign (campaign name, ad name, source)
  - Status & Sales (status dropdown, sale amount input)
  - Notes (text area)
- Consistent padding: `p-6` per section
- Section titles: subtle background, semibold text

**Form Fields:**
- Label above input, semibold, 14px
- Input styling: border `#30363d`, focus: primary accent border + subtle glow
- Better placeholder text (lighter, less visible)
- Required indicator: red asterisk or badge

**Action Buttons:**
- Save: primary button (cyan background, white text)
- Cancel: secondary button (outlined, accent color text)
- Delete: danger button (red, separate from primary actions)

---

## Forms & Interactions

### Input Fields

**Base Styling:**
- Border: 1px solid `#30363d`
- Padding: `px-3 py-2` (md/sm)
- Border-radius: `rounded-md` (6px)
- Background: transparent or very subtle `bg-slate-800/20`

**States:**
- Default: gray border
- Hover: slight border color change to lighter gray
- Focus: 2px solid primary accent border, subtle box-shadow
- Filled/Valid: check icon on right
- Error: red border, error message below in red text

**Label Styling:**
- Position: above input
- Weight: 500 (semibold)
- Size: 14px
- Color: white/bright
- Bottom margin: 6px
- Required indicator: red asterisk

### Button Styles

**Primary Button:**
- Background: primary accent (`#06b6d4`)
- Text: white, weight 600
- Padding: `px-4 py-2` (md/sm)
- Border-radius: `rounded-md` (6px)
- Hover: darker shade or slight scale (1.02)
- Active: pressed appearance (inset shadow or darker)
- Transition: 200ms

**Secondary Button:**
- Border: 2px solid primary accent
- Text: primary accent, weight 600
- Background: transparent
- Hover: `bg-primary/10` or light background
- Padding: `px-4 py-2` (md/sm)

**Danger Button:**
- Background: `#f85149` (red)
- Text: white
- Same padding and radius as primary
- Hover: darker red

**Icon Button:**
- Size: 40px (clickable area)
- Icon centered
- Hover: subtle background color, slight scale

### CSV Import Modal

**Structure:**
- Title: "Import Leads from CSV"
- Subtitle: "Upload a CSV file with lead information"
- File upload area: large, drag-and-drop enabled
- Instructions: "Drag and drop or click to select"
- After upload: preview of 3-5 rows, import button

**Styling:**
- Modal background: `#161b22`
- Border: 1px solid `#30363d`
- Rounded-lg (8px)
- Padding: `p-8`
- Backdrop: dark overlay with blur

**Upload Area:**
- Border: 2px dashed `#30363d`
- Hover: border becomes primary accent, background changes to `primary/5`
- Rounded-lg
- Padding: `py-12` (large, inviting)
- Icon centered, text below

### Toast Notifications

**Styling:**
- Position: bottom-right
- Background: dark with border `1px solid #30363d`
- Padding: `px-4 py-3`
- Rounded-md
- Icon + message
- Auto-dismiss after 3-4 seconds

**Color Variants:**
- Success: green accent icon, white text
- Error: red accent icon, white text
- Info: blue accent icon, white text
- Warning: amber accent icon, white text

---

## Micro-interactions & Polish

### Hover States

**All interactive elements:**
- Buttons: scale 1.02, shadow increase
- Links: underline appears (or color change)
- Cards: shadow increase on hover
- Table rows: background color shift, quick actions appear

### Loading States

**Skeleton Screens:**
- Use for initial page loads
- Grayscale placeholders matching layout
- Animated shimmer effect (subtle)
- Replace with actual content when ready

**Loading Spinners:**
- Custom spinner design using primary accent color
- Small size: 24px for inline
- Large size: 48px for full-page loading
- 800ms rotation duration

### Page Transitions

**Smooth transitions:**
- Fade-in for content (150ms)
- No jarring jumps
- Maintain layout stability (no CLS)

### Focus Indicators

**Keyboard Navigation:**
- Clear focus ring: 2px solid primary accent, offset 2px
- Works on all interactive elements
- High contrast for accessibility

---

## Implementation Approach

### Phase 1: Component Library Update (Week 1)

**Tailwind Config:**
- Update colors to match new palette
- Update spacing scales
- Add custom shadows and transitions

**Core Components to Rebuild:**
- Button (with variants: primary, secondary, danger, outline)
- Input (with states: default, focus, error, filled)
- Card (with padding/spacing standards)
- Badge (for status, colors)
- Modal/Dialog (updated styling)
- Tooltip (improved styling)

### Phase 2: Page Updates (Week 2-3)

**Order of Updates:**
1. Dashboard → Ads → Leads → Settings

**Per Page:**
- Apply new component styles
- Update color usage
- Improve spacing and layout
- Add micro-interactions

### Phase 3: Polish & QA (Week 4)

- Verify all states (hover, focus, active)
- Check accessibility
- Test on different screen sizes
- Cross-browser testing

### No Breaking Changes

- Existing component APIs remain unchanged
- CSS classes preserved for backward compatibility
- Incremental rollout (can update pages in any order)

---

## Accessibility

- All interactive elements have clear focus states (2px border outline)
- Color is never the only indicator (use icons + text)
- Text contrast meets WCAG AA standards (4.5:1 minimum)
- Semantic HTML via Radix UI maintained
- ARIA labels for icons and interactive elements

---

## Success Criteria

- ✅ App no longer feels dated (modern color palette, typography, spacing)
- ✅ Comfortable to use (better data layout, clearer hierarchy, smoother interactions)
- ✅ State-of-the-art appearance (polished, professional, contemporary)
- ✅ No breaking changes (existing components still work)
- ✅ Consistent design language (all pages follow same patterns)
- ✅ Improved usability (dashboards more scannable, tables more interactive)

---

## Technical Stack

**No changes to:**
- Next.js 14
- React 18
- Tailwind CSS (extended with new config)
- Recharts (with custom styling)
- Radix UI (components preserved)

**Additions:**
- None required (pure Tailwind + component rebuilding)
