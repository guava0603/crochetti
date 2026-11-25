/**
 * Share PNG blobs on native (Capacitor) by writing real .png files to cache,
 * then opening the system share sheet with file:// URIs so iOS offers "Save Image".
 */

import { Capacitor } from '@capacitor/core'

const EXPORT_CACHE_DIR = 'corchetti-export'

export function isShareCancelled(error) {
  if (!error) return false
  if (error?.name === 'AbortError') return true
  const code = String(error?.code ?? '').toLowerCase()
  if (code.includes('cancel')) return true
  const msg = String(error?.message ?? '').toLowerCase()
  return msg.includes('cancel') || msg.includes('dismiss') || msg.includes('abort')
}

export function safeExportFilename(name) {
  const raw = String(name || 'image.png').trim() || 'image.png'
  const sanitized = raw.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '')
  return sanitized.toLowerCase().endsWith('.png') ? sanitized : `${sanitized || 'image'}.png`
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error || new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}

function uniqueExportPath(filename, index) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return `${EXPORT_CACHE_DIR}/${stamp}-${index}-${safeExportFilename(filename)}`
}

/**
 * @param {{ items: Array<{ blob: Blob, filename?: string }>, shareTitle?: string }} options
 * @returns {Promise<'share'|'cancelled'>}
 */
export async function sharePngBlobsViaNative({ items = [], shareTitle } = {}) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('sharePngBlobsViaNative: not a native platform')
  }

  const normalized = (Array.isArray(items) ? items : [])
    .map((it) => ({
      blob: it?.blob ?? null,
      filename: safeExportFilename(it?.filename)
    }))
    .filter((it) => it.blob)

  if (!normalized.length) {
    throw new Error('sharePngBlobsViaNative: missing blobs')
  }

  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')

  const written = []
  const fileUris = []

  try {
    for (let i = 0; i < normalized.length; i += 1) {
      const { blob, filename } = normalized[i]
      const path = uniqueExportPath(filename, i)
      const data = await blobToBase64(blob)

      await Filesystem.writeFile({
        path,
        data,
        directory: Directory.Cache
      })

      written.push({ path, directory: Directory.Cache })

      const { uri } = await Filesystem.getUri({
        path,
        directory: Directory.Cache
      })
      fileUris.push(uri)
    }

    const title = String(shareTitle || normalized[0]?.filename || 'image.png').trim()
    await Share.share({
      title: title || undefined,
      files: fileUris
    })

    return 'share'
  } catch (error) {
    if (isShareCancelled(error)) return 'cancelled'
    throw error
  } finally {
    for (const entry of written) {
      try {
        await Filesystem.deleteFile(entry)
      } catch {
        // Best-effort cache cleanup.
      }
    }
  }
}
