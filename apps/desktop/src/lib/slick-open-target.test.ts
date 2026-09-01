import { describe, expect, it } from 'vitest'

import {
  normalizeSlickOpenString,
  pathFromSlickDeepLink,
  pathFromOpenDeepLink,
  resolveSlickOpenPath
} from './slick-open-target'

describe('normalizeSlickOpenString', () => {
  it('accepts hash-router paths and strips a leading hash', () => {
    expect(normalizeSlickOpenString('/index-network/intent/1')).toBe('/index-network/intent/1')
    expect(normalizeSlickOpenString('#/index-network/intent/1')).toBe('/index-network/intent/1')
  })

  it('maps plugin-scoped slick:// deep links to the same path', () => {
    expect(normalizeSlickOpenString('slick://index-network/intent/1')).toBe('/index-network/intent/1')
    expect(normalizeSlickOpenString('slick://index-network/intent/1?focus=true')).toBe(
      '/index-network/intent/1?focus=true'
    )
  })

  it('maps slick://open/… deep links by stripping the open host', () => {
    expect(normalizeSlickOpenString('slick://open/index-network/intent/1')).toBe('/index-network/intent/1')
    expect(normalizeSlickOpenString('slick://open/settings/plugins')).toBe('/settings/plugins')
  })

  it('rejects reserved slick kinds and unsafe paths', () => {
    expect(normalizeSlickOpenString('slick://blueprint/morning-brief')).toBeNull()
    expect(normalizeSlickOpenString('slick://plugin/install')).toBeNull()
    expect(normalizeSlickOpenString('https://example.com/x')).toBeNull()
    expect(normalizeSlickOpenString('/../etc/passwd')).toBeNull()
    expect(normalizeSlickOpenString('index-network')).toBeNull()
  })
})

describe('resolveSlickOpenPath', () => {
  it('merges structured path + params', () => {
    expect(resolveSlickOpenPath({ path: '/index-network/intent/1', params: { focus: 'true' } })).toBe(
      '/index-network/intent/1?focus=true'
    )
  })

  it('resolves href the same as a bare string', () => {
    expect(resolveSlickOpenPath({ href: 'slick://index-network/intent/1' })).toBe('/index-network/intent/1')
  })
})

describe('pathFromSlickDeepLink', () => {
  it('builds the navigate path from a plugin-scoped deep-link payload', () => {
    expect(pathFromSlickDeepLink('index-network', 'intent/1')).toBe('/index-network/intent/1')
  })

  it('builds the navigate path from slick://open/… payloads', () => {
    expect(pathFromOpenDeepLink('index-network/intent/1')).toBe('/index-network/intent/1')
    expect(pathFromSlickDeepLink('open', 'agent/42')).toBe('/agent/42')
  })

  it('ignores reserved kinds', () => {
    expect(pathFromSlickDeepLink('blueprint', 'morning-brief')).toBeNull()
    expect(pathFromSlickDeepLink('plugin', 'install')).toBeNull()
  })
})
