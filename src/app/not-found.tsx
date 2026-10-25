import Link from 'next/link'
import type { Metadata } from 'next'
import Field from '@/components/home/Field'

export const metadata: Metadata = {
  title: '404 — command not found',
}

export default function NotFound() {
  return (
    <div className="sq sq-404">
      <Field />
      <div className="sq-shell sq-404__in">
        <div className="sq-term sq-404__term">
          <div className="sq-term__bar">
            <span className="sq-term__dots" aria-hidden="true"><i /><i /><i /></span>
            <span className="sq-term__name">guest@unrust: ~</span>
            <span className="sq-term__name sq-term__name--r">bash</span>
          </div>
          <div className="sq-term__body">
            <ul className="sq-term__log">
              <li className="sq-term__line sq-term__line--cmd">
                <span className="sq-term__ps1" aria-hidden="true">$</span>
                <span>open ./the-page-you-wanted</span>
              </li>
              <li className="sq-term__line sq-term__line--err">
                bash: no such file or directory
              </li>
            </ul>
          </div>
        </div>

        <h1 className="sq-display sq-404__code">404</h1>
        <p className="sq-404__msg">
          That route isn&rsquo;t mounted on this system. The page moved, never existed, or you broke
          the timeline. Head back to a world that&rsquo;s online.
        </p>
        <div className="sq-404__cta">
          <Link href="/" className="sq-btn">
            <span className="sq-btn__fill" aria-hidden="true" />
            cd ~ (home)
            <span className="sq-arrow" aria-hidden="true">→</span>
          </Link>
          <Link href="/adventures" className="sq-btn sq-btn--ghost">
            <span className="sq-btn__fill" aria-hidden="true" />
            ls worlds
          </Link>
        </div>
      </div>
    </div>
  )
}
