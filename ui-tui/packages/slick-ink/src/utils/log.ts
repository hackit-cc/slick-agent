export function logError(error: unknown): void {
  if (!process.env.SLICK_INK_DEBUG_ERRORS) {
    return
  }

  console.error(error)
}
