/**
 * after-pack.mjs — electron-builder afterPack hook.
 *
 * Stamps the Slick icon + identity onto the packed Windows Slick.exe via
 * rcedit (delegated to set-exe-identity.mjs). This runs for EVERY packed build
 * — first install, `slick desktop`, the installer's --update rebuild, and a
 * dev's manual `npm run pack` — so the branded exe can never silently revert
 * to the stock "Electron" icon/name (the bug when the stamp lived only in
 * install.ps1, which the update path doesn't use).
 *
 * Windows-only: rcedit edits PE resources, irrelevant on macOS/Linux where the
 * app identity comes from the bundle Info.plist / desktop entry. Best-effort:
 * a stamp failure must never fail an otherwise-good build (worst case is the
 * stock icon, not a broken app), so we log and resolve rather than throw.
 *
 * SIGNED BUILDS STAND DOWN
 * -----------------------
 * rcedit rewrites PE resources. Doing that to an exe that has already been
 * Authenticode-signed silently invalidates the signature — the file still
 * runs, but the trust chain it was signed for is gone, which is worse than
 * shipping unsigned because it looks signed until a verifier checks it.
 *
 * When a build actually has a certificate it sets SLICK_WIN_EB_EDITS_EXE=1 and
 * flips build.win.signAndEditExecutable back to true, which makes
 * electron-builder perform BOTH the rcedit pass and the signtool pass itself,
 * in that order. That covers the same icon/version branding this hook exists
 * to restore, so the hook has nothing left to add and must not touch the exe
 * afterwards. See set-exe-identity.mjs for why the default is false.
 *
 * electron-builder passes a context with:
 *   - electronPlatformName: 'win32' | 'darwin' | 'linux'
 *   - appOutDir:            the unpacked app directory for this target
 *   - packager.appInfo.productFilename: the exe basename (e.g. 'Slick')
 */

import path from 'node:path'

import { stampExeIdentity } from './set-exe-identity.mjs'

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return
  }

  // electron-builder owns the icon/version edit AND the signature on this
  // build; re-editing here would strip the signature it just applied.
  if (process.env.SLICK_WIN_EB_EDITS_EXE === '1') {
    console.log('[after-pack] signed build — electron-builder stamped the exe, skipping rcedit')
    return
  }

  const productName = context.packager?.appInfo?.productFilename || 'Slick'
  const exe = path.join(context.appOutDir, `${productName}.exe`)
  const desktopRoot = path.resolve(import.meta.dirname, '..')

  try {
    await stampExeIdentity(exe, desktopRoot)
  } catch (err) {
    // Never fail the build over a cosmetic stamp.
    console.warn(`[after-pack] exe identity stamp failed (${err.message}); Slick.exe keeps the stock Electron icon`)
  }
}
