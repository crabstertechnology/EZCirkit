# EZCirkit E-Commerce Shipping Strategy & Guide

This guide explains how shipping rates are calculated, how to prevent rate discrepancies, and how other professional e-commerce stores handle shipping fees.

---

## 1. Why Did Shiprocket Charge ₹150 Instead of ₹68? (Volumetric Weight)
The discrepancy you noticed (charging ₹68/₹80 at checkout but seeing ₹150 in Shiprocket) happens because of **Volumetric Weight**.

Couriers charge based on the **chargeable weight**, which is the **greater** of:
1. **Dead Weight (Physical Weight)**: The actual weight on a scale (e.g., `0.5 kg`).
2. **Volumetric Weight (Dimensional Weight)**: The space the package occupies in the delivery truck, calculated as:
   $$\text{Volumetric Weight (kg)} = \frac{\text{Length (cm)} \times \text{Breadth (cm)} \times \text{Height (cm)}}{5000}$$

### The Math:
* For your standard shipping box size of **34 cm × 24 cm × 6 cm**:
  $$\frac{34 \times 24 \times 6}{5000} = \frac{4896}{5000} = 0.98\text{ kg}$$
* Because **0.98 kg** is rounded up to the **1 kg tier**, the courier bills you for 1 kg, not the physical 0.5 kg!
* Previously, the checkout page queried the serviceability API with only physical weight (`0.5 kg`) without dimensions. Hence, Shiprocket quoted the cheap 0.5 kg rate. But when booking the order, the system passed `34x24x6` cm, which immediately increased the price to the 1 kg rate!

### The Fix:
We updated the checkout code to pass **both physical weight and explicit package dimensions (`34 x 24 x 6` cm)** to the serviceability query. Now, the rate quoted at checkout matches the volumetric tier billed by Shiprocket.

---

## 2. Shipping Charge Strategies in E-Commerce
Most successful e-commerce stores do not charge dynamic courier quotes directly to customers. Here are the three main approaches:

### Strategy A: Flat Rate + Free Shipping Threshold (Recommended)
This is the standard industry approach (used by Amazon, Flipkart, etc.).
* **How it works**: Charge a fixed fee (e.g., ₹79) for shipping on all orders, but make shipping **FREE** once the cart total reaches a threshold (e.g., ₹999).
* **Why it works**: It is simple for customers to understand. It encourages customers to add more items to their cart to reach free shipping. The seller absorbs the shipping cost on larger, high-margin orders.

### Strategy B: Zone-Based Shipping (State/Region)
* **How it works**: Charge flat rates based on the customer's state or region:
  - **Local (Same State)**: ₹49
  - **Regional (Neighboring States)**: ₹69
  - **National (Rest of India)**: ₹99
* **Why it works**: Charges scale logically with distance without showing volatile, courier-specific numbers on the checkout page.

### Strategy C: Dynamic Shipping Rates + Safety Margin
* **How it works**: Fetch live rates directly from Shiprocket, add **18% GST** (since Shiprocket quotes exclude GST), and add a **safety margin** (e.g., 15%) and a small handling fee to cover packaging and RTO (Return to Origin) risks.
* **Why it works**: Ensures you never lose money on shipping, regardless of how remote the customer's location is.

---

## 3. Shipping Configuration
We have created a centralized configuration file at `src/config/shipping.ts`. You can change your active strategy and adjustment rules here.

```typescript
// path: src/config/shipping.ts
export const SHIPPING_CONFIG = {
  // Choose your strategy: 'FLAT' | 'DYNAMIC' | 'ZONE'
  strategy: 'FLAT', 

  // FLAT RATE SETTINGS
  flatRate: 79,               // Fee charged on orders below threshold
  freeShippingThreshold: 999,   // Free shipping on orders above this amount

  // DYNAMIC SHIPROCKET SETTINGS
  dynamic: {
    safetyMarginPercent: 15,    // Margin to cover volumetric/RTO discrepancy
    handlingFee: 10,            // Flat handling fee (packaging, labels)
    fallbackStdRate: 79,
    fallbackPremRate: 149,
  },

  // ZONE-BASED SETTINGS
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
      charge: 99
    }
  }
};
```

### To switch shipping strategies:
Simply open `src/config/shipping.ts` and update the `strategy` field. The checkout page will automatically update its logic and rates.
