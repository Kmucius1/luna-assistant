'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useLocation } from '@/hooks/useLocation'
import { Scissors, Camera, Loader2 } from 'lucide-react'

interface DailyOutfit { occasion: string; why: string; outfit_caption: string; image_url: string | null }
interface WornOutfit { id: string; date_key: string; photo_url: string; created_at: string }

// NOTE: this page previously used <LunaShell>, whose <LunaBackground> renders
// a fixed, full-viewport dark/purple gradient behind every page regardless of
// the light/dark theme toggle. That's incompatible with this page's locked
// light palette, so it now uses <AppLayout> directly (same shell every other
// retheme'd page in this pass uses) with an explicit light bg-app override.
const G: React.CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  border: '1px solid rgba(180,150,100,0.18)',
  borderRadius: 20,
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  boxShadow: '0 6px 24px rgba(60,46,24,0.08)',
}

const LBL: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: '#8A6F2A',
  display: 'flex', alignItems: 'center', gap: 5,
  marginBottom: 8, flexShrink: 0,
}

export default function OutfitTodayPage() {
  const location = useLocation()
  const [dailyOutfit, setDailyOutfit] = useState<DailyOutfit | null>(null)
  const [outfitLoading, setOutfitLoading] = useState(true)
  const [wornOutfits, setWornOutfits] = useState<WornOutfit[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)

  const loadWorn = useCallback(() => {
    fetch('/api/atelier/worn-outfits')
      .then(r => r.json())
      .then(d => setWornOutfits(d.outfits ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => { loadWorn() }, [loadWorn])

  useEffect(() => {
    if (location.permitted === null) return
    const params = new URLSearchParams({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
    if (location.lat != null && location.lon != null) {
      params.set('lat', String(location.lat))
      params.set('lon', String(location.lon))
    }
    setOutfitLoading(true)
    fetch(`/api/atelier/daily-outfit?${params}`)
      .then(r => r.json())
      .then(d => setDailyOutfit(d))
      .catch(() => setDailyOutfit(null))
      .finally(() => setOutfitLoading(false))
  }, [location.permitted, location.lat, location.lon])

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setUploadMsg(null)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await fetch('/api/atelier/wardrobe/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: reader.result, sourceLabel: new Date().toLocaleDateString() }),
        })
        const data = await res.json() as { items?: unknown[]; error?: string; message?: string }
        if (data.items?.length) {
          setUploadMsg(`Saved — and sorted ${data.items.length} piece${data.items.length === 1 ? '' : 's'} into your closet.`)
        } else {
          setUploadMsg("Outfit saved. " + (data.error || data.message || "Couldn't pick out individual pieces from that shot."))
        }
        loadWorn()
      } catch {
        setUploadMsg("Couldn't save that photo. Try again.")
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      className="bg-app min-h-screen"
      style={{
        '--app-bg-from': '#FBF8F2',
        '--app-bg-mid': '#F6F1E7',
        '--app-bg-to': '#F0E9DA',
      } as React.CSSProperties}
    >
      <AppLayout>
        <div className="flex flex-col gap-4" style={{ maxWidth: 720, margin: '0 auto', padding: '4px 2px 24px' }}>

          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: '#100C1E', margin: '0 0 3px' }}>What To Wear Today</h1>
            <p style={{ fontSize: 13, color: '#5E5474', margin: 0 }}>LUNA&apos;s pick, built from today&apos;s weather, mood, and energy.</p>
          </div>

          {/* AI daily outfit suggestion — big version */}
          <div style={{ ...G, borderRadius: 26, padding: '18px 18px 20px' }}>
            <div style={LBL}><Scissors style={{ width: 10, height: 10 }} />Today&apos;s Suggestion</div>
            {outfitLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#8A6F2A' }} />
              </div>
            ) : dailyOutfit?.image_url ? (
              <>
                <div style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 12, aspectRatio: '3 / 4', maxHeight: 480 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={dailyOutfit.image_url} alt={dailyOutfit.outfit_caption} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#100C1E', margin: '0 0 4px' }}>{dailyOutfit.occasion}</p>
                <p style={{ fontSize: 13, color: '#32284A', margin: '0 0 8px', lineHeight: 1.4 }}>{dailyOutfit.outfit_caption}</p>
                <p style={{ fontSize: 12.5, color: '#5E5474', margin: 0, lineHeight: 1.5 }}>{dailyOutfit.why}</p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: '#5E5474' }}>LUNA is putting today&apos;s look together — check back in a moment.</p>
            )}
          </div>

          {/* Upload outfit of the day */}
          <div style={{ ...G, borderRadius: 22, padding: '16px 16px' }}>
            <div style={LBL}><Camera style={{ width: 10, height: 10 }} />Upload Outfit Of The Day</div>
            <p style={{ fontSize: 12, color: '#5E5474', margin: '-2px 0 12px', lineHeight: 1.4 }}>
              Snap what you actually wore. LUNA saves it and auto-sorts the pieces into your closet.
            </p>
            <label
              className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2 font-semibold text-sm transition-all cursor-pointer"
              style={{ background: 'linear-gradient(135deg, rgba(201,169,110,0.2), rgba(184,147,74,0.2))', border: '1.5px solid rgba(201,169,110,0.4)', color: '#8A6F2A', opacity: uploading ? 0.7 : 1 }}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {uploading ? 'Saving your outfit…' : 'Upload outfit of the day'}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
            </label>
            {uploadMsg && <p style={{ fontSize: 12, color: '#5E5474', textAlign: 'center', margin: '10px 0 0' }}>{uploadMsg}</p>}
          </div>

          {/* Recent worn outfits */}
          {wornOutfits.length > 0 && (
            <div style={{ ...G, borderRadius: 22, padding: '16px 16px' }}>
              <div style={LBL}>Recent Outfits</div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                {wornOutfits.map(o => (
                  <div key={o.id} style={{ flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.photo_url} alt={o.date_key} style={{ width: 84, height: 112, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
                    <p style={{ fontSize: 9, color: '#8A8098', margin: '4px 0 0', textAlign: 'center' }}>{o.date_key}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </AppLayout>
    </div>
  )
}
