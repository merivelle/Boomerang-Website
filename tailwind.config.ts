import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark-mode depth comes from surface lightness, not shadow.
        // One hue (none), lightness only. `<alpha-value>` keeps Tailwind's /opacity modifiers working.
        ink: "oklch(14% 0 0 / <alpha-value>)",
        s1: "oklch(18% 0 0 / <alpha-value>)",
        s2: "oklch(23% 0 0 / <alpha-value>)",
        line: "oklch(28% 0 0 / <alpha-value>)",
        text: "oklch(97% 0 0 / <alpha-value>)",
        // Measured against --ink: muted 7.3:1, faint 4.64:1. Both clear WCAG AA
        // body text (4.5:1). `faint` at the old 48% was 3.02:1 — it only cleared
        // the 3:1 UI bar, and it carries 0.7rem labels.
        muted: "oklch(70% 0 0 / <alpha-value>)",
        faint: "oklch(58% 0 0 / <alpha-value>)",
        // The only chromatic value on the site. Reserved for "a cue is sounding".
        // Never touches imagery — the palette is a picture frame, not a painting.
        live: "oklch(64% 0.2 28 / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // KODE's idiom: the max encodes "N px at a 1440px comp", so the value
        // is traceable back to the design. Clamp ratio held to <= 2.5x.
        display: [
          "clamp(3.5rem, calc(220 / 1440 * 100vw), 8.75rem)",
          { lineHeight: "0.8", letterSpacing: "-0.04em" },
        ],
        title: [
          "clamp(2rem, calc(96 / 1440 * 100vw), 4.5rem)",
          { lineHeight: "0.85", letterSpacing: "-0.035em" },
        ],
      },
      letterSpacing: { tightest: "-0.045em" },
      transitionTimingFunction: {
        // One signature curve, used everywhere. Slow-in, decisive-out.
        signature: "cubic-bezier(0.38, 0.005, 0.215, 1)",
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
      },
      transitionDuration: { hover: "300ms" },
      keyframes: {
        // "The Return" — a slow pan that reverses rather than jump-cutting.
        // Paired with `alternate` in the animation shorthand.
        drift: {
          from: { transform: "scale(1.08) translate3d(-1.6%, -1.1%, 0)" },
          to: { transform: "scale(1.15) translate3d(1.6%, 1.1%, 0)" },
        },
        marquee: {
          from: { transform: "translate3d(0, 0, 0)" },
          to: { transform: "translate3d(-50%, 0, 0)" },
        },
      },
      animation: {
        marquee: "marquee 48s linear infinite",
      },
    },
  },
  plugins: [
    // The CSS mirror of the `canHover()` guard that HeroC, WorkCard and
    // HoverIndex each run in JS. Reveal-on-hover captions key off input
    // capability, not viewport width — a touch device gets the caption
    // outright, because it has no way to hover for it.
    plugin(({ addVariant }) => {
      addVariant("can-hover", "@media (hover: hover) and (pointer: fine)");
    }),
  ],
};

export default config;
