'use client'

import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/components/ui/Toast'
import GlassCard from '@/components/ui/GlassCard'
import Badge from '@/components/ui/Badge'

interface ApiKey {
  id: string
  name: string
  tier: string
  keyPrefix: string
  rateLimitPerMinute: number
  rateLimitPerMonth: number
  isActive: boolean
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

interface Props {
  keys: ApiKey[]
  loading: boolean
  onRefresh: () => void
}

export default function KeysTab({ keys, loading, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [showConfirm, setShowConfirm] = useState<{ action: 'rotate' | 'revoke'; key: ApiKey } | null>(null)
  const [showRename, setShowRename] = useState<ApiKey | null>(null)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  if (loading) {
    return (
      <GlassCard className="p-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 py-4 border-b border-outline-variant/30 last:border-0">
            <div className="h-5 w-32 bg-surface-container-high rounded animate-pulse" />
            <div className="h-5 w-24 bg-surface-container-high rounded animate-pulse" />
            <div className="h-5 w-20 bg-surface-container-high rounded animate-pulse" />
          </div>
        ))}
      </GlassCard>
    )
  }

  if (keys.length === 0) {
    return (
      <>
        <GlassCard className="p-12 text-center">
          <p className="text-4xl mb-4">🔑</p>
          <h3 className="font-headline text-lg font-bold uppercase text-on-surface mb-2">No API keys yet</h3>
          <p className="font-body text-sm text-on-surface-variant mb-6 max-w-sm mx-auto">
            Create your first key to start using the WorldCapIQ API.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + Create API Key
          </button>
        </GlassCard>
        {showCreate && (
          <CreateKeyModal onClose={() => setShowCreate(false)} onCreated={(raw) => { setCreatedKey(raw); setShowCreate(false); onRefresh() }} />
        )}
        {createdKey && (
          <KeyRevealModal rawKey={createdKey} onClose={() => setCreatedKey(null)} />
        )}
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-on-surface">API Keys</h2>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          + Create New Key
        </button>
      </div>

      {/* Desktop Table */}
      <GlassCard className="hidden md:block overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Name</th>
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Key Prefix</th>
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Created</th>
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Last Used</th>
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr
                key={k.id}
                className={`border-b border-outline-variant/30 hover:bg-white/[0.02] transition-colors ${k.revokedAt ? 'opacity-50' : ''}`}
              >
                <td className="px-5 py-3 font-body text-sm font-medium text-on-surface">{k.name}</td>
                <td className="px-5 py-3 font-mono text-sm text-on-surface-variant">{k.keyPrefix}...</td>
                <td className="px-5 py-3 font-body text-sm text-on-surface-variant">{formatDate(k.createdAt)}</td>
                <td className="px-5 py-3 font-body text-sm text-on-surface-variant">{k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never'}</td>
                <td className="px-5 py-3">
                  <Badge variant={k.isActive ? 'primary' : 'secondary'} size="sm">
                    {k.isActive ? 'Active' : 'Revoked'}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right relative">
                  {k.isActive && (
                    <div className="relative inline-block">
                      <button
                        onClick={() => setMenuOpen(menuOpen === k.id ? null : k.id)}
                        className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors text-on-surface-variant"
                        aria-label="Key actions"
                      >
                        ···
                      </button>
                      {menuOpen === k.id && (
                        <ActionMenu
                          onRename={() => { setMenuOpen(null); setShowRename(k) }}
                          onRotate={() => { setMenuOpen(null); setShowConfirm({ action: 'rotate', key: k }) }}
                          onRevoke={() => { setMenuOpen(null); setShowConfirm({ action: 'revoke', key: k }) }}
                          onClose={() => setMenuOpen(null)}
                        />
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {keys.map((k) => (
          <GlassCard key={k.id} className={`p-4 ${k.revokedAt ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between mb-1">
              <span className="font-body text-sm font-medium text-on-surface">{k.name}</span>
              <Badge variant={k.isActive ? 'primary' : 'secondary'} size="sm">
                {k.isActive ? 'Active' : 'Revoked'}
              </Badge>
            </div>
            <p className="font-mono text-sm text-on-surface-variant mb-2">{k.keyPrefix}...</p>
            <div className="flex items-center justify-between">
              <span className="font-body text-xs text-on-surface-variant">Created {formatDate(k.createdAt)}</span>
              {k.isActive && (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === k.id ? null : k.id)}
                    className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors text-on-surface-variant text-sm"
                    aria-label="Key actions"
                  >
                    ···
                  </button>
                  {menuOpen === k.id && (
                    <ActionMenu
                      onRename={() => { setMenuOpen(null); setShowRename(k) }}
                      onRotate={() => { setMenuOpen(null); setShowConfirm({ action: 'rotate', key: k }) }}
                      onRevoke={() => { setMenuOpen(null); setShowConfirm({ action: 'revoke', key: k }) }}
                      onClose={() => setMenuOpen(null)}
                    />
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      <p className="mt-4 font-body text-xs text-on-surface-variant">
        ⚠️ Revoked keys cannot be reactivated. Create a new key instead.
      </p>

      {showCreate && (
        <CreateKeyModal onClose={() => setShowCreate(false)} onCreated={(raw) => { setCreatedKey(raw); setShowCreate(false); onRefresh() }} />
      )}
      {createdKey && (
        <KeyRevealModal rawKey={createdKey} onClose={() => setCreatedKey(null)} />
      )}
      {showConfirm && (
        <ConfirmModal
          action={showConfirm.action}
          keyName={showConfirm.key.name}
          keyId={showConfirm.key.id}
          onClose={() => setShowConfirm(null)}
          onDone={(raw) => {
            setShowConfirm(null)
            if (raw) setCreatedKey(raw)
            onRefresh()
          }}
        />
      )}
      {showRename && (
        <RenameModal
          keyId={showRename.id}
          currentName={showRename.name}
          onClose={() => setShowRename(null)}
          onDone={() => { setShowRename(null); onRefresh() }}
        />
      )}
    </>
  )
}

function ActionMenu({
  onRename,
  onRotate,
  onRevoke,
  onClose,
}: {
  onRename: () => void
  onRotate: () => void
  onRevoke: () => void
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-50 glass-panel rounded-xl p-1 min-w-[160px] shadow-lg border border-white/[0.08]">
        <button onClick={onRename} className="w-full text-left px-3 py-2 text-sm font-body rounded-lg hover:bg-white/[0.06] transition-colors flex items-center gap-2">
          ✏️ Rename
        </button>
        <button onClick={onRotate} className="w-full text-left px-3 py-2 text-sm font-body rounded-lg hover:bg-white/[0.06] transition-colors flex items-center gap-2">
          🔄 Rotate
        </button>
        <div className="h-px bg-outline-variant/50 my-1" />
        <button onClick={onRevoke} className="w-full text-left px-3 py-2 text-sm font-body rounded-lg hover:bg-secondary/10 transition-colors flex items-center gap-2 text-secondary">
          🗑️ Revoke
        </button>
      </div>
    </>
  )
}

function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (rawKey: string) => void }) {
  const { apiFetch } = useApi()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const data = await apiFetch('/api/dashboard/keys', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      })
      toast('API key created', 'success')
      onCreated(data.key)
    } catch {
      toast('Failed to create key', 'destructive')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface mb-6">Create API Key</h3>
      <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
        Key Name
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Production, Staging..."
        className="input-field mb-6"
        maxLength={64}
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
      />
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleCreate} disabled={!name.trim() || submitting} className="btn-primary">
          {submitting ? 'Creating...' : 'Create Key'}
        </button>
      </div>
    </Modal>
  )
}

function KeyRevealModal({ rawKey, onClose }: { rawKey: string; onClose: () => void }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  async function copyKey() {
    await navigator.clipboard.writeText(rawKey)
    setCopied(true)
    toast('Copied to clipboard', 'info')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-primary mb-4">✅ Key Created</h3>
      <div className="bg-tertiary/10 border border-tertiary/30 rounded-xl p-3 mb-4">
        <p className="font-body text-sm text-tertiary">⚠️ Copy this key now. It won&apos;t be shown again.</p>
      </div>
      <div className="relative bg-surface-container-lowest rounded-xl p-4 border border-outline-variant mb-6">
        <p className="font-mono text-sm text-on-surface break-all pr-10">{rawKey}</p>
        <button
          onClick={copyKey}
          className="absolute top-3 right-3 p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
          aria-label="Copy key"
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
      <div className="flex justify-end">
        <button onClick={onClose} className="btn-primary">Done</button>
      </div>
    </Modal>
  )
}

function ConfirmModal({
  action,
  keyName,
  keyId,
  onClose,
  onDone,
}: {
  action: 'rotate' | 'revoke'
  keyName: string
  keyId: string
  onClose: () => void
  onDone: (rawKey?: string) => void
}) {
  const { apiFetch } = useApi()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const isRevoke = action === 'revoke'

  async function handleConfirm() {
    setSubmitting(true)
    try {
      const data = await apiFetch(`/api/dashboard/keys/${keyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })
      if (action === 'rotate') {
        toast('Key rotated. Grace period: 24h', 'warning')
        onDone(data.key)
      } else {
        toast('API key revoked', 'destructive')
        onDone()
      }
    } catch {
      toast(`Failed to ${action} key`, 'destructive')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className={`font-headline text-xl font-bold uppercase tracking-tight mb-4 ${isRevoke ? 'text-secondary' : 'text-on-surface'}`}>
        {isRevoke ? 'Revoke API Key' : 'Rotate API Key'}
      </h3>
      <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6">
        {isRevoke
          ? `This will permanently deactivate "${keyName}". This action cannot be undone.`
          : `This will generate a new key and invalidate "${keyName}" after a 24h grace period. During the grace period, both keys will work.`}
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className={isRevoke ? 'btn-destructive' : 'btn-primary'}
        >
          {submitting ? 'Processing...' : isRevoke ? 'Revoke Key' : 'Rotate Key'}
        </button>
      </div>
    </Modal>
  )
}

function RenameModal({
  keyId,
  currentName,
  onClose,
  onDone,
}: {
  keyId: string
  currentName: string
  onClose: () => void
  onDone: () => void
}) {
  const { apiFetch } = useApi()
  const { toast } = useToast()
  const [name, setName] = useState(currentName)
  const [submitting, setSubmitting] = useState(false)

  async function handleRename() {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await apiFetch(`/api/dashboard/keys/${keyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'rename', name: name.trim() }),
      })
      toast('Key renamed', 'success')
      onDone()
    } catch {
      toast('Failed to rename key', 'destructive')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface mb-6">Rename API Key</h3>
      <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Key Name</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input-field mb-6"
        maxLength={64}
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
      />
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={handleRename} disabled={!name.trim() || submitting} className="btn-primary">
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel rounded-2xl p-6 md:p-8 max-w-md w-full mx-4 relative z-10 border border-white/[0.08] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
