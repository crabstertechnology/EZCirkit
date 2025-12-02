'use client';

import React from 'react';
import PolicyPage from '@/components/legal/policy-page';

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: [
      "By accessing and using the crabster website and purchasing our products, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services."
    ]
  },
  {
    title: "2. User Accounts",
    content: [
      "You are responsible for maintaining the confidentiality of your account information and password. You agree to accept responsibility for all activities that occur under your account."
    ]
  },
  {
    title: "3. Products and Orders",
    content: [
      "All orders are subject to product availability and confirmation of the order price. We reserve the right to refuse or cancel an order for any reason, including limitations on quantities available for purchase or errors in product or pricing information."
    ]
  },
  {
    title: "4. Intellectual Property",
    content: [
      "The content on this website, including text, graphics, logos, and software, is the property of crabster and is protected by copyright and other intellectual property laws."
    ]
  },
  {
    title: "5. Limitation of Liability",
    content: [
      "crabster shall not be liable for any indirect, incidental, or consequential damages resulting from the use of our products or services."
    ]
  },
];

export default function TermsAndConditionsPage() {
  return (
    <PolicyPage
      pageTitle="Terms and Conditions"
      lastUpdated="December 1, 2024"
      sections={sections}
    />
  );
}
