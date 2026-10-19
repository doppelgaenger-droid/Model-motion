/** Browser-side, best-effort thumbnails. Original image bytes are never altered. */
export async function createImageThumbnail(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return null;
  if (typeof createImageBitmap !== "function") return null;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (!longest) return null;
    const ratio = Math.min(1, 480 / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", 0.76));
  } catch {
    return null; // Preserve normal uploads on unsupported formats or devices.
  } finally {
    bitmap?.close();
  }
}
