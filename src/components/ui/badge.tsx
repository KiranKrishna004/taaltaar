import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:  'bg-zinc-800 text-zinc-300 border-zinc-700',
        amber:    'bg-amber-500/10 text-amber-300 border-amber-500/25',
        orange:   'bg-orange-500/15 text-orange-300 border-orange-500/25',
        green:    'bg-green-500/15 text-green-300 border-green-500/25',
        emerald:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
        red:      'bg-red-500/15 text-red-400 border-red-500/25',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
