import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ezcirkit.crabster.in';

  const routes = [
    '',
    '/products',
    '/projects',
    '/ide',
    '/contact-us',
    '/privacy-policy',
    '/terms-and-conditions',
    '/shipping-and-delivery',
    '/cancellation-and-refund',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === '' || route === '/products' ? 'daily' as const : 'weekly' as const,
    priority: route === '' ? 1.0 : route === '/products' || route === '/ide' ? 0.8 : 0.5,
  }));
}
