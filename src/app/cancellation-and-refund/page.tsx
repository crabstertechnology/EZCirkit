'use client';

import React from 'react';
import PolicyPage from '@/components/legal/policy-page';

const sections = [
  {
    title: "1. Order Cancellation",
    content: [
      "You may cancel your order within 24 hours of placing it, provided it has not yet been shipped. To cancel an order, please contact our support team immediately with your order ID.",
      "Once an order has been shipped, it cannot be cancelled."
    ]
  },
  {
    title: "2. Refund Policy",
    content: [
      "We offer a 15-day refund policy for products that are returned in their original, unopened condition. The 15-day period begins on the date of delivery.",
      "To initiate a return, please contact us with your order details. You will be responsible for the return shipping costs.",
      "Once we receive and inspect the returned item, we will process your refund. The refund will be credited to your original method of payment within 7-10 business days."
    ]
  },
  {
    title: "3. Damaged or Defective Items",
    content: [
      "If you receive a damaged or defective item, please contact us within 48 hours of delivery with photos of the issue. We will arrange for a replacement or a full refund at no additional cost to you."
    ]
  },
];

export default function CancellationAndRefundPage() {
  return (
    <PolicyPage
      pageTitle="Cancellation & Refund Policy"
      lastUpdated="December 1, 2024"
      sections={sections}
    />
  );
}
