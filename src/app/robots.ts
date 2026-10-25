import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/reset-password'] },
    sitemap: 'https://unrust.app/sitemap.xml',
  }
}
