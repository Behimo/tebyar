import { useCallback, useEffect, useRef } from 'react'
import { api } from './api'

export type ImpressionSource = 'feed' | 'explore' | 'profile' | 'detail'

type QueuedImpression = {
  post_id: number
  source: ImpressionSource
}

const sentThisSession = new Set<string>()
let queue: QueuedImpression[] = []
let flushTimer: number | null = null
let listenersAttached = false

type ObserverTarget = {
  postId: number
  source: ImpressionSource
  dwellTimer: number | null
}

const targets = new WeakMap<Element, ObserverTarget>()
let sharedObserver: IntersectionObserver | null = null

function flush(keepalive = false) {
  if (queue.length === 0) return
  const batch = queue.splice(0, 50)
  if (keepalive) {
    const token = localStorage.getItem('tebyar_token')
    const base = import.meta.env.VITE_API_URL || ''
    if (!token) return
    try {
      void fetch(`${base}/api/v1/impressions`, {
        method: 'POST',
        keepalive: true,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: batch }),
      })
    } catch {
      /* ignore network errors on unload */
    }
    return
  }
  void api('/impressions', {
    method: 'POST',
    body: JSON.stringify({ items: batch }),
  }).catch(() => undefined)
}

function scheduleFlush() {
  if (flushTimer != null) return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    flush(false)
    if (queue.length > 0) scheduleFlush()
  }, 5000)
}

function enqueue(postId: number, source: ImpressionSource) {
  const key = `${postId}:${source}`
  if (sentThisSession.has(key)) return
  sentThisSession.add(key)
  queue.push({ post_id: postId, source })
  if (queue.length >= 25) {
    flush(false)
  } else {
    scheduleFlush()
  }
}

function ensureObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null
  if (!listenersAttached) {
    listenersAttached = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush(true)
    })
    window.addEventListener('pagehide', () => flush(true))
  }
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const meta = targets.get(entry.target)
        if (!meta) continue
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (meta.dwellTimer == null) {
            meta.dwellTimer = window.setTimeout(() => {
              meta.dwellTimer = null
              enqueue(meta.postId, meta.source)
              sharedObserver?.unobserve(entry.target)
            }, 600)
          }
        } else if (meta.dwellTimer != null) {
          window.clearTimeout(meta.dwellTimer)
          meta.dwellTimer = null
        }
      }
    }, { threshold: 0.5 })
  }
  return sharedObserver
}

export function recordDetailView(postId: number) {
  enqueue(postId, 'detail')
}

export function useImpression(postId: number, source: ImpressionSource, enabled = true) {
  const nodeRef = useRef<Element | null>(null)

  const setRef = useCallback((node: Element | null) => {
    const observer = ensureObserver()
    if (nodeRef.current && observer) {
      const prevMeta = targets.get(nodeRef.current)
      if (prevMeta?.dwellTimer != null) window.clearTimeout(prevMeta.dwellTimer)
      observer.unobserve(nodeRef.current)
      targets.delete(nodeRef.current)
    }
    nodeRef.current = node
    if (node && enabled && observer && postId > 0) {
      targets.set(node, { postId, source, dwellTimer: null })
      observer.observe(node)
    }
  }, [postId, source, enabled])

  useEffect(() => () => {
    const node = nodeRef.current
    if (node && sharedObserver) {
      const meta = targets.get(node)
      if (meta?.dwellTimer != null) window.clearTimeout(meta.dwellTimer)
      sharedObserver.unobserve(node)
      targets.delete(node)
    }
  }, [])

  return setRef
}
