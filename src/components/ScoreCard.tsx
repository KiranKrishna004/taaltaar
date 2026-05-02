'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  score: number
  notesHit: number
  totalNotes: number
  onClose: () => void
  onUpload?: () => void
}

function getStars(score: number) {
  if (score >= 90) return { stars: '⭐⭐⭐⭐', label: 'Perfect!',    color: 'text-yellow-400' }
  if (score >= 75) return { stars: '⭐⭐⭐',   label: 'Great!',      color: 'text-amber-400'  }
  if (score >= 50) return { stars: '⭐⭐',     label: 'Good!',       color: 'text-orange-400' }
  return                  { stars: '⭐',       label: 'Keep going!', color: 'text-zinc-400'   }
}

function scoreGradient(score: number) {
  if (score >= 90) return 'from-yellow-500/20 via-amber-500/10 to-transparent'
  if (score >= 75) return 'from-amber-500/15 via-orange-500/8 to-transparent'
  if (score >= 50) return 'from-orange-500/12 to-transparent'
  return 'from-zinc-700/20 to-transparent'
}

export default function ScoreCard({ score, notesHit, totalNotes, onClose, onUpload }: Props) {
  const { stars, label, color } = getStars(score)
  const missed = totalNotes - notesHit

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="relative bg-zinc-900 border border-zinc-700/60 rounded-3xl p-8 max-w-sm w-full text-center overflow-hidden shadow-2xl shadow-black/50"
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-b ${scoreGradient(score)} pointer-events-none`} />

        <div className="relative">
          {/* Stars */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', damping: 12 }}
            className="text-4xl mb-3"
          >
            {stars}
          </motion.div>

          {/* Label */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`text-sm font-medium mb-1 ${color}`}
          >
            {label}
          </motion.p>

          {/* Score number */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-6"
          >
            <span className="text-6xl font-extrabold text-white tracking-tight">{score}</span>
            <span className="text-2xl text-zinc-400 font-bold">%</span>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex justify-center gap-6 mb-6"
          >
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-400">{notesHit}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Hit</div>
            </div>
            <div className="w-px bg-zinc-800" />
            <div className="text-center">
              <div className="text-xl font-bold text-red-400">{missed}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Missed</div>
            </div>
            <div className="w-px bg-zinc-800" />
            <div className="text-center">
              <div className="text-xl font-bold text-zinc-300">{totalNotes}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Total</div>
            </div>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-zinc-800 rounded-full h-2 mb-7 overflow-hidden"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400"
            />
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex gap-3"
          >
            <button
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium transition-colors"
            >
              Try Again
            </button>
            {onUpload && (
              <button
                onClick={onUpload}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl py-3 text-sm transition-colors shadow-lg shadow-amber-500/20"
              >
                Share Score
              </button>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
