import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://shop.crabstertech.in';

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/products/',
        '/components/',
        '/tutorials/',
        '/projects/',
        '/ide/',
        '/contact-us/',
        '/privacy-policy/',
        '/terms-and-conditions/',
        '/shipping-and-delivery/',
        '/cancellation-and-refund/',
      ],
      disallow: [
        '/admin/',
        '/profile/',
        '/api/',
        '/cart/',
        '/checkout/',
        '/wishlist/',
        '/order-confirmation/',
        '/login/',
        '/signup/',
        '/forgot-password/',
        '/await-verification/',
        '/*?*search=',
        '/*?*utm_',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
