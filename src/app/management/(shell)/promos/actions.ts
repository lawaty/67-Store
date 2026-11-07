"use server"

/**
 * Handles admin promo create and toggle form posts, redirects unauthenticated
 * requests to login, and revalidates the promos route with result redirects.
 */

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { serverApi } from "@/frontend/server"
import { ApiError } from "@/frontend/api"

async function submit(path: string, body: unknown): Promise<string | null> {
  try {
    await (await serverApi()).post(path, body)
    return null
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/management/login")
    if (error instanceof ApiError) return error.code
    throw error
  }
}

export async function createPromo(formData: FormData): Promise<void> {
  const error = await submit("/api/admin/promos", {
    code: String(formData.get("code") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    value: Number(String(formData.get("value") ?? "")),
    maxUses: String(formData.get("maxUses") ?? ""),
    expiresAt: String(formData.get("expiresAt") ?? ""),
  })

  if (error !== null) redirect(`/management/promos?error=${encodeURIComponent(error)}`)
  revalidatePath("/management/promos")
  redirect("/management/promos?ok=created")
}

export async function togglePromo(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "")
  const active = String(formData.get("active") ?? "") === "true"
  const error = await submit(`/api/admin/promos/${encodeURIComponent(id)}`, { active })

  if (error !== null) redirect(`/management/promos?error=${encodeURIComponent(error)}`)
  revalidatePath("/management/promos")
  redirect("/management/promos?ok=toggled")
}
