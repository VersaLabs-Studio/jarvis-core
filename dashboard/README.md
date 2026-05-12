# JARVIS Dashboard - Marketing Mockup

> **VersaLabs Studio / Linear Aesthetic** - A premium "Big Tech / Startup" style dashboard for the JARVIS autonomous SWE workflow system.

## Overview

This is a comprehensive, marketing-ready UI mockup for the JARVIS Core dashboard. Built with a **Linear-inspired aesthetic** featuring high contrast, low saturation colors, glassmorphism effects, and mandatory micro-animations.

## Design System

### Core Philosophy
- **High Contrast, Low Saturation:** Monochromatic scales with stark, bright interactive accents
- **Micro-Animations Mandatory:** No state change is instantaneous - all interactive elements use spring physics
- **Glassmorphism:** Strategic use of blurred backgrounds, stark borders with low opacity, overlapping layers
- **Bento Box Grid:** Asymmetric layout with varying column spans for visual hierarchy

### Color Palette (Dark Mode Default)
- **Background:** True Black (`#000000`) / Deep Void (`#0D0D0F`)
- **Surfaces:** `#161618` to `#1C1C1F`
- **Borders:** `rgba(255, 255, 255, 0.08)` (4-10% opacity)
- **Text Primary:** Pure White (`#ffffff`)
- **Text Secondary:** `zinc-400` to `zinc-500`
- **Accents:** Gradient text for operational keywords

### Typography
- **Primary Font:** `Outfit` (Geometric, clean, modern tech feel)
- **Headings:** `font-bold` with `tracking-tighter`, extreme weight contrast
- **Display:** `text-6xl` or `text-7xl` for heroes
- **Body/Utility:** `text-[13px]` for dense, highly legible text
- **Code/Logs:** `'Fira Code', monospace`

### Animation System
- **Spring Physics:** `{ stiffness: 300, damping: 30 }`
- **Hover:** Scale 1.02, Tap: Scale 0.98
- **Background Shifts:** Imperceptible color transitions
- **All State Changes:** Animated with spring physics

## Pages

| Page | File | Description |
|------|------|-------------|
| **Dashboard** | `index.html` | System overview, stats cards, quick actions, service health, model usage |
| **Services** | `services.html` | Monitor/control all MCP servers, bulk actions, Docker network visualization |
| **Models** | `models.html` | Model routing config, fallback chains, OpenRouter status, test models |
| **Integrations** | `integrations.html` | MCP integration management, status badges, test connections |
| **Workflows** | `workflows.html` | Automated tasks, cron jobs, morning audit, deploy pipeline |
| **Chat** | `chat.html` | Mock Telegram/web chat interface, message bubbles, tool call indicators |
| **Logs** | `logs.html` | System logs viewer, color-coded levels, search, auto-scroll |
| **Config** | `config.html` | Edit JSON/YAML configs, environment variables, validation |
| **Admin** | `admin.html` | System admin, user management, security, backup/restore |
| **Analytics** | `analytics.html` | Usage statistics, cost savings, charts, export reports |

## Technology Stack

- **HTML5** - Semantic markup
- **Tailwind CSS** (CDN) - Utility-first styling with strict color tokens
- **Vanilla JavaScript** - Interactive mockup behavior
- **Framer Motion** (CDN, optional) - Spring physics animations
- **Google Fonts** - Outfit font family
- **No frameworks** - Lightweight for marketing mockup

## File Structure

```
dashboard/
├── index.html              # Main dashboard (Bento grid layout)
├── services.html           # Services management (GlassCards)
├── models.html             # Model router config
├── integrations.html       # MCP integrations
├── workflows.html          # Workflow automation
├── chat.html               # Chat interface
├── logs.html               # Logs viewer
├── config.html             # Configuration editor
├── admin.html              # Admin panel
├── analytics.html          # Analytics & reports
├── css/
│   ├── custom.css          # Glassmorphism, spring animations
│   └── animations.css      # Keyframes, fallbacks
├── js/
│   ├── main.js             # Global JS, initialization
│   ├── navigation.js       # Sidebar nav (spring transitions)
│   ├── mock-data.js        # Mock data for all pages
│   └── spring.js           # Spring physics helpers
├── img/
│   ├── logo.svg            # JARVIS logo (white, gradient)
│   ├── favicon.ico         # Favicon
│   └── icons/              # UI icons (SVG)
└── README.md               # This file
```

## Features

### Design Features
- ✅ **Linear Aesthetic** - Premium "Big Tech / Startup" look
- ✅ **Glassmorphism** - Blurred backgrounds, stark borders
- ✅ **Spring Animations** - Micro-interactions on all elements
- ✅ **Bento Box Grid** - Asymmetric, varying column spans
- ✅ **Gradient Text** - Operational keywords highlighted
- ✅ **Dark Mode Default** - True black background

### Marketing Features
- ✅ **Export PNG** - Each page has export button for marketing
- ✅ **Book a Demo CTA** - Header call-to-action button
- ✅ **Feature Highlights** - Tooltips explaining sections
- ✅ **Responsive Design** - Desktop, tablet, mobile ready
- ✅ **Professional Appearance** - Premium, polished look

### Interactive Elements
- ✅ **Mock Actions** - Toast notifications for demo purposes
- ✅ **Status Indicators** - Pulsing dots, color-coded badges
- ✅ **Hover/Tap States** - Scale animations, background shifts
- ✅ **Navigation** - Active states, spring transitions
- ✅ **Tooltips** - Feature explanations on hover

## CDN Dependencies

```html
<!-- Outfit Font -->
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Framer Motion (optional) -->
<script src="https://unpkg.com/framer-motion@10.16.16/dist/framer-motion.js"></script>
```

## Usage

### Viewing the Dashboard
1. Open any `.html` file in a modern browser
2. All pages are self-contained with CDN dependencies
3. Navigation works between pages via sidebar links
4. No build step required - pure HTML/CSS/JS

### Customization
- **Colors:** Edit `tailwind.config` in each HTML file
- **Content:** Edit `js/mock-data.js` for data changes
- **Animations:** Edit `css/custom.css` for spring/fallback changes
- **Layout:** Edit Tailwind classes directly in HTML

## Banned Practices (Enforced)
- 🚫 **Generic UI Frameworks:** No Bootstrap, MUI, or unmodified Tailwind defaults
- 🚫 **Clown Colors:** No heavily saturated primaries (pure red, pure blue)
- 🚫 **Unanimated Layout Shifts:** All height shifts use `layout` animate properties
- 🚫 **Homogeneous Grids:** No equal-width column layouts for macro layouts

## Notes for Developers
- This is a **static mockup** for marketing purposes
- All data is **mocked** in `js/mock-data.js`
- Actions trigger **toast notifications** but don't perform real operations
- Future production version would connect to real APIs
- Glassmorphism requires `backdrop-filter` support (modern browsers)

## License
Part of the JARVIS Core project. See main repository for license details.

---

**Built with the VersaLabs Studio design system** - Premium aesthetics for modern web applications.
