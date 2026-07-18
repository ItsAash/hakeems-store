import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"
import { ColorSwatchPicker } from "../components/color-swatch-picker"

type ProductOptionValue = {
  id: string
  value: string
}

type ProductOption = {
  id: string
  title: string
  values: ProductOptionValue[]
}

type ColorSwatch = {
  id: string
  option_value_id: string
  value: string
}

const swatchesQueryKey = (optionId: string) => ["color-swatches", optionId]

const ColorSwatchesWidget = ({ data }: { data: ProductOption }) => {
  const productOption = data
  const queryClient = useQueryClient()

  const isColorOption = /colou?r/i.test(productOption?.title || "")

  const { data: swatchesData, isLoading } = useQuery({
    queryKey: swatchesQueryKey(productOption?.id),
    queryFn: async () => {
      const response = await sdk.client.fetch<{ color_swatches: ColorSwatch[] }>(
        "/admin/color-swatches",
        { query: { option_id: productOption.id } }
      )
      return response.color_swatches
    },
    enabled: isColorOption && !!productOption?.id,
  })

  const swatchByValueId = new Map(
    (swatchesData ?? []).map((swatch) => [swatch.option_value_id, swatch])
  )

  const upsert = useMutation({
    mutationFn: (input: { option_value_id: string; value: string }) =>
      sdk.client.fetch("/admin/color-swatches", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: swatchesQueryKey(productOption.id) })
      toast.success("Color swatch updated")
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update swatch")
    },
  })

  const remove = useMutation({
    mutationFn: (swatchId: string) =>
      sdk.client.fetch(`/admin/color-swatches/${swatchId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: swatchesQueryKey(productOption.id) })
      toast.success("Color swatch removed")
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove swatch")
    },
  })

  if (!isColorOption || !productOption?.values?.length) {
    return null
  }

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Color Swatches
        </Text>
      </div>
      <div className="px-6 pb-4">
        <div className="flex flex-col gap-y-3">
          {productOption.values.map((val) => {
            const swatch = swatchByValueId.get(val.id)
            return (
              <div key={val.id} className="flex items-center gap-x-3">
                <ColorSwatchPicker
                  value={swatch?.value ?? null}
                  disabled={isLoading}
                  isPending={upsert.isPending || remove.isPending}
                  onChange={(hex) => {
                    if (hex === null) {
                      if (swatch) {
                        remove.mutate(swatch.id)
                      }
                      return
                    }
                    upsert.mutate({ option_value_id: val.id, value: hex })
                  }}
                />
                <Text size="small" leading="compact" weight="plus">
                  {val.value}
                </Text>
              </div>
            )
          })}
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_option.details.after",
})

export default ColorSwatchesWidget
