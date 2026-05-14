import type { Server, Socket } from 'socket.io'
import type { ClientEvent } from '../types'
import { logger } from '../utils/logger'

interface AnnotationStroke {
  id: string
  sessionId: string
  points: [number, number][]
  color: string
  width: number
  createdAt: string
}

export function initSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    logger.debug('[Socket]', `Client connected: ${socket.id}`)

    // Relay annotation strokes to all other clients (collaborative canvas)
    socket.on('stroke', (stroke: AnnotationStroke) => {
      socket.broadcast.emit('stroke', stroke)
    })

    socket.on('clear_strokes', () => {
      socket.broadcast.emit('clear_strokes')
    })

    socket.on('disconnect', () => {
      logger.debug('[Socket]', `Client disconnected: ${socket.id}`)
    })
  })
}

export function broadcastEvent(io: Server, event: ClientEvent): void {
  io.emit('new_event', event)
}

export interface IntelBrief {
  id: string
  summary: string
  generatedAt: string
  topEventIds: string[]
}

export function broadcastBrief(io: Server, brief: IntelBrief): void {
  io.emit('intel_brief', brief)
}
