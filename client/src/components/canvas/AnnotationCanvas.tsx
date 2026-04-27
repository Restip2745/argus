import { useRef, useEffect } from 'react'
import { useAppStore } from '../../store'
import type { AnnotationStroke } from '../../types'

const STROKE_COLOR = '#00c8ff'
const STROKE_WIDTH = 2

export function AnnotationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const currentPoints = useRef<[number, number][]>([])
  const addStroke = useAppStore((s) => s.addStroke)
  const strokes = useAppStore((s) => s.strokes)

  // Redraw all strokes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(stroke.points[0][0], stroke.points[0][1])
      for (const [x, y] of stroke.points.slice(1)) ctx.lineTo(x, y)
      ctx.stroke()
    }
  }, [strokes])

  const getPos = (e: React.MouseEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  const onMouseDown = (e: React.MouseEvent) => {
    drawing.current = true
    currentPoints.current = [getPos(e)]
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!drawing.current) return
    const pos = getPos(e)
    currentPoints.current.push(pos)

    // Live draw current stroke
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pts = currentPoints.current
    if (pts.length < 2) return
    ctx.beginPath()
    ctx.strokeStyle = STROKE_COLOR
    ctx.lineWidth = STROKE_WIDTH
    ctx.lineCap = 'round'
    ctx.moveTo(pts[pts.length - 2][0], pts[pts.length - 2][1])
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1])
    ctx.stroke()
  }

  const onMouseUp = () => {
    if (!drawing.current) return
    drawing.current = false

    const stroke: AnnotationStroke = {
      id: crypto.randomUUID(),
      sessionId: 'local',
      points: currentPoints.current,
      color: STROKE_COLOR,
      width: STROKE_WIDTH,
      createdAt: new Date().toISOString(),
    }
    addStroke(stroke)
    currentPoints.current = []
  }

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      className="absolute inset-0 z-30 cursor-crosshair"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    />
  )
}
