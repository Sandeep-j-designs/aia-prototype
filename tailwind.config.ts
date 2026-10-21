import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const typographyScale = [
  "title-1",
  "title-2",
  "title-3",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "label-1",
  "label-2",
  "label-3",
  "body-1",
  "body-2",
  "body-3",
  "body-4",
  "caption-1",
  "caption-2",
] as const;
const typeStyle = (
  name: string
): [string, { lineHeight: string; letterSpacing: string }] => [
  `var(--text-${name}-size)`,
  {
    lineHeight: `var(--text-${name}-line-height)`,
    letterSpacing: `var(--text-${name}-letter-spacing)`,
  },
];

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./config/auth/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-family-primary)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        "open-sans": ["var(--font-family-primary)"],
      },
      fontSize: {
        ...Object.fromEntries(
          typographyScale.map((name) => [name, typeStyle(name)])
        ),
        // Existing feature classes resolve through the same scale.
        xs: typeStyle("body-4"),
        sm: typeStyle("body-3"),
        base: typeStyle("body-2"),
        lg: typeStyle("body-1"),
        xl: typeStyle("h6"),
        "2xl": typeStyle("h5"),
        "3xl": typeStyle("h4"),
        "4xl": typeStyle("h3"),
        "5xl": typeStyle("h2"),
        "6xl": typeStyle("h1"),
        "7xl": typeStyle("title-1"),
      },
      colors: {
        // Neo port aliases (styles/globals.css "NEO PORT ALIASES"): AIA 2.0's
        // --pi-* names, each pointing at this prototype's palette.
        pi: {
          "page": "var(--pi-page)",
          "surface-panel": "var(--pi-surface-panel)",
          "sunken": "var(--pi-sunken)",
          "fill": "var(--pi-fill)",
          "fill-2": "var(--pi-fill-2)",
          "row-hover": "var(--pi-row-hover)",
          "head-bg": "var(--pi-head-bg)",
          "ink": "var(--pi-ink)",
          "ink-2": "var(--pi-ink-2)",
          "ink-3": "var(--pi-ink-3)",
          "body": "var(--pi-body)",
          "faint": "var(--pi-faint)",
          "line": "var(--pi-line)",
          "line-2": "var(--pi-line-2)",
          "line-strong": "var(--pi-line-strong)",
          "rule-ledger": "var(--pi-rule-ledger)",
          "brand": "var(--pi-brand)",
          "brand-hover": "var(--pi-brand-hover)",
          "brand-active": "var(--pi-brand-active)",
          "brand-tint": "var(--pi-brand-tint)",
          "brand-border": "var(--pi-brand-border)",
          "brand-vivid": "var(--pi-brand-vivid)",
          "btn-primary-edge": "var(--pi-btn-primary-edge)",
          "btn-fill": "var(--pi-btn-fill)",
          "btn-fill-hover": "var(--pi-btn-fill-hover)",
          "btn-fill-active": "var(--pi-btn-fill-active)",
          "success": "var(--pi-success)",
          "success-dot": "var(--pi-success-dot)",
          "success-bg": "var(--pi-success-bg)",
          "success-line": "var(--pi-success-line)",
          "warning": "var(--pi-warning)",
          "warning-dot": "var(--pi-warning-dot)",
          "warning-bg": "var(--pi-warning-bg)",
          "warning-line": "var(--pi-warning-line)",
          "danger": "var(--pi-danger)",
          "danger-dot": "var(--pi-danger-dot)",
          "danger-bg": "var(--pi-danger-bg)",
          "danger-line": "var(--pi-danger-line)",
          "ai-ink": "var(--pi-ai-ink)",
          "teal": "var(--pi-teal)",
          "teal-tint": "var(--pi-teal-tint)",
          "nav-top": "var(--pi-nav-top)",
          "nav-bottom": "var(--pi-nav-bottom)",
        },
        "primary-hover": "hsl(var(--primary-hover))",
        "primary-active": "hsl(var(--primary-active))",
        "input-hover": "hsl(var(--input-hover))",
        "topnav-text": "hsl(var(--topnav-text))",
        "topnav-avatar-text": "hsl(var(--topnav-avatar-text))",
        badge: Object.fromEntries(
          ["information", "positive", "notice", "negative", "neutral"].map(
            (tone) => [
              tone,
              {
                DEFAULT: `hsl(var(--badge-${tone}))`,
                foreground: `hsl(var(--badge-${tone}-foreground))`,
              },
            ]
          )
        ),
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
          border: "hsl(var(--popover-border))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning-background))",
          foreground: "hsl(var(--warning-foreground))",
          border: "hsl(var(--warning-border))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "neutral-gray": {
          DEFAULT: "hsl(var(--neutral-gray))",
        },
        section: {
          DEFAULT: "hsl(var(--section))",
        },
        "danger-action": "hsl(var(--danger-action))",
        "panel-border": "hsl(var(--panel-border))",
        // The saturated status grounds for the dark toast's icon circle.
        status: {
          success: "hsl(var(--status-success-icon))",
          warning: "hsl(var(--status-warning-icon))",
          error: "hsl(var(--status-error-icon))",
        },
        "success-green": {
          DEFAULT: "hsl(var(--green))",
          foreground: "hsl(var(--green-foreground))",
          // PROPOSED — see the marked block at the end of styles/globals.css.
          border: "hsl(var(--green-border))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          muted: "hsl(var(--surface-muted))",
          stroke: "hsl(var(--surface-stroke))",
          // PROPOSED — see the marked block at the end of styles/globals.css.
          // Not in production yet; must be added before this screen ships.
          "foreground-muted": "hsl(var(--surface-foreground-muted))",
          badge: "hsl(var(--surface-badge))",
        },
        media: {
          dialog: "hsl(var(--media-dialog))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "var(--radius-xs)",
      },
      boxShadow: {
        "floating-panel": "0 12px 40px rgba(32,52,132,0.14)",
        contact: "var(--shadow-contact)",
        "pi-1": "var(--shadow-1)",
        "pi-2": "var(--shadow-2)",
        table: "var(--shadow-table)",
        "popover-shadow": "0 0 9.8px 3px rgba(0, 0, 0, 0.12)",
        "video-player": "0 24px 80px rgba(0, 0, 0, 0.35)",
        // The two-layer shadow on the Tost component in Figma
        // (Karbon — AI Accountant, node 21859:147791).
        toast:
          "0 2px 11.8px 0 rgba(0, 0, 0, 0.1), 0 4px 9.2px 0 rgba(0, 0, 0, 0.08)",
      },
      keyframes: {
        "ai-insight-progress": {
          from: { width: "0" },
          to: { width: "100%" },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        bounceY: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(1rem)" },
        },
        "progress-sheen": {
          "0%": {
            left: "-35%",
            opacity: "0",
          },
          "20%": {
            opacity: "1",
          },
          "80%": {
            opacity: "1",
          },
          "100%": {
            left: "100%",
            opacity: "0",
          },
        },
      },
      animation: {
        "ai-insight-progress": "ai-insight-progress 5s linear forwards",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // for file upload bouncing
        "bounce-delay-0": "bounceY 0.9s infinite",
        "bounce-delay-1": "bounceY 0.9s infinite 0.3s",
        "bounce-delay-2": "bounceY 0.9s infinite 0.6s",
        "progress-sheen": "progress-sheen 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;
