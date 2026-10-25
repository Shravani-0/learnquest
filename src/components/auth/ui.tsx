'use client'

import { useFormStatus } from 'react-dom'
import Field from '@/components/home/Field'

/**
 * Shared presentational pieces for the auth forms (sign-in, sign-up, forgot,
 * reset). Extracted so the four forms don't duplicate the console shell, field
 * markup, submit button, or message boxes.
 */

export const inputClass = 'sq-input'

export function AuthField({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="sq-field-l">
      <span>{label.toLowerCase()}</span>
      <input className={inputClass} {...props} />
    </label>
  )
}

/** Submit button that reflects the enclosing form's pending state. */
export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="sq-btn">
      <span className="sq-btn__fill" aria-hidden="true" />
      {pending ? 'working…' : label}
      {!pending && <span className="sq-arrow" aria-hidden="true">→</span>}
    </button>
  )
}

export function FormError({ children }: { children: React.ReactNode }) {
  return <p className="sq-msg sq-msg--err" role="alert">{children}</p>
}

export function FormMessage({ children }: { children: React.ReactNode }) {
  return <p className="sq-msg sq-msg--ok" role="status">{children}</p>
}

/** Centered console window used by every auth screen. */
export function AuthShell({
  title,
  subtitle,
  command = 'login',
  children,
  footer,
}: {
  title: string
  subtitle?: string
  /** The command shown in the window bar, e.g. `login`, `passwd`. */
  command?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="sq">
      <Field />
      <div className="sq-auth">
        <div className="sq-auth__box">
          <div className="sq-auth__head">
            <p className="sq-kicker">auth · {command}</p>
            <h1 className="sq-display sq-auth__title">{title}</h1>
            {subtitle && <p className="sq-auth__sub">{subtitle}</p>}
          </div>

          <div className="sq-term">
            <div className="sq-term__bar">
              <span className="sq-term__dots" aria-hidden="true"><i /><i /><i /></span>
              <span className="sq-term__name">guest@unrust: ~</span>
              <span className="sq-term__name sq-term__name--r">{command}</span>
            </div>
            <div className="sq-term__body">{children}</div>
          </div>

          {footer && <p className="sq-auth__foot">{footer}</p>}
        </div>
      </div>
    </div>
  )
}
