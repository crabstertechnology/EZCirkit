'use client';

import React from 'react';
import PolicyPage from '@/components/legal/policy-page';

const sections = [
  {
    title: "1. Shipping Policy",
    content: [
      "We currently offer shipping across India. All orders are processed and dispatched from our warehouse in Coimbatore within 1-2 business days.",
      "We offer free shipping on all orders."
    ]
  },
  {
    title: "2. Delivery Time",
    content: [
      "Standard delivery typically takes 3-7 business days, depending on your location.",
      "Metro cities: 3-5 business days.",
      "Other cities: 5-7 business days.",
      "You will receive a tracking link via email once your order has been shipped."
    ]
  },
  {
    title: "3. Order Tracking",
    content: [
      "Once your order is dispatched, we will send you an email with the tracking information. You can use this to track your package's journey to your doorstep."
    ]
  },
  {
    title: "4. Unforeseen Delays",
    content: [
      "While we strive to deliver your order on time, delivery may be delayed due to unforeseen circumstances such as weather conditions, logistical issues, or public holidays. We appreciate your patience in these situations."
    ]
  },
];

export default function ShippingAndDeliveryPage() {
  return (
    <PolicyPage
      pageTitle="Shipping & Delivery Policy"
      lastUpdated="December 1, 2024"
      sections={sections}
    />
  );
}
