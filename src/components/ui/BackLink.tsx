'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'

// A back control that actually goes back. If there is in-app history it returns
// to the page you came from; otherwise (opened straight from the Home Screen or
// a notification) it falls back to `href`, so you never land somewhere random.
export function BackLink({ href, onClick, ...rest }: ComponentProps<typeof Link>) {
  const router = useRouter()
  return (
    <Link
      href={href}
      onClick={e => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (typeof window !== 'undefined' && window.history.length > 1) {
          e.preventDefault()
          router.back()
        }
      }}
      {...rest}
    />
  )
}
