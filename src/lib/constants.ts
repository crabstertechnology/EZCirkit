
import { placeholderImages } from './placeholder-images';
import { LayoutDashboard, ShoppingBag, Users, Settings, Home, Package, Mail, BookOpen } from 'lucide-react';

export const SHIPPING_COST = 0;

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#features', label: 'Features' },
  { href: '/#products', label: 'Products' },
  { href: '/tutorials', label: 'Tutorials'},
  { href: '/#testimonials', label: 'Reviews' },
];

export const ADMIN_NAV_LINKS = [
  { href: '/', label: 'Go to Home', icon: Home },
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/messages', label: 'Messages', icon: Mail },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export const STATS = [
  { value: '10,000+', label: 'Happy Customers' },
  { value: '50+', label: 'Components' },
  { value: '20+', label: 'Projects' },
  { value: '4.8★', label: 'Rating' },
];

export const PRODUCT_FEATURES = [
  '50+ Electronic Components',
  'Arduino Compatible Board',
  '20+ Step-by-Step Projects',
  'High-Quality Breadboard',
  'Durable Storage Box',
  'Online Video Tutorials',
];

export const FOOTER_LINKS = {
  about: [
    { href: '/about', label: 'Our Story' },
    { href: '/blog', label: 'Blog' },
    { href: '/careers', label: 'Careers' },
  ],
  quickLinks: [
    { href: '/', label: 'Home' },
    { href: '/#products', label: 'Products' },
    { href: '/cart', label: 'Cart' },
  ],
  support: [
    { href: '/privacy-policy', label: 'Privacy Policy' },
    { href: '/terms-and-conditions', label: 'Terms & Conditions' },
    { href: '/shipping-and-delivery', label: 'Shipping & Delivery' },
    { href: '/cancellation-and-refund', label: 'Cancellation & Refund' },
    { href: '/contact-us', label: 'Contact Us' },
  ],
};
