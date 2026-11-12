export function Avatar({ name, size = "md" }: { readonly name: string; readonly size?: "sm" | "md" | "lg" }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?"
  const sizeClass = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-14 w-14 text-xl",
  }[size]

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-ember/10 font-bold text-ember ${sizeClass}`}
    >
      {initial}
    </span>
  )
}
