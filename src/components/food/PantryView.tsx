'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, Loader2, Package, Plus, Snowflake, Refrigerator, Trash2, X } from 'lucide-react'
import styles from './FoodViews.module.css'

interface PantryItem { id: string; name: string; category: string; storage: 'fridge' | 'freezer' | 'pantry'; quantity: string | null; expires_on: string | null }
interface PreviewItem { name: string; quantity: string; category: string; storage: 'fridge' | 'freezer' | 'pantry' }

const UNCERTAIN_ITEMS = [
  'Bananas', 'Buns', 'Cucumbers', 'Baby carrots', 'Greek yogurt', 'Granola',
  'Broccoli', 'Heavy cream', 'Parmesan', 'Sun-dried tomatoes', 'Garlic', 'Pasta', 'Potatoes',
]

const STORAGE_OPTIONS: { value: 'fridge' | 'freezer' | 'pantry'; label: string }[] = [
  { value: 'fridge', label: 'Fridge' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'pantry', label: 'Pantry' },
]

const STORAGE_SECTIONS: { value: 'fridge' | 'freezer' | 'pantry'; label: string; icon: typeof Refrigerator }[] = [
  { value: 'fridge', label: 'Fridge', icon: Refrigerator },
  { value: 'freezer', label: 'Freezer', icon: Snowflake },
  { value: 'pantry', label: 'Pantry Shelf', icon: Package },
]

function expiryLabel(dateStr: string | null): { text: string; urgency: 'expired' | 'soon' | 'ok' | 'none' } {
  if (!dateStr) return { text: 'No date', urgency: 'none' }
  const days = Math.ceil((new Date(dateStr).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000)
  if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, urgency: 'expired' }
  if (days === 0) return { text: 'Expires today', urgency: 'expired' }
  if (days <= 3) return { text: `In ${days}d`, urgency: 'soon' }
  return { text: `In ${days}d`, urgency: 'ok' }
}

