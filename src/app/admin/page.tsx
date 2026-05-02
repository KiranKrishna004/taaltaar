import SubmissionsReview from '@/components/SubmissionsReview'

export default function AdminPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Admin</h1>
        <p className="text-sm text-zinc-500 mt-1">Review and approve user-submitted songs</p>
      </div>
      <SubmissionsReview />
    </div>
  )
}
