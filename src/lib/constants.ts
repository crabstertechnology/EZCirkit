import { placeholderImages } from './placeholder-images';
import { LayoutDashboard, ShoppingBag, Users, Settings, Home, Package, Mail, BookOpen, Star, Video, ScanLine, Activity, Receipt, History, Layers } from 'lucide-react';

export const SHIPPING_COST = 0;

export const NAV_LINKS = [
  { href: '/products', label: 'Products' },
  { href: '/ide', label: 'Launch IDE' },
];

export const ADMIN_NAV_LINKS = [
  { href: '/', label: 'Go to Home', icon: Home },
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/billing', label: 'Billing / POS', icon: Receipt },
  { href: '/admin/sales-history', label: 'Sales History', icon: History },
  { href: '/admin/audit-ledger', label: 'Audit Ledger', icon: Layers },
  { href: '/admin/telemetry', label: 'Telemetry Logs', icon: Activity },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/messages', label: 'Messages', icon: Mail },
  { href: '/admin/testimonials', label: 'Testimonials', icon: Video },
  { href: '/admin/offline-kits', label: 'Offline Kit Manager', icon: ScanLine },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export const STATS = [
  { value: '50+', label: 'Experiments' },
  { value: '20+', label: 'Components' },
  { value: '36+', label: 'Projects' },
  { value: '4.8★', label: 'Rating' },
];

export const PRODUCT_FEATURES = [
  '20+ Electronic Components',
  'Arduino Compatible Board',
  '36+ Step-by-Step Projects',
  'High-Quality Breadboard',
  'Durable Storage Box',
  'Online Video Tutorials',
];

export const FOOTER_LINKS = {
  categories: [
    { href: '/products?category=Sensors', label: 'Sensors' },
    { href: '/products?category=Arduino+Boards', label: 'Arduino Boards' },
    { href: '/products?category=Development+Boards', label: 'Development Boards' },
    { href: '/products?category=Displays', label: 'Displays' },
    { href: '/products?category=Power+Modules', label: 'Power Modules' },
  ],
  quickLinks: [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'All Products' },
    { href: '/ide', label: 'Launch IDE' },
  ],
  support: [
    { href: '/privacy-policy', label: 'Privacy Policy' },
    { href: '/terms-and-conditions', label: 'Terms & Conditions' },
    { href: '/shipping-and-delivery', label: 'Shipping & Delivery' },
    { href: '/cancellation-and-refund', label: 'Cancellation & Refund' },
    { href: '/contact-us', label: 'Contact Us' },
  ],
};
