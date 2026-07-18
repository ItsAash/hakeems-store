import { z } from "zod"
import { MiddlewareRoute, validateAndTransformBody } from "@medusajs/framework"

export const CreateShippingZoneSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  parent_id: z.string().nullable().optional(),
  stock_location_id: z.string().nullable().optional(),
  rate: z.number().nonnegative().nullable().optional(),
  enabled: z.boolean().optional(),
})

export const UpdateShippingZoneSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  rate: z.number().nonnegative().nullable().optional(),
  enabled: z.boolean().optional(),
})

export type CreateShippingZoneSchema = z.infer<typeof CreateShippingZoneSchema>
export type UpdateShippingZoneSchema = z.infer<typeof UpdateShippingZoneSchema>

export const adminShippingZoneMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/shipping-zones",
    method: "POST",
    middlewares: [validateAndTransformBody(CreateShippingZoneSchema)],
  },
  {
    matcher: "/admin/shipping-zones/:id",
    method: "POST",
    middlewares: [validateAndTransformBody(UpdateShippingZoneSchema)],
  },
]
