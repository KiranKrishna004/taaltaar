import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-600',
        'focus:border-amber-500/50 focus:bg-zinc-900 focus:shadow-lg focus:shadow-amber-500/5 focus:outline-none',
        'transition-all',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
