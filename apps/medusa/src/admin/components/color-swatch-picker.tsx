import { useEffect, useState } from "react"
import { IconButton, Input, Popover, Text, clx } from "@medusajs/ui"
import { XMarkMini } from "@medusajs/icons"

export const PRESET_SWATCHES: { label: string; hex: string }[] = [
  { label: "Black", hex: "#000000" },
  { label: "White", hex: "#FFFFFF" },
  { label: "Charcoal", hex: "#36454F" },
  { label: "Olive", hex: "#708238" },
  { label: "Sand", hex: "#C2B280" },
  { label: "Clay", hex: "#B66A50" },
  { label: "Navy", hex: "#1A365D" },
  { label: "Red", hex: "#E53E3E" },
  { label: "Blue", hex: "#3182CE" },
  { label: "Green", hex: "#38A169" },
  { label: "Yellow", hex: "#ECC94B" },
  { label: "Purple", hex: "#805AD5" },
]

export const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/

/**
 * A swatch-button + popover color picker: click the swatch to open a preset grid
 * and a manual hex entry, mirroring the picker used in the previous Vendure setup.
 * `onChange(hex)` commits a new color; `onChange(null)` clears it. Presets commit
 * immediately on click; the hex field commits on Enter or blur.
 */
export function ColorSwatchPicker({
  value,
  onChange,
  disabled,
  isPending,
}: {
  value: string | null
  onChange: (hex: string | null) => void
  disabled?: boolean
  isPending?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(value ?? "")

  useEffect(() => {
    setHex(value ?? "")
  }, [value])

  const isValid = hex === "" || HEX_PATTERN.test(hex)
  const currentSwatch = value && HEX_PATTERN.test(value) ? value : null

  const commitHex = () => {
    const trimmed = hex.trim()
    if (trimmed === (value ?? "")) return
    if (trimmed === "") {
      onChange(null)
      return
    }
    if (HEX_PATTERN.test(trimmed)) {
      onChange(trimmed)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={value ?? "No color set"}
          className={clx(
            "h-8 w-8 shrink-0 rounded-full border-2 transition-colors",
            "border-ui-border-strong hover:border-ui-border-interactive",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          style={{ backgroundColor: currentSwatch ?? "transparent" }}
        />
      </Popover.Trigger>
      <Popover.Content align="start" className="p-3">
        <div className="flex flex-col gap-y-3 w-56">
          <div className="grid grid-cols-6 gap-1.5">
            {PRESET_SWATCHES.map((swatch) => (
              <button
                key={swatch.hex}
                type="button"
                title={swatch.label}
                onClick={() => {
                  setHex(swatch.hex)
                  onChange(swatch.hex)
                }}
                className={clx(
                  "h-6 w-6 rounded-full border-2 transition-colors",
                  value === swatch.hex
                    ? "border-ui-border-interactive"
                    : "border-transparent hover:border-ui-border-strong"
                )}
                style={{ backgroundColor: swatch.hex }}
              />
            ))}
          </div>
          <div className="flex items-center gap-x-1.5">
            <Input
              size="small"
              value={hex}
              placeholder="#RRGGBB"
              className="font-mono"
              aria-invalid={!isValid}
              onChange={(e) => setHex(e.target.value)}
              onBlur={commitHex}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  commitHex()
                }
              }}
            />
            <IconButton
              type="button"
              size="small"
              variant="transparent"
              disabled={!value}
              onClick={() => {
                setHex("")
                onChange(null)
              }}
            >
              <XMarkMini />
            </IconButton>
          </div>
          {!isValid && (
            <Text size="xsmall" className="text-ui-fg-error -mt-1.5">
              Must be a hex color, e.g. #1A365D
            </Text>
          )}
          {isPending && (
            <Text size="xsmall" className="text-ui-fg-subtle -mt-1.5">
              Saving…
            </Text>
          )}
        </div>
      </Popover.Content>
    </Popover>
  )
}
