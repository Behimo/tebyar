import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './icons'
import { useAuth } from './auth'
import { Avatar } from './ui'

type BrushMode = 'marker' | 'highlighter' | 'neon'
type Ink = { color: string; size: number; mode: BrushMode; points: { x: number; y: number }[] }
type TextStyle = 'classic' | 'pill' | 'translucent' | 'outline'
type TextAlign = 'center' | 'right' | 'left'
type Caption = {
  id: string
  text: string
  x: number
  y: number
  color: string
  style: TextStyle
  size: number
  align: TextAlign
}
type StickerKind = 'emoji' | 'mention' | 'hashtag' | 'location' | 'time'
type Sticker = {
  id: string
  kind: StickerKind
  label: string
  x: number
  y: number
}
type FilterKey = 'none' | 'warm' | 'cool' | 'vivid' | 'bw'

const filters: { key: FilterKey; label: string; css: string }[] = [
  { key: 'none', label: 'اصلی', css: 'none' },
  { key: 'warm', label: 'گرم', css: 'sepia(0.22) saturate(1.25) brightness(1.03)' },
  { key: 'cool', label: 'سرد', css: 'hue-rotate(12deg) saturate(1.1) contrast(1.06)' },
  { key: 'vivid', label: 'درخشان', css: 'saturate(1.42) contrast(1.1)' },
  { key: 'bw', label: 'کلاسیک', css: 'grayscale(1) contrast(1.15)' },
]

const palette = [
  '#ffffff',
  '#16182A',
  '#12A8A8',
  '#2F6FED',
  '#7B5CDB',
  '#FF8070',
  '#F59E0B',
  '#10B981',
  '#EC4899',
  '#EF4444',
]

const emojiStickers = ['🩺', '💊', '❤️‍🩹', '🏥', '🧬', '✨', '👏', '🔥']

function useCover(open: boolean) {
  useEffect(() => {
    if (!open) return
    document.body.dataset.cover = 'story'
    return () => { delete document.body.dataset.cover }
  }, [open])
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const raw of text.split('\n')) {
    let line = ''
    for (const word of raw.split(' ')) {
      const candidate = line ? `${line} ${word}` : word
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    lines.push(line)
  }
  return lines.filter((row) => row.length > 0)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.closePath()
}

