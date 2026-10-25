import type { MetadataRoute } from 'next'
import { adventures } from '@/lib/data/adventures'

const base = 'https://unrust.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const core = ['/', '/adventures'].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.8,
  }))
  const worlds = adventures.map((a) => ({
    url: `${base}/adventures/${a.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))
  return [...core, ...worlds]
}