export function PantryView() {
  const [pantry, setPantry] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)

  const [addName, setAddName] = useState('')
  const [addQty, setAddQty] = useState('')
  const [addDate, setAddDate] = useState('')
  const [addStorage, setAddStorage] = useState<'fridge' | 'freezer' | 'pantry'>('fridge')
  const [adding, setAdding] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [extracting, setExtracting] = useState(false)
  const [previewItems, setPreviewItems] = useState<PreviewItem[] | null>(null)

  const [confirmedUncertain, setConfirmedUncertain] = useState<Set<string>>(new Set())
  const [confirmingItem, setConfirmingItem] = useState<string | null>(null)

  const [nlText, setNlText] = useState('')
  const [nlApplying, setNlApplying] = useState(false)
  const [nlResult, setNlResult] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')
  const [editDate, setEditDate] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    loadPantry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function loadPantry() {
    setLoading(true)
    fetch('/api/food/pantry')
      .then(r => r.json())
      .then(d => setPantry(d.items ?? []))
      .finally(() => setLoading(false))
  }

  async function addPantryItem() {
    if (!addName.trim()) return
    setAdding(true)
    try {
      await fetch('/api/food/pantry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ name: addName.trim(), quantity: addQty.trim() || undefined, expires_on: addDate || undefined, storage: addStorage, source: 'manual' }] }),
      })
      setAddName(''); setAddQty(''); setAddDate('')
      loadPantry()
    } finally {
      setAdding(false)
    }
  }

  async function markConsumed(id: string) {
    setPantry(p => p.filter(i => i.id !== id))
    await fetch(`/api/food/pantry/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mark_consumed: true }),
    })
  }

  async function deleteItem(id: string) {
    setPantry(p => p.filter(i => i.id !== id))
    await fetch(`/api/food/pantry/${id}`, { method: 'DELETE' })
  }

  function startEdit(item: PantryItem) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditQty(item.quantity ?? '')
    setEditDate(item.expires_on ?? '')
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return
    setSavingEdit(true)
    try {
      await fetch(`/api/food/pantry/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), quantity: editQty, expires_on: editDate || undefined }),
      })
      setEditingId(null)
      loadPantry()
    } finally {
      setSavingEdit(false)
    }
  }

  async function changeStorage(id: string, storage: 'fridge' | 'freezer' | 'pantry') {
    setPantry(p => p.map(i => (i.id === id ? { ...i, storage } : i)))
    await fetch(`/api/food/pantry/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storage }),
    })
  }

  async function confirmUncertainItem(name: string) {
    setConfirmingItem(name)
    try {
      await fetch('/api/food/pantry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ name, source: 'manual' }] }),
      })
      setConfirmedUncertain(s => new Set(s).add(name))
      loadPantry()
    } finally {
      setConfirmingItem(null)
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setExtracting(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch('/api/food/pantry/photo-extract', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: reader.result }),
        })
        const data = await res.json()
        setPreviewItems(data.items ?? [])
      } finally {
        setExtracting(false)
      }
    }
    reader.readAsDataURL(file)
  }

  async function confirmPreviewItems() {
    if (!previewItems || previewItems.length === 0) { setPreviewItems(null); return }
    setAdding(true)
    try {
      await fetch('/api/food/pantry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: previewItems.map(i => ({ name: i.name, quantity: i.quantity, category: i.category, storage: i.storage, source: 'photo' })) }),
      })
      setPreviewItems(null)
      loadPantry()
    } finally {
      setAdding(false)
    }
  }

  async function applyNlUpdate() {
    if (!nlText.trim()) return
    setNlApplying(true)
    setNlResult(null)
    try {
      const res = await fetch('/api/food/pantry/nl-update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: nlText.trim() }),
      })
      const data = await res.json()
      const applied: { name: string; action: string }[] = data.applied ?? []
      setNlResult(applied.length ? applied.map(a => `${a.name} → ${a.action}`).join(', ') : "Didn't recognize any pantry items in that.")
      setNlText('')
      loadPantry()
    } finally {
      setNlApplying(false)
    }
  }

  const uncertainToShow = useMemo(() => {
    const have = new Set(pantry.map(p => p.name.toLowerCase()))
    return UNCERTAIN_ITEMS.filter(name => !confirmedUncertain.has(name) && !have.has(name.toLowerCase()))
  }, [pantry, confirmedUncertain])

  const grouped = useMemo(() => {
    const map: Record<'fridge' | 'freezer' | 'pantry', PantryItem[]> = { fridge: [], freezer: [], pantry: [] }
    for (const item of pantry) {
      const bucket = item.storage in map ? item.storage : 'fridge'
      map[bucket].push(item)
    }
    return map
  }, [pantry])

  return (
    <>
      <div className={styles.pantryAddRow}>
        <input className={styles.pantryNameInput} placeholder="Item" value={addName} onChange={e => setAddName(e.target.value)} />
        <input className={styles.pantryQtyInput} placeholder="Qty" value={addQty} onChange={e => setAddQty(e.target.value)} />
        <input className={styles.pantryDateInput} type="date" value={addDate} onChange={e => setAddDate(e.target.value)} aria-label="Expiration date (optional)" />
      </div>
      <div className={styles.storageRow}>
        {STORAGE_OPTIONS.map(o => (
          <button
            key={o.value}
            type="button"
            className={`${styles.storageChip} ${addStorage === o.value ? styles.storageChipActive : ''}`}
            onClick={() => setAddStorage(o.value)}
          >
            {o.label}
          </button>
        ))}
        <button type="button" className={styles.pantryAddButton} onClick={addPantryItem} disabled={adding || !addName.trim()} aria-label="Add item">
          <Plus size={16} />
        </button>
      </div>

      <button type="button" className={styles.photoButton} onClick={() => fileInputRef.current?.click()} disabled={extracting}>
        {extracting ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        {extracting ? 'Reading photo…' : 'Add from a photo'}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />

      <div className={styles.nlUpdateRow}>
        <input
          className={styles.nlUpdateInput}
          placeholder={'Tell Luna what happened — e.g. "I ate the salmon"'}
          value={nlText}
          onChange={e => setNlText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyNlUpdate()}
        />
        <button type="button" className={styles.pantryAddButton} onClick={applyNlUpdate} disabled={nlApplying || !nlText.trim()} aria-label="Update">
          {nlApplying ? <Loader2 size={14} className="animate-spin" /> : <Check size={16} />}
        </button>
      </div>
      {nlResult && <p className={styles.nlResult}>{nlResult}</p>}

      {uncertainToShow.length > 0 && (
        <div>
          <div className={styles.groceryGroupLabel}>Confirm what you actually have</div>
          <div className={styles.uncertainChips}>
            {uncertainToShow.map(name => (
              <button key={name} type="button" className={styles.uncertainChip} onClick={() => confirmUncertainItem(name)} disabled={confirmingItem === name}>
                {confirmingItem === name ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.comingSoon}>Loading your pantry…</div>
      ) : pantry.length === 0 ? (
        <div className={styles.comingSoon}>Nothing logged yet — add an item above or snap a photo.</div>
      ) : (
        STORAGE_SECTIONS.map(section => {
          const items = grouped[section.value]
          if (items.length === 0) return null
          const Icon = section.icon
          return (
            <div key={section.value} className={styles.storageSection}>
              <div className={styles.storageSectionLabel}><Icon /> {section.label}</div>
              {items.map(item => {
                const exp = expiryLabel(item.expires_on)
                const isEditing = editingId === item.id
                return (
                  <div key={item.id} className={styles.pantryRow}>
                    {isEditing ? (
                      <div className={styles.editRow}>
                        <input className={styles.editNameInput} value={editName} onChange={e => setEditName(e.target.value)} />
                        <input className={styles.editQtyInput} placeholder="Qty" value={editQty} onChange={e => setEditQty(e.target.value)} />
                        <input className={styles.editDateInput} type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                        <button type="button" className={styles.editSaveButton} onClick={() => saveEdit(item.id)} disabled={savingEdit || !editName.trim()}>
                          {savingEdit ? '…' : 'Save'}
                        </button>
                        <button type="button" className={styles.pantryIconButton} onClick={() => setEditingId(null)} aria-label="Cancel"><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.pantryRowMain} onClick={() => startEdit(item)}>
                          <span className={styles.pantryName}>{item.name}</span>
                          {item.quantity && <span className={styles.pantryQty}>{item.quantity}</span>}
                        </div>
                        <span className={`${styles.pantryExpiry} ${styles[`expiry_${exp.urgency}`]}`}>{exp.text}</span>
                        {section.value !== 'freezer' && (
                          <button type="button" onClick={() => changeStorage(item.id, 'freezer')} aria-label="Move to freezer" className={styles.pantryIconButton}><Snowflake size={14} /></button>
                        )}
                        <button type="button" onClick={() => markConsumed(item.id)} aria-label="Mark used" className={styles.pantryIconButton}><Check size={14} /></button>
                        <button type="button" onClick={() => deleteItem(item.id)} aria-label="Delete" className={styles.pantryIconButton}><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })
      )}

      {previewItems && (
        <div className={styles.previewOverlay}>
          <div className={styles.previewSheet}>
            <div className={styles.previewHeader}>
              <span>Found {previewItems.length} item{previewItems.length === 1 ? '' : 's'}</span>
              <button type="button" onClick={() => setPreviewItems(null)} aria-label="Close"><X size={16} /></button>
            </div>
            <div className={styles.previewList}>
              {previewItems.map((it, i) => (
                <div key={i} className={styles.previewRow}>
                  <input value={it.name} onChange={e => setPreviewItems(p => p!.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)))} />
                  <input className={styles.previewQty} value={it.quantity} onChange={e => setPreviewItems(p => p!.map((x, xi) => (xi === i ? { ...x, quantity: e.target.value } : x)))} />
                  <button type="button" onClick={() => setPreviewItems(p => p!.filter((_, xi) => xi !== i))} aria-label="Remove"><X size={14} /></button>
                </div>
              ))}
            </div>
            <button type="button" className={styles.previewConfirm} onClick={confirmPreviewItems} disabled={adding || previewItems.length === 0}>
              Add {previewItems.length} to Pantry
            </button>
          </div>
        </div>
      )}
    </>
  )
}
