import { getContainer } from "@/api/container"
import { readDefaultMethod } from "@/api/storefront"
import { json } from "@/api/http"

export async function GET(): Promise<Response> {
  return json({ method: await readDefaultMethod(getContainer()) })
}
