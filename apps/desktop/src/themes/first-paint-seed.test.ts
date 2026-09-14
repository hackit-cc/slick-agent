// @vitest-environment node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { BUILTIN_THEMES, DEFAULT_SKIN_NAME } from './presets'

// applyTheme() overwrites every --dt-* inline once the skin mounts, so the
// static seed in styles.css decides what the window paints in for exactly one
// frame at launch. In the main window that frame is hidden behind startup; in a
// freshly opened one — the compact new-session pop-out — it is the first thing
// anyone sees. A seed naming a different face than the default skin resolves to
// therefore shows as the window painting in the old font and then reflowing.
//
// This has already gone wrong once. The accent seeds were moved onto `hackit`'s
// black, but --dt-font-sans was left on the bare system stack, so the app
// painted Segoe UI and swapped to the bundled face a frame later. Pin the two
// together so they cannot drift apart again.

const HERE = dirname(fileURLToPath(import.meta.url))
const STYLES = join(HERE, '..', 'styles.css')

/** The same stack is spelled differently in CSS and TS — single vs double
 *  quotes, and wrapped across lines. Compare what the browser would resolve,
 *  not the spelling. */
function normalizeStack(stack: string): string {
  return stack
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function seededFontSans(css: string): string {
  const declarations = css.match(/--dt-font-sans:\s*[^;]+;/g) ?? []
  // More than one and this test would be pinning whichever happens to be first.
  expect(declarations, 'expected exactly one --dt-font-sans seed in styles.css').toHaveLength(1)

  return normalizeStack(declarations[0].replace(/^--dt-font-sans:/, '').replace(/;$/, ''))
}

describe('first-paint font seed', () => {
  it('matches the stack the default skin resolves to', () => {
    const expected = BUILTIN_THEMES[DEFAULT_SKIN_NAME]?.typography?.fontSans
    expect(expected, `${DEFAULT_SKIN_NAME} declares no fontSans`).toBeTruthy()

    expect(seededFontSans(readFileSync(STYLES, 'utf8'))).toBe(normalizeStack(expected!))
  })

  it('names the bundled face first, so the first frame is not a system fallback', () => {
    // Safe to seed only because the face ships with the app (@font-face in
    // styles.css). A face fetched over the network cannot be in the seed —
    // it does not exist yet on the frame the seed governs.
    expect(seededFontSans(readFileSync(STYLES, 'utf8'))).toMatch(/^Google Sans Flex,/)
  })
})
