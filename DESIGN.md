# DESIGN.md — EdTeknoGuard Design System Spec
> Single Source of Truth for Impeccable Engine & Frontend UI/UX.
> Derived from `docs/designsystempro.md` and `skills/impeccable/SKILL.md`.

## 1. Atmosphere & Visual Persona
- **Atmosphere:** *Mission-Control Telemetry & Network Reliability (Strictly Light Mode)*.
- **Theme Constraint (IRON RULE):** **STRICTLY LIGHT THEME ONLY**. Never generate or use dark themes, dark backgrounds, or full-black/pitch-dark interfaces. The entire application must be built on a clean, crisp architectural white (`#FFFFFF`) and subtle canvas (`slate-50`/`#F8FAFC`) with deep, high-contrast typography (`slate-900`/`#0F172A`).
- **Aesthetic Tone:** Dense, calm, high-contrast, professional, and tactile. Feels like an authoritative telecommunications instrument (Linear Light, Stripe Dashboard, Cloudflare Light) rather than a toy admin template.
- **Anti-Slop Directives:**
  - **Zero Status Dots & Zero Box-in-Box:** STRICTLY FORBIDDEN to wrap status text inside pills, borders, or boxes inside cards (`px-2 py-0.5 border rounded-md`). ZERO decorative dots (`w-1.5 h-1.5 rounded-full` banned everywhere). Status text must breathe purely as clean typography using font weight and semantic text color alone (`text-xs font-semibold text-color`).
  - Strictly refuse AI signatures: zero sparkles (`Sparkles` icon is banned), zero uncalibrated colored halos, zero fake glassmorphism (`backdrop-blur` on opaque backgrounds banned).
  - Let Content Be the Interface: Never wrap text in nested pills inside bordered cards.

## 2. Typography Token Scale
- **Font Families:**
  - Display & Body: Inter / Plus Jakarta Sans / system sans-serif.
  - Telemetry & Measurements ONLY: `font-mono tabular-nums` (strictly for optical Rx power `dBm`, IP addresses `10.10.x.x`, MAC addresses, duration timers, and numerical statistics).
  - **Ban:** Never apply `font-mono` as a "technical costume" to natural Indonesian labels or buttons.
- **Typographical Scale:**
  - Page Title: `text-xl font-bold text-slate-900 tracking-tight`
  - Section Header: `text-sm font-semibold text-slate-800 tracking-tight`
  - Card Title: `text-xs font-semibold text-slate-700 uppercase tracking-wider`
  - Big Metrics (KPI): `text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight`
  - Body Text: `text-sm text-slate-600 leading-relaxed`
  - Microcopy & Telemetry Labels: `text-[11px] text-slate-500 font-medium`

## 3. Color Palette & Semantic Tokens
- **Brand Identity:** Deep Cyan / Teal + Architectural Slate
  - Primary Brand Accent: `cyan-700` (`#0E7490`) / `cyan-800` (`#155E75`)
  - Subtle Surface Tint: `cyan-50/40`
  - Foreground Text: `slate-900` (`#0F172A`)
  - Secondary Text: `slate-600` (`#475569`) / Muted: `slate-400`
- **Surface & Elevation:**
  - Page Canvas: `bg-slate-50/50`
  - Card Containers: `bg-white border border-slate-200/90 rounded-xl shadow-xs`
  - Hover Elevation: `hover:border-cyan-300 hover:shadow-xs transition-all duration-150`
  - Button Active Feedback: `active:scale-[0.98]`
- **Semantic Optical Health (Fixed SOP Thresholds):**
  - Optimal / Normal (`> -26.0 dBm`): `emerald-600` (`#059669`) / `emerald-50`
  - Warning / Waspada (`-26.0` to `-27.0 dBm`): `amber-600` (`#D97706`) / `amber-50`
  - Critical / Kritis (`<= -27.0 dBm`): `rose-600` (`#E11D48`) / `rose-50`
  - LOS / Link Down: `purple-700` (`#7E22CE`) / `purple-50`
  - Invalid / Auth Fail: `orange-600` (`#EA580C`) / `orange-50`

## 4. Spacing & Rhythm
- Strict **4px / 8px Grid**: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48px`.
- Card padding: `p-4 sm:p-5`.
- Component gaps: `gap-2` for micro-elements, `gap-3 sm:gap-4` for grid cards.

## 5. Strict Icon & Symbol Hygiene (IRON RULE)
- **Monochromatic 1-Color Only:** All icons must be single-color (`currentColor`, `text-slate-500`, `text-slate-700`, or semantic text color). STRICTLY FORBIDDEN to wrap icons in pastel-colored decorative background tiles (`w-10 h-10 bg-amber-50 border-amber-200`).
- **Zero Arbitrary Icons:** Do not spray decorative icons onto headers or titles. Icons are reserved strictly for functional interaction (buttons, inputs, navigation cues), not arbitrary decoration.
- **Zero Emojis (Dilarang Total Menggunakan Emot):** Absolute ban on emoji characters (✅, ❌, ⚠️, 🚀) in UI copy, toast alerts, modals, or logs.
- **Mandatory Pure SVG:** All visual symbols and icons must be vector SVGs (Lucide React or clean inline SVGs). Raw text symbols (`✕`, `•`) are forbidden as icons or status dividers; use clean hairline dividers (`w-px h-3.5 bg-slate-200`) instead.
