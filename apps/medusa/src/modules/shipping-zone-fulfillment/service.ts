import { AbstractFulfillmentProviderService, MedusaError } from "@medusajs/framework/utils"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceContext,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentOption,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"

type InjectedDependencies = {
  shippingZone: {
    resolveRate: (
      address: { province?: string | null; city?: string | null; area?: string | null },
      stockLocationId: string,
      fallbackRate: number
    ) => Promise<number>
  }
}

class ShippingZoneFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "shipping-zone-fulfillment"

  protected shippingZone_: InjectedDependencies["shippingZone"]

  constructor({ shippingZone }: InjectedDependencies) {
    super()
    this.shippingZone_ = shippingZone
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      {
        id: "shipping-zone-fulfillment",
      },
    ]
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: ValidateFulfillmentDataContext
  ): Promise<any> {
    return data
  }

  async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: CalculateShippingOptionPriceContext
  ): Promise<CalculatedShippingOptionPrice> {
    const stockLocationId = context.from_location?.id
    if (!stockLocationId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No stock location found in context. Ensure the shipping option is associated with a fulfillment set linked to a stock location."
      )
    }

    const address = context.shipping_address
    const rate = await this.shippingZone_.resolveRate(
      {
        province: address?.province ?? null,
        city: address?.city ?? null,
        // The zone tree's deepest level (e.g. "Inside Ringroad") maps to the
        // neighbourhood/area, which Medusa carries on the second address line.
        area: address?.address_2 ?? null,
      },
      stockLocationId,
      0
    )

    return {
      // Rates are stored as-is (major currency units), matching Medusa's pricing
      // convention — no minor-unit conversion.
      calculated_amount: rate,
      is_calculated_price_tax_inclusive: false,
    }
  }

  async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
    return true
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return true
  }

  async createFulfillment(): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }

  async cancelFulfillment(): Promise<any> {
    return {}
  }

  async createReturnFulfillment(): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }
}

export default ShippingZoneFulfillmentProviderService
