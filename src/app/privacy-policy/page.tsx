'use client';

import React from 'react';
import PolicyPage from '@/components/legal/policy-page';

const sections = [
    {
      title: "1. Information We Collect",
      content: [
        "We collect information you provide directly to us when you create an account, place an order, or communicate with us. This includes your name, email address, shipping address, and phone number.",
        "We also collect technical information automatically, such as your IP address, browser type, and how you interact with our website."
      ]
    },
    {
      title: "2. How We Use Your Information",
      content: [
        "To process and fulfill your orders, including managing payments and shipping.",
        "To communicate with you about your orders and our services.",
        "To improve and personalize your experience on our website.",
        "For security purposes and to prevent fraud."
      ]
    },
    {
      title: "3. Information Sharing",
      content: [
        "We do not sell your personal information. We may share your information with third-party service providers for functions like payment processing (Razorpay) and shipping, only as necessary to provide our services.",
        "We may also share information if required by law."
      ]
    },
    {
      title: "4. Your Rights",
      content: [
        "You have the right to access, update, or delete your personal information through your account profile page or by contacting us."
      ]
    },
    {
      title: "5. Security",
      content: [
        "We use Firestore Security Rules and other standard measures to protect your information. However, no method of transmission over the internet is 100% secure."
      ]
    },
];

export default function PrivacyPolicy() {
  return (
    <PolicyPage
      pageTitle="Privacy Policy"
      lastUpdated="December 1, 2024"
      sections={sections}
    />
  );
}
