export type VizTone = "ember" | "sky" | "jade" | "gold" | "danger" | "muted"

export const VIZ_TONE: Record<VizTone, string> = {
  ember: "hsl(var(--ember))",
  sky: "hsl(var(--sky))",
  jade: "hsl(var(--jade))",
  gold: "hsl(var(--gold))",
  danger: "hsl(var(--danger))",
  muted: "hsl(var(--muted))",
}
