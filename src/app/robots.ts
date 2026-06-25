import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://ezcirkit.crabster.in';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/profile/',
        '/api/',
        '/checkout/',
        '/order-confirmation/',
        '/forgot-password/',
        '/await-verification/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
