/** Tailwind theme: tokens mapped from globals.css custom properties, plus the shared motion vocabulary. */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "hsl(var(--canvas) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        raised: "hsl(var(--raised) / <alpha-value>)",
        ink: "hsl(var(--ink) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        line: "hsl(var(--line) / <alpha-value>)",
        ember: { DEFAULT: "hsl(var(--ember) / <alpha-value>)", strong: "hsl(var(--ember-strong) / <alpha-value>)" },
        gold: "hsl(var(--gold) / <alpha-value>)",
        jade: "hsl(var(--jade) / <alpha-value>)",
        sky: { DEFAULT: "hsl(var(--sky) / <alpha-value>)", strong: "hsl(var(--sky-strong) / <alpha-value>)" },
        danger: "hsl(var(--danger) / <alpha-value>)",
        "on-ember": "hsl(var(--on-ember) / <alpha-value>)",
      },
      fontFamily: {
        sans: ['"Cairo Variable"', '"Noto Sans Arabic Variable"', "Tahoma", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Space Grotesk Variable"', '"Cairo Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        e0: "0 0 0 1px hsl(var(--line))",
        e1: "0 1px 2px rgba(31,26,22,.05), 0 8px 24px -12px rgba(31,26,22,.12)",
        e2: "0 24px 48px -16px rgba(0,0,0,.28)",
        glow: "0 10px 30px -10px hsl(var(--ember) / .45)",
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.25rem", "3xl": "1.75rem" },
      backgroundImage: {
        "ember-seam": "linear-gradient(90deg, hsl(var(--ember)), hsl(var(--gold)))",
        "ember-fade": "linear-gradient(180deg, hsl(var(--ember) / .14), transparent)",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        "pulse-dot": { "0%,100%": { boxShadow: "0 0 0 0 hsl(var(--jade) / .45)" }, "50%": { boxShadow: "0 0 0 6px hsl(var(--jade) / 0)" } },
        "slide-in": { from: { opacity: "0", transform: "translateY(-6px) scale(.98)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        "timeline-fill": { from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        breathe: { "0%, 100%": { opacity: ".55", transform: "scale(1)" }, "50%": { opacity: ".9", transform: "scale(1.06)" } },
      },
      animation: {
        "fade-up": "fade-up .45s cubic-bezier(.2,0,0,1) both",
        "pulse-dot": "pulse-dot 2s ease-out infinite",
        "slide-in": "slide-in .24s cubic-bezier(.2,0,0,1) both",
        shimmer: "shimmer 1.4s linear infinite",
        "timeline-fill": "timeline-fill .4s cubic-bezier(.2,0,0,1) both",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 6.3s ease-in-out infinite",
        "float-slower": "float 9.1s ease-in-out infinite",
        breathe: "breathe 9s ease-in-out infinite",
      },
      maxWidth: { shell: "1200px", prose: "68ch" },
      screens: { xs: "420px" },
    },
  },
  plugins: [],
}
