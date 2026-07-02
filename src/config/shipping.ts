/**
 * Shipping Configuration for EZCirkit
 * Use this file to define your shipping charges strategy.
 */
export const SHIPPING_CONFIG = {
  // Strategy: 'FLAT' | 'DYNAMIC' | 'ZONE'
  // - 'FLAT': Flat shipping rate below threshold, free above threshold.
  // - 'DYNAMIC': Real-time quotes from Shiprocket + custom safety margin.
  // - 'ZONE': Fixed charges based on Indian states / regions.
  strategy: 'FLAT' as 'FLAT' | 'DYNAMIC' | 'ZONE',

  // FLAT RATE SETTINGS
  flatRate: 79,             // Default shipping fee (₹)
  freeShippingThreshold: 999, // Free shipping on orders above this amount (₹)

  // DYNAMIC SHIPROCKET SETTINGS
  dynamic: {
    safetyMarginPercent: 15,  // Add 15% markup to cover weight/RTO/packing discrepancy
    handlingFee: 10,          // Add flat ₹10 handling fee
    fallbackStdRate: 79,      // Standard fallback if API fails
    fallbackPremRate: 149,    // Premium fallback if API fails
  },

  // ZONE-BASED SETTINGS (Fallback / custom zone configuration)
  zones: {
    local: {
      states: ['Tamil Nadu'],
      charge: 49
    },
    regional: {
      states: ['Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Puducherry'],
      charge: 69
    },
    national: {
      charge: 99 // Rest of India
    }
  }
};

/**
 * Calculates shipping charge based on configuration, cart subtotal, and state
 */
export function calculateShippingCharge(subtotal: number, baseRate?: number, state?: string): number {
  // If subtotal qualifies for free shipping
  if (subtotal >= SHIPPING_CONFIG.freeShippingThreshold) {
    return 0;
  }

  switch (SHIPPING_CONFIG.strategy) {
    case 'DYNAMIC':
      if (baseRate !== undefined) {
        // Multiply by 1.18 for GST, then apply safety margin and handling fee
        const rateWithGst = baseRate * 1.18;
        const withMargin = rateWithGst * (1 + SHIPPING_CONFIG.dynamic.safetyMarginPercent / 100);
        return Math.ceil(withMargin + SHIPPING_CONFIG.dynamic.handlingFee);
      }
      return SHIPPING_CONFIG.flatRate;

    case 'ZONE':
      if (state) {
        const normalizedState = state.trim().toLowerCase();
        if (SHIPPING_CONFIG.zones.local.states.some(s => s.toLowerCase() === normalizedState)) {
          return SHIPPING_CONFIG.zones.local.charge;
        }
        if (SHIPPING_CONFIG.zones.regional.states.some(s => s.toLowerCase() === normalizedState)) {
          return SHIPPING_CONFIG.zones.regional.charge;
        }
      }
      return SHIPPING_CONFIG.zones.national.charge;

    case 'FLAT':
    default:
      return SHIPPING_CONFIG.flatRate;
  }
}
