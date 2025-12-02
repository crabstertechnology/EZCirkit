
'use client';

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/shared/logo';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Instagram, Linkedin } from 'lucide-react';
import { FOOTER_LINKS } from '@/lib/constants';
import ClientOnly from '../shared/client-only';

const SocialIcon = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="h-10 w-10 rounded-full bg-gray-700/50 flex items-center justify-center text-gray-400 transition-all hover:bg-primary-gradient hover:text-white"
  >
    {children}
  </a>
);

const Footer = () => {
  return (
    <footer className="bg-[#1a1a1a] text-gray-300">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: About */}
          <div className="space-y-4">
            <Logo isFooter={true} />
            <p className="text-sm text-gray-400">
              Making electronics learning accessible and fun for everyone.
            </p>
            <div className="flex space-x-3 pt-2">
              <SocialIcon href="#">
                <Instagram className="h-5 w-5" />
              </SocialIcon>
              <SocialIcon href="#">
                <Linkedin className="h-5 w-5" />
              </SocialIcon>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-gradient bg-primary-gradient mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h3 className="text-lg font-semibold text-gradient bg-primary-gradient mb-4">
              Support
            </h3>
            <ul className="space-y-2">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gradient bg-primary-gradient mb-4">
              Contact Us
            </h3>
            <address className="text-sm not-italic space-y-2 text-gray-400">
              <p>Veerapandi, Coimbatore, Tamil Nadu - 641019, India</p>
              <p>Email: crabstertech@gmail.com</p>
              <p>Phone: +91 7010396642</p>
            </address>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 md:px-6 py-4 text-center text-sm text-gray-500">
          <ClientOnly>
            © {new Date().getFullYear()} crabster. All Rights Reserved.
          </ClientOnly>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