export function StoryStudio({
  file,
  busy,
  onCancel,
  onPublish,
}: {
  file: File
  busy: boolean
  onCancel: () => void
  onPublish: (file: File) => void
}) {
  const { user } = useAuth()
  const stageRef = useRef<HTMLDivElement>(null)
  const drawRef = useRef<HTMLCanvasElement>(null)
  const [url, setUrl] = useState('')

  const [mode, setMode] = useState<'idle' | 'draw' | 'text' | 'stickers'>('idle')
  const [filterIdx, setFilterIdx] = useState(0)

  // Draw state
  const [brushMode, setBrushMode] = useState<BrushMode>('marker')
  const [brushSize, setBrushSize] = useState(5)
  const [color, setColor] = useState('#ffffff')
  const [strokes, setStrokes] = useState<Ink[]>([])
  const drawing = useRef<Ink | null>(null)

  // Text editor state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [textStyle, setTextStyle] = useState<TextStyle>('pill')
  const [textSize, setTextSize] = useState(24)
  const [textAlign, setTextAlign] = useState<TextAlign>('center')
  const [captions, setCaptions] = useState<Caption[]>([])

  // Stickers state
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [stickerInput, setStickerInput] = useState<{ kind: 'mention' | 'hashtag' | 'location'; value: string } | null>(null)

  // Dragging & Trash zone
  const [dragging, setDragging] = useState(false)
  const [overTrash, setOverTrash] = useState(false)
  const dragItem = useRef<{ type: 'caption' | 'sticker'; id: string; dx: number; dy: number } | null>(null)

  useCover(true)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const activeFilter = filters[filterIdx] ?? filters[0]

  const paint = (rows: Ink[]) => {
    const canvas = drawRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const rect = stage.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const stroke of rows) {
      ctx.save()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size
      if (stroke.mode === 'highlighter') {
        ctx.globalAlpha = 0.42
        ctx.lineWidth = stroke.size * 2.2
      } else if (stroke.mode === 'neon') {
        ctx.shadowColor = stroke.color
        ctx.shadowBlur = 14
      }
      ctx.beginPath()
      stroke.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      })
      ctx.stroke()
      ctx.restore()
    }
  }

  useEffect(() => { paint(strokes) }, [strokes])

  const pointOf = (event: PointerEvent) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const openTextEditor = (existing?: Caption) => {
    if (existing) {
      setEditingId(existing.id)
      setDraft(existing.text)
      setColor(existing.color)
      setTextStyle(existing.style)
      setTextSize(existing.size)
      setTextAlign(existing.align)
    } else {
      setEditingId(null)
      setDraft('')
      setTextStyle('pill')
      setTextSize(24)
      setTextAlign('center')
    }
    setMode('text')
  }

  const commitText = () => {
    const trimmed = draft.trim()
    const rect = stageRef.current?.getBoundingClientRect()
    if (trimmed && rect) {
      if (editingId) {
        setCaptions((rows) => rows.map((r) => (r.id === editingId
          ? { ...r, text: trimmed, color, style: textStyle, size: textSize, align: textAlign }
          : r)))
      } else {
        setCaptions((rows) => [...rows, {
          id: String(Date.now()),
          text: trimmed,
          x: rect.width / 2,
          y: rect.height * 0.45,
          color,
          style: textStyle,
          size: textSize,
          align: textAlign,
        }])
      }
    } else if (!trimmed && editingId) {
      setCaptions((rows) => rows.filter((r) => r.id !== editingId))
    }
    setDraft('')
    setEditingId(null)
    setMode('idle')
  }

  const addSticker = (kind: StickerKind, label: string) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return
    setStickers((rows) => [...rows, {
      id: `${Date.now()}-${Math.random()}`,
      kind,
      label,
      x: rect.width / 2,
      y: rect.height * 0.45,
    }])
    setMode('idle')
    setStickerInput(null)
  }

  const checkTrash = (clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return false
    return clientY > rect.bottom - 90
  }

  const publish = async () => {
    const stage = stageRef.current
    if (!stage || !url) return
    const rect = stage.getBoundingClientRect()
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = new Image()
    image.src = url
    await image.decode()

    ctx.fillStyle = '#0B0D14'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    if (activeFilter.css !== 'none') ctx.filter = activeFilter.css
    const scale = Math.min(canvas.width / image.width, canvas.height / image.height)
    const w = image.width * scale
    const h = image.height * scale
    ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
    ctx.restore()

    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const stroke of strokes) {
      ctx.save()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size * sx
      if (stroke.mode === 'highlighter') {
        ctx.globalAlpha = 0.42
        ctx.lineWidth = stroke.size * 2.2 * sx
      } else if (stroke.mode === 'neon') {
        ctx.shadowColor = stroke.color
        ctx.shadowBlur = 14 * sx
      }
      ctx.beginPath()
      stroke.points.forEach((point, index) => {
        const x = point.x * sx
        const y = point.y * sy
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.restore()
    }

    for (const caption of captions) {
      const fontSize = Math.round(caption.size * sx)
      ctx.font = `700 ${fontSize}px Vazirmatn, Tahoma, sans-serif`
      ctx.textAlign = caption.align
      ctx.textBaseline = 'middle'
      const lines = wrapText(ctx, caption.text, canvas.width * 0.8)
      const lineHeight = fontSize * 1.4
      const x = caption.x * sx

      if (caption.style === 'pill' || caption.style === 'translucent') {
        const maxLineW = Math.max(...lines.map((l) => ctx.measureText(l).width), 60)
        const padX = 24 * sx * 0.45
        const padY = 14 * sy * 0.45
        const boxW = maxLineW + padX * 2
        const boxH = lines.length * lineHeight + padY
        const boxX = caption.align === 'center' ? x - boxW / 2 : caption.align === 'right' ? x - boxW + padX : x - padX
        const boxY = caption.y * sy - boxH / 2
        ctx.save()
        if (caption.style === 'pill') {
          ctx.fillStyle = caption.color
        } else {
          ctx.fillStyle = 'rgba(18, 22, 36, 0.72)'
        }
        roundRect(ctx, boxX, boxY, boxW, boxH, 16 * sx * 0.5)
        ctx.fill()
        ctx.restore()
      }

      lines.forEach((line, index) => {
        const y = caption.y * sy + (index - (lines.length - 1) / 2) * lineHeight
        ctx.save()
        if (caption.style === 'outline') {
          ctx.shadowColor = caption.color
          ctx.shadowBlur = 18
          ctx.lineWidth = Math.max(4, 2.5 * sx)
          ctx.strokeStyle = caption.color
          ctx.strokeText(line, x, y)
          ctx.fillStyle = '#ffffff'
        } else if (caption.style === 'pill') {
          ctx.fillStyle = caption.color === '#ffffff' ? '#16182A' : '#ffffff'
        } else if (caption.style === 'translucent') {
          ctx.fillStyle = caption.color
        } else {
          ctx.lineWidth = Math.max(4, 2 * sx)
          ctx.strokeStyle = 'rgba(0,0,0,.48)'
          ctx.strokeText(line, x, y)
          ctx.fillStyle = caption.color
        }
        ctx.fillText(line, x, y)
        ctx.restore()
      })
    }

    for (const sticker of stickers) {
      const x = sticker.x * sx
      const y = sticker.y * sy
      ctx.save()
      if (sticker.kind === 'emoji') {
        ctx.font = `${Math.round(52 * sx)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(sticker.label, x, y)
      } else {
        const fontSize = Math.round(18 * sx)
        ctx.font = `700 ${fontSize}px Vazirmatn, Tahoma, sans-serif`
        const wText = ctx.measureText(sticker.label).width
        const bw = wText + 36 * sx * 0.5
        const bh = 38 * sy * 0.55
        if (sticker.kind === 'mention') {
          const grad = ctx.createLinearGradient(x - bw / 2, y, x + bw / 2, y)
          grad.addColorStop(0, '#7B5CDB')
          grad.addColorStop(1, '#FF8070')
          ctx.fillStyle = grad
        } else if (sticker.kind === 'hashtag') {
          ctx.fillStyle = '#12A8A8'
        } else if (sticker.kind === 'location') {
          ctx.fillStyle = '#2F6FED'
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.92)'
        }
        roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, 999)
        ctx.fill()
        ctx.fillStyle = sticker.kind === 'time' ? '#16182A' : '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(sticker.label, x, y)
      }
      ctx.restore()
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) return
    onPublish(new File([blob], 'story.jpg', { type: 'image/jpeg' }))
  }

  return createPortal(
    <div className="story-studio">
      <header className="story-studio-bar">
        <button type="button" className="story-bar-btn" aria-label="بستن" onClick={onCancel}><Icon name="close" /></button>
        {mode === 'draw' ? (
          <div className="story-bar-tools">
            <button type="button" className="story-pill-btn" onClick={() => setStrokes((s) => s.slice(0, -1))} disabled={strokes.length === 0}>برگشت</button>
            <button type="button" className="story-pill-btn" onClick={() => { setStrokes([]); paint([]) }} disabled={strokes.length === 0}>پاک</button>
            <button type="button" className="story-pill-btn is-primary" onClick={() => setMode('idle')}>تأیید</button>
          </div>
        ) : (
          <div className="story-bar-tools">
            <button type="button" className="story-bar-btn" aria-label="متن" onClick={() => openTextEditor()}><span className="story-aa">Aa</span></button>
            <button type="button" className="story-bar-btn" aria-label="قلم" onClick={() => setMode('draw')}><Icon name="edit" /></button>
            <button type="button" className="story-bar-btn" aria-label="استیکر" onClick={() => setMode('stickers')}><Icon name="award" /></button>
            <button
              type="button"
              className="story-pill-btn"
              onClick={() => setFilterIdx((i) => (i + 1) % filters.length)}
            >
              فیلتر: {activeFilter.label}
            </button>
          </div>
        )}
      </header>

      <div
        ref={stageRef}
        className="story-stage"
        onPointerDown={(event) => {
          if (mode !== 'draw') return
          const point = pointOf(event)
          drawing.current = { color, size: brushSize, mode: brushMode, points: [point] }
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return
          drawing.current.points.push(pointOf(event))
          paint([...strokes, drawing.current])
        }}
        onPointerUp={() => {
          if (!drawing.current) return
          setStrokes((rows) => [...rows, drawing.current as Ink])
          drawing.current = null
        }}
      >
        {url && <img src={url} alt="" draggable={false} style={{ filter: activeFilter.css }} />}
        <canvas ref={drawRef} />

        {captions.map((caption) => (
          <button
            type="button"
            key={caption.id}
            className={`story-caption story-caption--${caption.style}`}
            style={{
              left: caption.x,
              top: caption.y,
              fontSize: caption.size,
              textAlign: caption.align,
              color: caption.style === 'pill' ? (caption.color === '#ffffff' ? '#16182A' : '#ffffff') : caption.color,
              background: caption.style === 'pill' ? caption.color : caption.style === 'translucent' ? 'rgba(18,22,36,.72)' : 'transparent',
              textShadow: caption.style === 'outline' ? `0 0 12px ${caption.color}, 0 0 4px ${caption.color}` : undefined,
            }}
            onClick={(event) => {
              event.stopPropagation()
              if (!dragging) openTextEditor(caption)
            }}
            onPointerDown={(event) => {
              if (mode === 'draw') return
              const rect = stageRef.current?.getBoundingClientRect()
              if (!rect) return
              event.stopPropagation()
              event.currentTarget.setPointerCapture(event.pointerId)
              dragItem.current = {
                type: 'caption',
                id: caption.id,
                dx: event.clientX - rect.left - caption.x,
                dy: event.clientY - rect.top - caption.y,
              }
            }}
            onPointerMove={(event) => {
              const drag = dragItem.current
              const rect = stageRef.current?.getBoundingClientRect()
              if (!drag || drag.type !== 'caption' || drag.id !== caption.id || !rect) return
              setDragging(true)
              setOverTrash(checkTrash(event.clientY))
              const x = Math.min(Math.max(event.clientX - rect.left - drag.dx, 12), rect.width - 12)
              const y = Math.min(Math.max(event.clientY - rect.top - drag.dy, 12), rect.height - 12)
              setCaptions((rows) => rows.map((row) => (row.id === caption.id ? { ...row, x, y } : row)))
            }}
            onPointerUp={(event) => {
              if (!dragItem.current) return
              event.currentTarget.releasePointerCapture(event.pointerId)
              if (checkTrash(event.clientY)) {
                setCaptions((rows) => rows.filter((r) => r.id !== caption.id))
              }
              dragItem.current = null
              setOverTrash(false)
              window.setTimeout(() => setDragging(false), 60)
            }}
            onPointerCancel={() => { dragItem.current = null; setDragging(false); setOverTrash(false) }}
          >
            {caption.text}
          </button>
        ))}

        {stickers.map((sticker) => (
          <span
            key={sticker.id}
            className={`story-sticker story-sticker--${sticker.kind}`}
            style={{ left: sticker.x, top: sticker.y }}
            onPointerDown={(event) => {
              if (mode === 'draw') return
              const rect = stageRef.current?.getBoundingClientRect()
              if (!rect) return
              event.stopPropagation()
              event.currentTarget.setPointerCapture(event.pointerId)
              dragItem.current = {
                type: 'sticker',
                id: sticker.id,
                dx: event.clientX - rect.left - sticker.x,
                dy: event.clientY - rect.top - sticker.y,
              }
            }}
            onPointerMove={(event) => {
              const drag = dragItem.current
              const rect = stageRef.current?.getBoundingClientRect()
              if (!drag || drag.type !== 'sticker' || drag.id !== sticker.id || !rect) return
              setDragging(true)
              setOverTrash(checkTrash(event.clientY))
              const x = Math.min(Math.max(event.clientX - rect.left - drag.dx, 16), rect.width - 16)
              const y = Math.min(Math.max(event.clientY - rect.top - drag.dy, 16), rect.height - 16)
              setStickers((rows) => rows.map((row) => (row.id === sticker.id ? { ...row, x, y } : row)))
            }}
            onPointerUp={(event) => {
              if (!dragItem.current) return
              event.currentTarget.releasePointerCapture(event.pointerId)
              if (checkTrash(event.clientY)) {
                setStickers((rows) => rows.filter((r) => r.id !== sticker.id))
              }
              dragItem.current = null
              setOverTrash(false)
              window.setTimeout(() => setDragging(false), 60)
            }}
            onPointerCancel={() => { dragItem.current = null; setDragging(false); setOverTrash(false) }}
          >
            {sticker.label}
          </span>
        ))}

        {dragging && (
          <div className={overTrash ? 'story-trash is-hot' : 'story-trash'} aria-hidden="true">
            <Icon name="trash" />
          </div>
        )}
      </div>

      {mode === 'draw' && (
        <footer className="story-tools">
          <div className="story-tool-row">
            <button type="button" className={brushMode === 'marker' ? 'is-on' : ''} onClick={() => setBrushMode('marker')}>خودکار</button>
            <button type="button" className={brushMode === 'highlighter' ? 'is-on' : ''} onClick={() => setBrushMode('highlighter')}>هایلایت</button>
            <button type="button" className={brushMode === 'neon' ? 'is-on' : ''} onClick={() => setBrushMode('neon')}>نئون</button>
            <input
              type="range"
              min={3}
              max={16}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              aria-label="ضخامت قلم"
              className="story-slider"
            />
          </div>
          <div className="story-colors">
            {palette.map((ink) => (
              <button key={ink} type="button" className={color === ink ? 'is-on' : ''} style={{ background: ink }} aria-label={ink} onClick={() => setColor(ink)} />
            ))}
          </div>
        </footer>
      )}

      {mode === 'idle' && (
        <footer className="story-publish-bar">
          <button type="button" className="story-share-btn" disabled={busy} onClick={() => void publish()}>
            {user && <Avatar user={user} small />}
            <span>{busy ? 'در حال ارسال...' : 'ارسال به استوری شما'}</span>
            <Icon name="send" />
          </button>
        </footer>
      )}

      {mode === 'text' && (
        <div className="story-text-overlay" onClick={commitText}>
          <div className="story-text-top" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="story-pill-btn is-primary" onClick={commitText}>تأیید</button>
            <div className="story-text-modes">
              <button
                type="button"
                className="story-pill-btn"
                onClick={() => {
                  const order: TextStyle[] = ['classic', 'pill', 'translucent', 'outline']
                  setTextStyle(order[(order.indexOf(textStyle) + 1) % order.length])
                }}
              >
                سبک: {textStyle === 'classic' ? 'ساده' : textStyle === 'pill' ? 'کادردار' : textStyle === 'translucent' ? 'شیشه‌ای' : 'نئون'}
              </button>
              <button
                type="button"
                className="story-pill-btn"
                onClick={() => {
                  const order: TextAlign[] = ['center', 'right', 'left']
                  setTextAlign(order[(order.indexOf(textAlign) + 1) % order.length])
                }}
              >
                چینش: {textAlign === 'center' ? 'وسط' : textAlign === 'right' ? 'راست' : 'چپ'}
              </button>
            </div>
          </div>
          <div className="story-text-editor-wrap" onClick={(e) => e.stopPropagation()}>
            <textarea
              autoFocus
              className="story-text-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="متن خود را بنویسید..."
              style={{
                fontSize: textSize,
                textAlign,
                color: textStyle === 'pill' ? (color === '#ffffff' ? '#16182A' : '#ffffff') : color,
                background: textStyle === 'pill' ? color : textStyle === 'translucent' ? 'rgba(18,22,36,.72)' : 'transparent',
              }}
            />
          </div>
          <div className="story-text-bottom" onClick={(e) => e.stopPropagation()}>
            <input
              type="range"
              min={16}
              max={40}
              value={textSize}
              onChange={(e) => setTextSize(Number(e.target.value))}
              aria-label="اندازه متن"
              className="story-slider"
            />
            <div className="story-colors">
              {palette.map((ink) => (
                <button key={ink} type="button" className={color === ink ? 'is-on' : ''} style={{ background: ink }} aria-label={ink} onClick={() => setColor(ink)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'stickers' && (
        <div className="story-sticker-sheet" onClick={() => setMode('idle')}>
          <div className="story-sticker-panel" onClick={(e) => e.stopPropagation()}>
            <div className="story-sticker-head">
              <b>استیکرها</b>
              <button type="button" className="story-pill-btn" onClick={() => setMode('idle')}>بستن</button>
            </div>
            {stickerInput ? (
              <form
                className="story-sticker-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  const val = stickerInput.value.trim()
                  if (!val) return
                  const prefix = stickerInput.kind === 'mention' ? '@' : stickerInput.kind === 'hashtag' ? '#' : '📍 '
                  const clean = val.replace(/^[@#]/, '')
                  addSticker(stickerInput.kind, `${prefix}${clean}`)
                }}
              >
                <input
                  autoFocus
                  className="input"
                  value={stickerInput.value}
                  onChange={(e) => setStickerInput({ ...stickerInput, value: e.target.value })}
                  placeholder={stickerInput.kind === 'mention' ? 'شناسه پزشک (مثلاً mohammad)' : stickerInput.kind === 'hashtag' ? 'نام هشتگ (مثلاً قلب)' : 'نام بیمارستان یا شهر'}
                />
                <div className="row">
                  <button type="button" className="btn btn-ghost" onClick={() => setStickerInput(null)}>بازگشت</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>افزودن</button>
                </div>
              </form>
            ) : (
              <>
                <div className="story-sticker-chips">
                  <button type="button" className="story-sticker-chip mention" onClick={() => setStickerInput({ kind: 'mention', value: '' })}>@منشن</button>
                  <button type="button" className="story-sticker-chip hashtag" onClick={() => setStickerInput({ kind: 'hashtag', value: '' })}>#هشتگ</button>
                  <button type="button" className="story-sticker-chip location" onClick={() => setStickerInput({ kind: 'location', value: user?.city || '' })}>📍 موقعیت</button>
                  <button
                    type="button"
                    className="story-sticker-chip time"
                    onClick={() => {
                      const now = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date())
                      addSticker('time', `🕒 ${now}`)
                    }}
                  >
                    🕒 ساعت
                  </button>
                </div>
                <div className="story-emoji-grid">
                  {emojiStickers.map((em) => (
                    <button key={em} type="button" onClick={() => addSticker('emoji', em)}>{em}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
