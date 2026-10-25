import Field from '@/components/home/Field'
import HeroConsole from '@/components/home/HeroConsole'
import WorldsIndex from '@/components/home/WorldsIndex'
import Pipeline from '@/components/home/Pipeline'
import StatsReadout from '@/components/home/StatsReadout'
import LeaderboardReadout from '@/components/home/LeaderboardReadout'
import HomeStage from '@/components/home/HomeStage'
import { getUser, getProfile } from '@/lib/db/queries'
import { clearanceForXp } from '@/lib/xp'

export default async function HomePage() {
  // The console's `whoami` reflects the real session: a signed-in operator sees their clearance.
  const user = await getUser()
  const profile = user ? await getProfile(user.id) : null
  const session = profile
    ? (() => {
        const c = clearanceForXp(profile.xp)
        return {
          handle: profile.username || profile.display_name || 'user',
          clearance: c.current.title,
          xp: profile.xp,
          nextClearance: c.next?.title ?? null,
          xpToNext: c.xpToNext,
        }
      })()
    : null

  return (
    <div className="sq">
      {/* ambient industrial-lab field (grid drift + hazard scan beams + pulsing nodes) */}
      <Field />

      {/* boot loader (covers first paint; hidden without JS or once shown). The inline script below
          mutates these nodes before hydration, so they opt out of hydration reconciliation. */}
      <div id="loader" role="status" aria-label="Loading unrust" suppressHydrationWarning>
        <span className="sq-loader__line"><b>[ ok ]</b> mounting filesystem</span>
        <span className="sq-loader__line"><b>[ ok ]</b> linking 6 worlds</span>
        <span className="sq-loader__line"><b>[ ok ]</b> opening console</span>
        <span className="sq-loader__count" data-loader-count suppressHydrationWarning>000</span>
        <span className="sq-loader__bar" data-loader-bar><i suppressHydrationWarning /></span>
      </div>
      {/* Vanilla boot sequence: runs on parse (before hydration) so it never gates first paint. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var d=document,h=d.documentElement,l=d.getElementById('loader');if(!l){h.classList.add('is-loaded');return;}var c=l.querySelector('[data-loader-count]'),b=l.querySelector('[data-loader-bar] > i');function done(){if(h.classList.contains('is-loaded'))return;h.classList.add('is-loaded');l.classList.add('is-out');setTimeout(function(){l.hidden=true;},520);try{window.dispatchEvent(new Event('sq:loaded'));}catch(e){}}if(matchMedia('(prefers-reduced-motion: reduce)').matches){done();return;}var s=performance.now(),DUR=1000;function tick(now){var p=Math.min(1,(now-s)/DUR),v=Math.round(p*100);if(c)c.textContent=('00'+v).slice(-3);if(b)b.style.transform='scaleX('+(v/100)+')';if(p<1){requestAnimationFrame(tick);}else{done();}}requestAnimationFrame(tick);setTimeout(done,1800);})();`,
        }}
      />

      {/* bottom corners of the HUD frame (the Navbar is the top of the frame) */}
      <div className="sq-hud" aria-hidden="true">
        <span className="bl"><span className="sq-dot">●</span> v1.0 <span data-depth>depth 000%</span></span>
        <span className="br">↓ scroll to boot</span>
      </div>

      <HeroConsole session={session} />
      <WorldsIndex />
      <Pipeline />
      <StatsReadout />
      <LeaderboardReadout />

      <HomeStage />
    </div>
  )
}
