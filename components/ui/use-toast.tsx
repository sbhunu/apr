'use client'

export interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function toast(options: ToastOptions) {
  if (typeof window === 'undefined') {
    console[options.variant === 'destructive' ? 'error' : 'log'](
      `${options.title}\n${options.description ?? ''}`
    )
    return
  }

  window.alert(`${options.title}\n${options.description ?? ''}`)
}
