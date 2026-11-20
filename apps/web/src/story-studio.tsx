import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './icons'

type Ink = { color: string; points: { x: number; y: number }[] }
type Caption = { id: string; text: string; x: number; y: number; color: string }

const inks = ['#ffffff', '#16182A', '#12A8A8', '#FF8070', '#2F6FED']

function useCover(open: boolean) {
  useEffect(() => {
    if (!open) return
    document.body.dataset.cover = 'story'
    return () => { delete document.body.dataset.cover }
  }, [open])
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
  const stageRef = useRef<HTMLDivElement>(null)
  const drawRef = useRef<HTMLCanvasElement>(null)
  const [url] = useState(() => URL.createObjectURL(file))
  const [tool, setTool] = useState<'text' | 'pen'>('text')
  const [color, setColor] = useState('#ffffff')
  const [draft, setDraft] = useState('')
  const [captions, setCaptions] = useState<Caption[]>([])
  const [strokes, setStrokes] = useState<Ink[]>([])
  const drawing = useRef<Ink | null>(null)
  useCover(true)

  useEffect(() => () => URL.revokeObjectURL(url), [url])

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
    ctx.lineWidth = 4
    for (const stroke of rows) {
      ctx.strokeStyle = stroke.color
      ctx.beginPath()
      stroke.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      })
      ctx.stroke()
    }
  }

  useEffect(() => { paint(strokes) }, [strokes])

  const pointOf = (event: PointerEvent) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const publish = async () => {
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.max(canvas.width / image.width, canvas.height / image.height)
    const w = image.width * scale
    const h = image.height * scale
    ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
    const sx = canvas.width / rect.width
    const sy = canvas.height / rect.height
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 4 * sx
    for (const stroke of strokes) {
      ctx.strokeStyle = stroke.color
      ctx.beginPath()
      stroke.points.forEach((point, index) => {
        const x = point.x * sx
        const y = point.y * sy
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }
    ctx.textAlign = 'center'
    ctx.font = `700 ${Math.round(42 * sx)}px Vazirmatn, Tahoma, sans-serif`
    for (const caption of captions) {
      ctx.fillStyle = caption.color
      ctx.strokeStyle = 'rgba(0,0,0,.45)'
      ctx.lineWidth = 6
      const x = caption.x * sx
      const y = caption.y * sy
      ctx.strokeText(caption.text, x, y)
      ctx.fillText(caption.text, x, y)
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) return
    onPublish(new File([blob], 'story.jpg', { type: 'image/jpeg' }))
  }

  return createPortal(
    <div className="story-studio">
      <header className="story-studio-bar">
        <button type="button" className="icon-btn" aria-label="بستن" onClick={onCancel}><Icon name="back" /></button>
        <button type="button" className="icon-btn" aria-label="انتشار استوری" disabled={busy} onClick={() => void publish()}><Icon name="send" /></button>
      </header>
      <div
        ref={stageRef}
        className="story-stage"
        style={{ backgroundImage: `url(${url})` }}
        onPointerDown={(event) => {
          if (tool !== 'pen') return
          drawing.current = { color, points: [pointOf(event)] }
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
        <img src={url} alt="" />
        <canvas ref={drawRef} />
        {captions.map((caption) => (
          <span
            key={caption.id}
            className="story-caption"
            style={{ left: caption.x, top: caption.y, color: caption.color }}
          >
            {caption.text}
          </span>
        ))}
      </div>
      <footer className="story-tools">
        <div className="story-tool-row">
          <button type="button" className={tool === 'text' ? 'is-on' : ''} onClick={() => setTool('text')}>متن</button>
          <button type="button" className={tool === 'pen' ? 'is-on' : ''} onClick={() => setTool('pen')}>قلم</button>
          <button type="button" onClick={() => { setStrokes([]); paint([]) }}>پاک کردن خط</button>
        </div>
        <div className="story-colors">
          {inks.map((ink) => (
            <button key={ink} type="button" className={color === ink ? 'is-on' : ''} style={{ background: ink }} aria-label={ink} onClick={() => setColor(ink)} />
          ))}
        </div>
        {tool === 'text' && (
          <form
            className="story-text-row"
            onSubmit={(event) => {
              event.preventDefault()
              if (!draft.trim() || !stageRef.current) return
              const rect = stageRef.current.getBoundingClientRect()
              setCaptions((rows) => [...rows, { id: String(Date.now()), text: draft.trim(), x: rect.width / 2, y: rect.height / 2, color }])
              setDraft('')
            }}
          >
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="متن روی عکس، برای منشن @شناسه" />
            <button type="submit">بگذار</button>
          </form>
        )}
      </footer>
    </div>,
    document.body,
  )
}
