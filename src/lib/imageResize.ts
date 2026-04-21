/**
 * Client-side resize for vision uploads: long edge cap + JPEG re-encode to shrink payload.
 */

const DEFAULT_MAX_LONG_EDGE = 1600
const DEFAULT_JPEG_QUALITY = 0.85

export async function resizeImageFileToJpeg(
  file: File,
  opts?: { maxLongEdge?: number; quality?: number }
): Promise<Blob> {
  const maxLongEdge = opts?.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE
  const quality = opts?.quality ?? DEFAULT_JPEG_QUALITY

  const bitmap = await createImageBitmap(file)
  try {
    let { width, height } = bitmap
    const long = Math.max(width, height)
    if (long > maxLongEdge) {
      const scale = maxLongEdge / long
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
    )
    if (!blob) throw new Error("JPEG encode failed")
    return blob
  } finally {
    bitmap.close()
  }
}
