'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
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
  const t = useTranslations('apiKeys')
  const locale = useLocale()
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
          <h3 className="font-headline text-lg font-bold uppercase text-on-surface mb-2">{t('emptyTitle')}</h3>
          <p className="font-body text-sm text-on-surface-variant mb-6 max-w-sm mx-auto">
            {t('emptyDescription')}
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            {t('createFirst')}
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
        <h2 className="font-headline text-lg font-bold uppercase tracking-tight text-on-surface">{t('heading')}</h2>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          {t('createNew')}
        </button>
      </div>

      {/* Desktop Table */}
      <GlassCard className="hidden md:block overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('tableName')}</th>
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('tableKeyPrefix')}</th>
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('tableCreated')}</th>
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('tableLastUsed')}</th>
              <th className="text-left px-5 py-3 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{t('tableStatus')}</th>
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
                <td className="px-5 py-3 font-body text-sm text-on-surface-variant">{formatDate(k.createdAt, locale, t)}</td>
                <td className="px-5 py-3 font-body text-sm text-on-surface-variant">{k.lastUsedAt ? formatDate(k.lastUsedAt, locale, t) : t('never')}</td>
                <td className="px-5 py-3">
                  <Badge variant={k.isActive ? 'primary' : 'secondary'} size="sm">
                    {k.isActive ? t('statusActive') : t('statusRevoked')}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right relative">
                  {k.isActive && (
                    <div className="relative inline-block">
                      <button
                        onClick={() => setMenuOpen(menuOpen === k.id ? null : k.id)}
                        className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors text-on-surface-variant"
                        aria-label={t('actionsAriaLabel')}
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
                {k.isActive ? t('statusActive') : t('statusRevoked')}
              </Badge>
            </div>
            <p className="font-mono text-sm text-on-surface-variant mb-2">{k.keyPrefix}...</p>
            <div className="flex items-center justify-between">
              <span className="font-body text-xs text-on-surface-variant">{t('createdLabel', { date: formatDate(k.createdAt, locale, t) })}</span>
              {k.isActive && (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === k.id ? null : k.id)}
                    className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors text-on-surface-variant text-sm"
                    aria-label={t('actionsAriaLabel')}
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
        {t('revokedNotice')}
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
  const t = useTranslations('apiKeys')
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full mt-1 z-50 glass-panel rounded-xl p-1 min-w-[160px] shadow-lg border border-white/[0.08]">
        <button onClick={onRename} className="w-full text-left px-3 py-2 text-sm font-body rounded-lg hover:bg-white/[0.06] transition-colors flex items-center gap-2">
          {t('rename')}
        </button>
        <button onClick={onRotate} className="w-full text-left px-3 py-2 text-sm font-body rounded-lg hover:bg-white/[0.06] transition-colors flex items-center gap-2">
          {t('rotate')}
        </button>
        <div className="h-px bg-outline-variant/50 my-1" />
        <button onClick={onRevoke} className="w-full text-left px-3 py-2 text-sm font-body rounded-lg hover:bg-secondary/10 transition-colors flex items-center gap-2 text-secondary">
          {t('revoke')}
        </button>
      </div>
    </>
  )
}

function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (rawKey: string) => void }) {
  const t = useTranslations('apiKeys')
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
      toast(t('createSuccess'), 'success')
      onCreated(data.key)
    } catch {
      toast(t('createFailed'), 'destructive')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface mb-6">{t('createTitle')}</h3>
      <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
        {t('keyName')}
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('keyNamePlaceholder')}
        className="input-field mb-6"
        maxLength={64}
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
      />
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">{t('cancel')}</button>
        <button onClick={handleCreate} disabled={!name.trim() || submitting} className="btn-primary">
          {submitting ? t('creating') : t('createKey')}
        </button>
      </div>
    </Modal>
  )
}

function KeyRevealModal({ rawKey, onClose }: { rawKey: string; onClose: () => void }) {
  const t = useTranslations('apiKeys')
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  async function copyKey() {
    await navigator.clipboard.writeText(rawKey)
    setCopied(true)
    toast(t('copied'), 'info')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-primary mb-4">{t('revealTitle')}</h3>
      <div className="bg-tertiary/10 border border-tertiary/30 rounded-xl p-3 mb-4">
        <p className="font-body text-sm text-tertiary">{t('revealWarning')}</p>
      </div>
      <div className="relative bg-surface-container-lowest rounded-xl p-4 border border-outline-variant mb-6">
        <p className="font-mono text-sm text-on-surface break-all pr-10">{rawKey}</p>
        <button
          onClick={copyKey}
          className="absolute top-3 right-3 p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
          aria-label={t('copyKeyAria')}
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
      <div className="flex justify-end">
        <button onClick={onClose} className="btn-primary">{t('done')}</button>
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
  const t = useTranslations('apiKeys')
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
        toast(t('rotateSuccess'), 'warning')
        onDone(data.key)
      } else {
        toast(t('revokeSuccess'), 'destructive')
        onDone()
      }
    } catch {
      toast(isRevoke ? t('revokeFailed') : t('rotateFailed'), 'destructive')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className={`font-headline text-xl font-bold uppercase tracking-tight mb-4 ${isRevoke ? 'text-secondary' : 'text-on-surface'}`}>
        {isRevoke ? t('revokeTitle') : t('rotateTitle')}
      </h3>
      <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6">
        {isRevoke
          ? t('revokeBody', { name: keyName })
          : t('rotateBody', { name: keyName })}
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">{t('cancel')}</button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className={isRevoke ? 'btn-destructive' : 'btn-primary'}
        >
          {submitting ? t('processing') : isRevoke ? t('revokeButton') : t('rotateButton')}
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
  const t = useTranslations('apiKeys')
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
      toast(t('renameSuccess'), 'success')
      onDone()
    } catch {
      toast(t('renameFailed'), 'destructive')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="font-headline text-xl font-bold uppercase tracking-tight text-on-surface mb-6">{t('renameTitle')}</h3>
      <label className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">{t('keyName')}</label>
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
        <button onClick={onClose} className="btn-secondary">{t('cancel')}</button>
        <button onClick={handleRename} disabled={!name.trim() || submitting} className="btn-primary">
          {submitting ? t('saving') : t('save')}
        </button>
      </div>
    </Modal>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const t = useTranslations('apiKeys')
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel rounded-2xl p-6 md:p-8 max-w-md w-full mx-4 relative z-10 border border-white/[0.08] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label={t('closeAria')}
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

function formatDate(iso: string, locale: string, t: (k: string, v?: Record<string, string | number>) => string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) return t('today')
  if (diffDays === 1) return t('yesterday')
  if (diffDays < 30) return t('daysAgo', { days: diffDays })
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
}
