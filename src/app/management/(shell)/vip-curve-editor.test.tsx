// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

const formStatus = vi.hoisted(() => ({ pending: false }))

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>()
  return { ...actual, useFormStatus: () => ({ pending: formStatus.pending }) }
})

vi.mock("./actions", () => ({ saveVipCurve: vi.fn() }))

import { VipCurveEditor } from "./vip-curve-editor"
import { saveVipCurve } from "./actions"

const mockSave = vi.mocked(saveVipCurve)

const DEFAULT_ROWS = [
  { key: "epic", coins: 0, basisPoints: 2000, title: "Epic", icon: "shield", color: "sky" },
  { key: "mythic", coins: 1000, basisPoints: 1500, title: "Mythic", icon: "gem", color: "gold" },
  { key: "immortal", coins: 5000, basisPoints: 1000, title: "Immortal", icon: "flame", color: "ember" },
]

beforeEach(() => {
  mockSave.mockClear()
})

afterEach(() => {
  cleanup()
  formStatus.pending = false
})

describe("VipCurveEditor", () => {
  it("renders 3 default rows; base row title Epic, coins 0, percent 20; second row coins 1000, percent 15", () => {
    render(<VipCurveEditor initial={DEFAULT_ROWS} />)

    const titleInputs = screen.getAllByRole("textbox", { name: "العنوان" }) as HTMLInputElement[]
    const coinsInputs = screen.getAllByRole("spinbutton", { name: "العملات المستهلكة" }) as HTMLInputElement[]
    const percentInputs = screen.getAllByRole("spinbutton", { name: "الهامش (٪)" }) as HTMLInputElement[]

    expect(titleInputs).toHaveLength(3)
    expect(coinsInputs).toHaveLength(3)
    expect(percentInputs).toHaveLength(3)
    expect(titleInputs[0].value).toBe("Epic")
    expect(coinsInputs[0].value).toBe("0")
    expect(percentInputs[0].value).toBe("20")
    expect(coinsInputs[1].value).toBe("1000")
    expect(percentInputs[1].value).toBe("15")
  })

  it("marks the base coins input readOnly with no delete button for it, shows the أساسي chip and the hint", () => {
    render(<VipCurveEditor initial={DEFAULT_ROWS} />)

    const coinsInputs = screen.getAllByRole("spinbutton", { name: "العملات المستهلكة" }) as HTMLInputElement[]
    expect(coinsInputs[0].readOnly).toBe(true)
    expect(coinsInputs[1].readOnly).toBe(false)

    // One delete button per non-base row only (2 for 3 rows).
    expect(screen.getAllByRole("button", { name: "حذف" })).toHaveLength(2)
    expect(screen.getByText("أساسي")).toBeTruthy()
    expect(
      screen.getByText(
        "المستوى الأساسي يبدأ من 0 عملة ولا يمكن تغيير حدّه؛ عدّل هامشه فقط. المستويات التالية لها حدود قابلة للتعديل.",
      ),
    ).toBeTruthy()
  })

  it("adds a row that is editable, deletes it, and never removes the base row", () => {
    render(<VipCurveEditor initial={DEFAULT_ROWS} />)

    fireEvent.click(screen.getByRole("button", { name: "إضافة صف" }))

    const coinsInputs = screen.getAllByRole("spinbutton", { name: "العملات المستهلكة" }) as HTMLInputElement[]
    expect(coinsInputs).toHaveLength(4)
    expect(coinsInputs[3].readOnly).toBe(false)
    expect(screen.getAllByRole("button", { name: "حذف" })).toHaveLength(3)

    // Delete the newly added (last) row.
    const deleteButtons = screen.getAllByRole("button", { name: "حذف" })
    fireEvent.click(deleteButtons[deleteButtons.length - 1])

    const afterDeleteCoins = screen.getAllByRole("spinbutton", {
      name: "العملات المستهلكة",
    }) as HTMLInputElement[]
    expect(afterDeleteCoins).toHaveLength(3)
    expect(afterDeleteCoins[0].value).toBe("0")
    expect(afterDeleteCoins[0].readOnly).toBe(true)
    expect(screen.getByText("أساسي")).toBeTruthy()
  })

  it("updates the second row coins/title/percent inputs when edited", () => {
    render(<VipCurveEditor initial={DEFAULT_ROWS} />)

    const titleInputs = screen.getAllByRole("textbox", { name: "العنوان" }) as HTMLInputElement[]
    const coinsInputs = screen.getAllByRole("spinbutton", { name: "العملات المستهلكة" }) as HTMLInputElement[]
    const percentInputs = screen.getAllByRole("spinbutton", { name: "الهامش (٪)" }) as HTMLInputElement[]

    fireEvent.change(coinsInputs[1], { target: { value: "1500" } })
    fireEvent.change(titleInputs[1], { target: { value: "Mythic+" } })
    fireEvent.change(percentInputs[1], { target: { value: "12.5" } })

    expect(coinsInputs[1].value).toBe("1500")
    expect(titleInputs[1].value).toBe("Mythic+")
    expect(percentInputs[1].value).toBe("12.5")
  })

  it("has icon/colour selects with the expected options and updates the preview on change", () => {
    const { container } = render(<VipCurveEditor initial={DEFAULT_ROWS} />)

    const iconSelects = screen.getAllByRole("combobox", { name: "الأيقونة" }) as HTMLSelectElement[]
    const colorSelects = screen.getAllByRole("combobox", { name: "اللون" }) as HTMLSelectElement[]

    expect(iconSelects).toHaveLength(3)
    expect(colorSelects).toHaveLength(3)

    const iconValues = Array.from(iconSelects[0].options).map((o) => o.value)
    expect(iconValues).toEqual(["shield", "gem", "flame", "sparkles", "bolt", "coins", "gift", "tag"])

    const colorValues = Array.from(colorSelects[0].options).map((o) => o.value)
    expect(colorValues).toEqual(["sky", "jade", "gold", "ember"])

    const previews = () => Array.from(container.querySelectorAll(".vip-preview")) as HTMLElement[]
    expect(previews()).toHaveLength(3)
    expect(previews()[1].textContent).toContain("Mythic")
    expect(previews()[1].className).toContain("border-gold")

    const iconPathBefore = previews()[1].querySelector("svg path")?.getAttribute("d")

    fireEvent.change(iconSelects[1], { target: { value: "flame" } })
    const iconPathAfter = previews()[1].querySelector("svg path")?.getAttribute("d")
    expect(iconPathAfter).toBeTruthy()
    expect(iconPathAfter).not.toBe(iconPathBefore)

    fireEvent.change(colorSelects[1], { target: { value: "ember" } })
    expect(previews()[1].className).toContain("border-ember")

    const titleInputs = screen.getAllByRole("textbox", { name: "العنوان" }) as HTMLInputElement[]
    fireEvent.change(titleInputs[1], { target: { value: "Mythic+" } })
    expect(previews()[1].textContent).toContain("Mythic+")
  })

  it("submits one entry per row for every level field via saveVipCurve", async () => {
    const { container } = render(<VipCurveEditor initial={DEFAULT_ROWS} />)
    const form = container.querySelector("form")!
    expect(form).not.toBeNull()

    fireEvent.submit(form)

    await waitFor(() => expect(mockSave).toHaveBeenCalled())

    const formData = mockSave.mock.calls[0]?.[0] as FormData
    expect(formData).toBeTruthy()
    expect(formData.getAll("levelKey")).toEqual(["epic", "mythic", "immortal"])
    expect(formData.getAll("levelTitle")).toEqual(["Epic", "Mythic", "Immortal"])
    expect(formData.getAll("levelCoins")).toEqual(["0", "1000", "5000"])
    expect(formData.getAll("levelPercent")).toEqual(["20", "15", "10"])
    expect(formData.getAll("levelIcon")).toEqual(["shield", "gem", "flame"])
    expect(formData.getAll("levelColor")).toEqual(["sky", "gold", "ember"])
  })
})
