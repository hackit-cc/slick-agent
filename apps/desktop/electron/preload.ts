import { contextBridge, ipcRenderer, webFrame, webUtils } from 'electron'

// Which translucency the OS can back. Asked synchronously because the renderer
// needs it before its first paint, and answered by main because deciding it
// needs `os.release()` — a sandboxed preload may only require electron, events,
// timers and url, so importing node:os here throws before contextBridge runs
// and takes the ENTIRE bridge down with it (window.slickDesktop undefined =>
// "Desktop IPC bridge is unavailable"). No reply means no glass, which degrades
// to an ordinary opaque window rather than a page thinned over nothing.
const translucencySupport = ipcRenderer.sendSync('slick:translucency:support')
const hudWindowing = ipcRenderer.sendSync('slick:hud:windowing')
const hudNativeDrag = hudWindowing?.nativeDrag === true

contextBridge.exposeInMainWorld('slickDesktop', {
  glassSupported: translucencySupport?.glass === true,
  translucencySupported: translucencySupport?.translucency === true,
  getConnection: profile => ipcRenderer.invoke('slick:connection', profile),
  // Registry-scoped backend resolution: { connectionId, profile } → descriptor.
  getConnectionFor: payload => ipcRenderer.invoke('slick:connection:for', payload),
  getProfileRoutes: profiles => ipcRenderer.invoke('slick:plugin-profile-routes', profiles),
  revalidateConnection: () => ipcRenderer.invoke('slick:connection:revalidate'),
  touchBackend: profile => ipcRenderer.invoke('slick:backend:touch', profile),
  getGatewayWsUrl: profile => ipcRenderer.invoke('slick:gateway:ws-url', profile),
  // Registry-scoped fresh WS URL: { connectionId, profile } → result shape of
  // getGatewayWsUrl, minted against that connection's backend.
  getGatewayWsUrlFor: payload => ipcRenderer.invoke('slick:gateway:ws-url-for', payload),
  // Union agent roster across every registered connection.
  getAgentRoster: () => ipcRenderer.invoke('slick:agents:roster'),
  openSessionWindow: (sessionId, opts) => ipcRenderer.invoke('slick:window:openSession', sessionId, opts),
  openSessionInTerminal: (sessionId, opts) => ipcRenderer.invoke('slick:window:openInTerminal', sessionId, opts),
  openWindow: () => ipcRenderer.invoke('slick:window:openInstance'),
  openBrowserWindow: tabId => ipcRenderer.invoke('slick:window:openBrowser', tabId),
  onBrowserPopoutClosed: callback => {
    const listener = (_event, tabId) => callback(tabId)
    ipcRenderer.on('slick:browser-popout:closed', listener)

    return () => ipcRenderer.removeListener('slick:browser-popout:closed', listener)
  },
  claimAmbientCue: key => ipcRenderer.invoke('slick:ambient:claim', key),
  wakeIndicator: {
    getState: () => ipcRenderer.invoke('slick:wake-indicator:get'),
    setState: state => ipcRenderer.send('slick:wake-indicator:set', state),
    onState: callback => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('slick:wake-indicator:state', listener)

      return () => ipcRenderer.removeListener('slick:wake-indicator:state', listener)
    }
  },
  petOverlay: {
    // Main renderer → main process: window lifecycle + drag. `request` is
    // `{ bounds, screen }`; resolves with the screen bounds it actually used.
    open: request => ipcRenderer.invoke('slick:pet-overlay:open', request),
    close: () => ipcRenderer.invoke('slick:pet-overlay:close'),
    setBounds: bounds => ipcRenderer.send('slick:pet-overlay:set-bounds', bounds),
    setIgnoreMouse: ignore => ipcRenderer.send('slick:pet-overlay:ignore-mouse', ignore),
    // Flip the overlay focusable (and focus it) while the composer needs keys.
    setFocusable: focusable => ipcRenderer.send('slick:pet-overlay:set-focusable', focusable),
    // Main renderer → overlay (forwarded by main): push the latest pet state.
    pushState: payload => ipcRenderer.send('slick:pet-overlay:state', payload),
    // Overlay → main renderer (forwarded by main): pop back in / composer submit.
    control: payload => ipcRenderer.send('slick:pet-overlay:control', payload),
    // Overlay subscribes to state pushes.
    onState: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('slick:pet-overlay:state', listener)

      return () => ipcRenderer.removeListener('slick:pet-overlay:state', listener)
    },
    // Main renderer subscribes to overlay control messages.
    onControl: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('slick:pet-overlay:control', listener)

      return () => ipcRenderer.removeListener('slick:pet-overlay:control', listener)
    }
  },
  // HUD mode: the chrome-free floating chat. A full app renderer (own gateway)
  // sized as a floating bar, so it mounts the real composer. Main owns the
  // window; `onChanged` keeps every window's toggle truthful.
  hud: {
    nativeDrag: hudNativeDrag,
    windowing: {
      clientPlacement: hudWindowing?.clientPlacement !== false,
      controlDrag: hudWindowing?.controlDrag === true,
      nativeDrag: hudNativeDrag,
      workspaceTransfer: hudWindowing?.workspaceTransfer === true
    },
    open: request => ipcRenderer.invoke('slick:hud:open', request),
    close: () => ipcRenderer.invoke('slick:hud:close'),
    setIgnoreMouse: ignore => ipcRenderer.send('slick:hud:ignore-mouse', ignore),
    moveBy: delta => ipcRenderer.send('slick:hud:move-by', delta),
    setWorkspaceTransfer: transferring => ipcRenderer.send('slick:hud:workspace-transfer', transferring),
    setBounds: bounds => ipcRenderer.send('slick:hud:set-bounds', bounds),
    resetLayout: () => ipcRenderer.invoke('slick:hud:reset-layout'),
    // Whether the band covers the window below the bar. Main pairs it with the
    // user's translucency setting to decide the native frost (macOS vibrancy /
    // Windows 11 DWM backdrop) — see hudFrostFor.
    setFrost: showing => ipcRenderer.invoke('slick:hud:frost', showing),
    // The HUD tells main which session it is on; main hands that back to the
    // app window when the HUD closes, so the app can re-home onto it.
    setSession: sessionId => ipcRenderer.send('slick:hud:session', sessionId),
    onGoto: callback => {
      const listener = (_event, sessionId) => callback(sessionId)
      ipcRenderer.on('slick:hud:goto', listener)

      return () => ipcRenderer.removeListener('slick:hud:goto', listener)
    },
    onChanged: callback => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('slick:hud:changed', listener)

      return () => ipcRenderer.removeListener('slick:hud:changed', listener)
    },
    // Linux only, and silent elsewhere: where the cursor is, in page
    // coordinates, or null when it has left the window. Stands in for the
    // mousemove that `setIgnoreMouseEvents(true, { forward: true })` delivers on
    // macOS and Windows but not here.
    onCursor: callback => {
      const listener = (_event, point) => callback(point)
      ipcRenderer.on('slick:hud:cursor', listener)

      return () => ipcRenderer.removeListener('slick:hud:cursor', listener)
    },
    // Main's game-overlay watch: whether a fullscreen app (a game) is under
    // the HUD, so the renderer can step back to the low-opacity overlay
    // treatment while one owns the screen.
    onGameOverlay: callback => {
      const listener = (_event, state) => callback(state)
      ipcRenderer.on('slick:hud:game-overlay', listener)

      return () => ipcRenderer.removeListener('slick:hud:game-overlay', listener)
    }
  },
  // Quick Entry: the global-hotkey mini composer window. Main owns the OS
  // shortcut + the persisted preference; the quick window only captures text
  // and hands it back, and the primary renderer submits it through the normal
  // prompt path.
  quickEntry: {
    getSettings: () => ipcRenderer.invoke('slick:quick-entry:settings:get'),
    setSettings: patch => ipcRenderer.invoke('slick:quick-entry:settings:set', patch),
    submit: payload => ipcRenderer.send('slick:quick-entry:submit', payload),
    dismiss: () => ipcRenderer.send('slick:quick-entry:dismiss'),
    // Primary renderer → main → quick window: gateway connection state + the
    // recent-session options the target picker offers. Main caches the latest
    // payload so a freshly spawned quick window starts from truth.
    pushState: payload => ipcRenderer.send('slick:quick-entry:state', payload),
    // Quick window subscribes to those pushes.
    onState: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('slick:quick-entry:state', listener)

      return () => ipcRenderer.removeListener('slick:quick-entry:state', listener)
    },
    // Main → primary renderer: a submit captured by the quick window.
    onSubmit: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('slick:quick-entry:submit', listener)

      return () => ipcRenderer.removeListener('slick:quick-entry:submit', listener)
    },
    // Main → quick window: you were just summoned (reset draft + refocus).
    onShown: callback => {
      const listener = () => callback()
      ipcRenderer.on('slick:quick-entry:shown', listener)

      return () => ipcRenderer.removeListener('slick:quick-entry:shown', listener)
    }
  },
  getBootProgress: () => ipcRenderer.invoke('slick:boot-progress:get'),
  getConnectionConfig: profile => ipcRenderer.invoke('slick:connection-config:get', profile),
  saveConnectionConfig: payload => ipcRenderer.invoke('slick:connection-config:save', payload),
  applyConnectionConfig: payload => ipcRenderer.invoke('slick:connection-config:apply', payload),
  testConnectionConfig: payload => ipcRenderer.invoke('slick:connection-config:test', payload),
  // Opt-in OS-keychain encryption for stored gateway secrets (default off —
  // see secret-storage-policy.ts). get never touches the OS keychain.
  getSecretStorageEncryption: () => ipcRenderer.invoke('slick:secret-storage:get'),
  setSecretStorageEncryption: (on: boolean) => ipcRenderer.invoke('slick:secret-storage:set', on),
  // v2 multi-connection registry: named agent sources (local / remote / cloud / ssh).
  connections: {
    list: () => ipcRenderer.invoke('slick:connections:list'),
    save: payload => ipcRenderer.invoke('slick:connections:save', payload),
    remove: id => ipcRenderer.invoke('slick:connections:remove', id),
    setPrimary: id => ipcRenderer.invoke('slick:connections:set-primary', id),
    setLaunchMode: mode => ipcRenderer.invoke('slick:connections:set-launch-mode', mode),
    setLastUsed: id => ipcRenderer.invoke('slick:connections:set-last-used', id),
    test: id => ipcRenderer.invoke('slick:connections:test', id),
    updateManaged: id => ipcRenderer.invoke('slick:connections:update-managed', id),
    // Fan out `slick update` to every eligible registered connection.
    // Optional excludeIds skips rows the caller updates through another path.
    updateAll: options => ipcRenderer.invoke('slick:connections:update-all', options),
    // Registry lifecycle push (main → renderer): a connection was removed or
    // materially edited, so secondaries scoped to it must be disposed (and,
    // for edits, re-dialed at the new target).
    onChanged: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('slick:connections:changed', listener)

      return () => ipcRenderer.removeListener('slick:connections:changed', listener)
    }
  },
  sshConfigHosts: () => ipcRenderer.invoke('slick:ssh-config:hosts'),
  sshResolveHost: host => ipcRenderer.invoke('slick:ssh-config:resolve', host),
  probeConnectionConfig: remoteUrl => ipcRenderer.invoke('slick:connection-config:probe', remoteUrl),
  oauthLoginConnectionConfig: remoteUrl => ipcRenderer.invoke('slick:connection-config:oauth-login', remoteUrl),
  oauthLogoutConnectionConfig: remoteUrl => ipcRenderer.invoke('slick:connection-config:oauth-logout', remoteUrl),
  // Slick Cloud: one portal login powers discovery + silent per-agent sign-in
  // (cloud-auto-discovery Phase 3).
  cloud: {
    status: () => ipcRenderer.invoke('slick:cloud:status'),
    login: () => ipcRenderer.invoke('slick:cloud:login'),
    logout: () => ipcRenderer.invoke('slick:cloud:logout'),
    discover: org => ipcRenderer.invoke('slick:cloud:discover', org),
    agentSignIn: dashboardUrl => ipcRenderer.invoke('slick:cloud:agent-sign-in', dashboardUrl)
  },
  profile: {
    get: () => ipcRenderer.invoke('slick:profile:get'),
    remember: name => ipcRenderer.invoke('slick:profile:remember', name),
    set: name => ipcRenderer.invoke('slick:profile:set', name)
  },
  api: request => ipcRenderer.invoke('slick:api', request),
  notify: payload => ipcRenderer.invoke('slick:notify', payload),
  requestMicrophoneAccess: () => ipcRenderer.invoke('slick:requestMicrophoneAccess'),
  readWindowBelow: () => ipcRenderer.invoke('slick:window:readBelow'),
  readFileDataUrl: filePath => ipcRenderer.invoke('slick:readFileDataUrl', filePath),
  readFileDataUrlForAttach: filePath => ipcRenderer.invoke('slick:readFileDataUrlForAttach', filePath),
  dataUrlReadMax: {
    get: () => ipcRenderer.invoke('slick:data-url-read-max:get'),
    set: maxMb => ipcRenderer.invoke('slick:data-url-read-max:set', maxMb)
  },
  readFileText: filePath => ipcRenderer.invoke('slick:readFileText', filePath),
  readPluginSource: (filePath: string) => ipcRenderer.invoke('slick:readPluginSource', filePath),
  selectPaths: options => ipcRenderer.invoke('slick:selectPaths', options),
  selectSavePath: options => ipcRenderer.invoke('slick:selectSavePath', options),
  writeClipboard: text => ipcRenderer.invoke('slick:writeClipboard', text),
  readClipboard: () => ipcRenderer.invoke('slick:readClipboard'),
  saveGatewayFile: payload => ipcRenderer.invoke('slick:saveGatewayFile', payload),
  saveImageFromUrl: url => ipcRenderer.invoke('slick:saveImageFromUrl', url),
  contextMenuEdit: command => ipcRenderer.invoke('slick:context-menu:edit', command),
  contextMenuCopyImage: () => ipcRenderer.invoke('slick:context-menu:copy-image'),
  contextMenuSpellcheck: action => ipcRenderer.invoke('slick:context-menu:spellcheck', action),
  contextMenuGuestAddWord: payload => ipcRenderer.invoke('slick:context-menu:guest-add-word', payload),
  onContextMenuSpellcheck: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('slick:context-menu-spellcheck', listener)

    return () => ipcRenderer.removeListener('slick:context-menu-spellcheck', listener)
  },
  saveImageBuffer: (data, ext) => ipcRenderer.invoke('slick:saveImageBuffer', { data, ext }),
  saveClipboardImage: () => ipcRenderer.invoke('slick:saveClipboardImage'),
  getPathForFile: file => {
    try {
      return webUtils.getPathForFile(file) || ''
    } catch {
      return ''
    }
  },
  normalizePreviewTarget: (target, baseDir) => ipcRenderer.invoke('slick:normalizePreviewTarget', target, baseDir),
  watchPreviewFile: url => ipcRenderer.invoke('slick:watchPreviewFile', url),
  watchDirectory: dir => ipcRenderer.invoke('slick:watchDirectory', dir),
  stopPreviewFileWatch: id => ipcRenderer.invoke('slick:stopPreviewFileWatch', id),
  setActiveWork: payload => ipcRenderer.send('slick:active-work', payload),
  setTitleBarTheme: payload => ipcRenderer.send('slick:titlebar-theme', payload),
  setNativeTheme: mode => ipcRenderer.send('slick:native-theme', mode),
  setTranslucency: payload => ipcRenderer.send('slick:translucency', payload),
  setKeepAwake: on => ipcRenderer.send('slick:keep-awake', on),
  setDisableF12: blocked => ipcRenderer.send('slick:devtools:disable-f12', blocked),
  setPreviewShortcutActive: active => ipcRenderer.send('slick:previewShortcutActive', Boolean(active)),
  openExternal: url => ipcRenderer.invoke('slick:openExternal', url),
  openPreviewInBrowser: url => ipcRenderer.invoke('slick:openPreviewInBrowser', url),
  reachPreviewUrl: url => ipcRenderer.invoke('slick:preview:reach', url),
  setActiveConnectionRoute: route => ipcRenderer.send('slick:connection:active-route', route),
  fetchLinkTitle: url => ipcRenderer.invoke('slick:fetchLinkTitle', url),
  resolveFavicon: url => ipcRenderer.invoke('slick:resolveFavicon', url),
  sanitizeWorkspaceCwd: cwd => ipcRenderer.invoke('slick:workspace:sanitize', cwd),
  settings: {
    getDefaultProjectDir: () => ipcRenderer.invoke('slick:setting:defaultProjectDir:get'),
    setDefaultProjectDir: dir => ipcRenderer.invoke('slick:setting:defaultProjectDir:set', dir),
    pickDefaultProjectDir: () => ipcRenderer.invoke('slick:setting:defaultProjectDir:pick')
  },
  zoom: {
    // Current zoom of this window, as { level, percent }.
    get: () => ipcRenderer.invoke('slick:zoom:get'),
    // Synchronous zoom factor (1 = 100%). Coordinate math needs it in the
    // same tick as the event it converts, so no IPC round-trip here.
    factor: () => webFrame.getZoomFactor(),
    setPercent: percent => ipcRenderer.send('slick:zoom:set-percent', percent),
    // Fires on every zoom change, including the Ctrl/Cmd +/-/0 shortcuts,
    // so the settings UI can stay in sync with the keyboard.
    onChanged: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('slick:zoom:changed', listener)

      return () => ipcRenderer.removeListener('slick:zoom:changed', listener)
    }
  },
  revealLogs: () => ipcRenderer.invoke('slick:logs:reveal'),
  getRecentLogs: () => ipcRenderer.invoke('slick:logs:recent'),
  // Fire-and-forget: persists a renderer error-boundary catch (with component
  // stack) to desktop.log so crashes survive the window (#79428).
  reportRendererError: report => ipcRenderer.send('slick:logs:renderer-error', report),
  readDir: dirPath => ipcRenderer.invoke('slick:fs:readDir', dirPath),
  gitRoot: startPath => ipcRenderer.invoke('slick:fs:gitRoot', startPath),
  revealPath: targetPath => ipcRenderer.invoke('slick:fs:reveal', targetPath),
  openDir: dirPath => ipcRenderer.invoke('slick:fs:openDir', dirPath),
  desktopPluginsRoot: () => ipcRenderer.invoke('slick:fs:desktopPluginsRoot'),
  logsRoot: () => ipcRenderer.invoke('slick:fs:logsRoot'),
  agentPluginsRoot: () => ipcRenderer.invoke('slick:fs:agentPluginsRoot'),
  renamePath: (targetPath, newName) => ipcRenderer.invoke('slick:fs:rename', targetPath, newName),
  writeTextFile: (filePath, content) => ipcRenderer.invoke('slick:fs:writeText', filePath, content),
  trashPath: targetPath => ipcRenderer.invoke('slick:fs:trash', targetPath),
  git: {
    worktreeList: repoPath => ipcRenderer.invoke('slick:git:worktreeList', repoPath),
    worktreeAdd: (repoPath, options) => ipcRenderer.invoke('slick:git:worktreeAdd', repoPath, options),
    worktreeRemove: (repoPath, worktreePath, options) =>
      ipcRenderer.invoke('slick:git:worktreeRemove', repoPath, worktreePath, options),
    branchSwitch: (repoPath, branch) => ipcRenderer.invoke('slick:git:branchSwitch', repoPath, branch),
    branchList: repoPath => ipcRenderer.invoke('slick:git:branchList', repoPath),
    baseBranchList: repoPath => ipcRenderer.invoke('slick:git:baseBranchList', repoPath),
    repoStatus: repoPath => ipcRenderer.invoke('slick:git:repoStatus', repoPath),
    fileDiff: (repoPath, filePath) => ipcRenderer.invoke('slick:git:fileDiff', repoPath, filePath),
    scanRepos: (roots, options) => ipcRenderer.invoke('slick:git:scanRepos', roots, options),
    review: {
      list: (repoPath, scope, baseRef) => ipcRenderer.invoke('slick:git:review:list', repoPath, scope, baseRef),
      diff: (repoPath, filePath, scope, baseRef, staged) =>
        ipcRenderer.invoke('slick:git:review:diff', repoPath, filePath, scope, baseRef, staged),
      stage: (repoPath, filePath) => ipcRenderer.invoke('slick:git:review:stage', repoPath, filePath),
      unstage: (repoPath, filePath) => ipcRenderer.invoke('slick:git:review:unstage', repoPath, filePath),
      revert: (repoPath, filePath) => ipcRenderer.invoke('slick:git:review:revert', repoPath, filePath),
      revParse: (repoPath, ref) => ipcRenderer.invoke('slick:git:review:revParse', repoPath, ref),
      commit: (repoPath, message, push) => ipcRenderer.invoke('slick:git:review:commit', repoPath, message, push),
      commitContext: repoPath => ipcRenderer.invoke('slick:git:review:commitContext', repoPath),
      push: repoPath => ipcRenderer.invoke('slick:git:review:push', repoPath),
      shipInfo: repoPath => ipcRenderer.invoke('slick:git:review:shipInfo', repoPath),
      prList: (repoPath, branches, numbers) =>
        ipcRenderer.invoke('slick:git:review:prList', repoPath, branches, numbers),
      fetchPrComment: (repoPath, url) => ipcRenderer.invoke('slick:git:review:fetchPrComment', repoPath, url),
      createPr: repoPath => ipcRenderer.invoke('slick:git:review:createPr', repoPath)
    }
  },
  terminal: {
    cwd: id => ipcRenderer.invoke('slick:terminal:cwd', id),
    dispose: id => ipcRenderer.invoke('slick:terminal:dispose', id),
    resize: (id, size) => ipcRenderer.invoke('slick:terminal:resize', id, size),
    start: options => ipcRenderer.invoke('slick:terminal:start', options),
    write: (id, data) => ipcRenderer.invoke('slick:terminal:write', id, data),
    onData: (id, callback) => {
      const channel = `slick:terminal:${id}:data`
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on(channel, listener)

      return () => ipcRenderer.removeListener(channel, listener)
    },
    onExit: (id, callback) => {
      const channel = `slick:terminal:${id}:exit`
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on(channel, listener)

      return () => ipcRenderer.removeListener(channel, listener)
    }
  },
  onClosePreviewRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('slick:close-preview-requested', listener)

    return () => ipcRenderer.removeListener('slick:close-preview-requested', listener)
  },
  onPreviewNav: callback => {
    const listener = (_event, command) => callback(command)
    ipcRenderer.on('slick:preview-nav', listener)

    return () => ipcRenderer.removeListener('slick:preview-nav', listener)
  },
  onOpenFolderRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('slick:open-folder-requested', listener)

    return () => ipcRenderer.removeListener('slick:open-folder-requested', listener)
  },
  onOpenUpdatesRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('slick:open-updates', listener)

    return () => ipcRenderer.removeListener('slick:open-updates', listener)
  },
  onDeepLink: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('slick:deep-link', listener)

    return () => ipcRenderer.removeListener('slick:deep-link', listener)
  },
  signalDeepLinkReady: () => ipcRenderer.invoke('slick:deep-link-ready'),
  probePluginRepo: payload => ipcRenderer.invoke('slick:plugin:probe', payload),
  installDesktopPlugin: payload => ipcRenderer.invoke('slick:plugin:installDesktop', payload),
  onWindowStateChanged: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('slick:window-state-changed', listener)

    return () => ipcRenderer.removeListener('slick:window-state-changed', listener)
  },
  onFocusSession: callback => {
    const listener = (_event, sessionId) => callback(sessionId)
    ipcRenderer.on('slick:focus-session', listener)

    return () => ipcRenderer.removeListener('slick:focus-session', listener)
  },
  onNotificationAction: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('slick:notification-action', listener)

    return () => ipcRenderer.removeListener('slick:notification-action', listener)
  },
  onNotificationActivate: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('slick:notification-activate', listener)

    return () => ipcRenderer.removeListener('slick:notification-activate', listener)
  },
  onPreviewFileChanged: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('slick:preview-file-changed', listener)

    return () => ipcRenderer.removeListener('slick:preview-file-changed', listener)
  },
  onBackendExit: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('slick:backend-exit', listener)

    return () => ipcRenderer.removeListener('slick:backend-exit', listener)
  },
  // Soft gateway-mode apply finished tearing down the primary backend. Renderer
  // should wipe session lists + re-dial without a window reload.
  onConnectionApplied: callback => {
    const listener = () => callback()
    ipcRenderer.on('slick:connection:applied', listener)

    return () => ipcRenderer.removeListener('slick:connection:applied', listener)
  },
  onPowerResume: callback => {
    const listener = () => callback()
    ipcRenderer.on('slick:power-resume', listener)

    return () => ipcRenderer.removeListener('slick:power-resume', listener)
  },
  // AC ↔ battery transitions; renderers slow their backstop polls on battery.
  getOnBattery: () => ipcRenderer.invoke('slick:power-battery:get'),
  onBatteryChanged: callback => {
    const listener = (_event, onBattery) => callback(Boolean(onBattery))
    ipcRenderer.on('slick:power-battery', listener)

    return () => ipcRenderer.removeListener('slick:power-battery', listener)
  },
  onBootProgress: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('slick:boot-progress', listener)

    return () => ipcRenderer.removeListener('slick:boot-progress', listener)
  },
  // First-launch bootstrap progress -- emitted by the install.ps1 stage
  // runner in main.ts (apps/desktop/electron/bootstrap-runner.ts).
  // Renderer's install overlay subscribes to live events and queries the
  // current snapshot via getBootstrapState() to recover after a devtools
  // reload mid-bootstrap.
  getBootstrapState: () => ipcRenderer.invoke('slick:bootstrap:get'),
  continueBootstrapLocal: () => ipcRenderer.invoke('slick:bootstrap:continue-local'),
  resetBootstrap: () => ipcRenderer.invoke('slick:bootstrap:reset'),
  repairBootstrap: () => ipcRenderer.invoke('slick:bootstrap:repair'),
  cancelBootstrap: () => ipcRenderer.invoke('slick:bootstrap:cancel'),
  onBootstrapEvent: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('slick:bootstrap:event', listener)

    return () => ipcRenderer.removeListener('slick:bootstrap:event', listener)
  },
  getVersion: () => ipcRenderer.invoke('slick:version'),
  getRemoteDisplayReason: () => ipcRenderer.invoke('slick:get-remote-display-reason'),
  uninstall: {
    summary: () => ipcRenderer.invoke('slick:uninstall:summary'),
    run: mode => ipcRenderer.invoke('slick:uninstall:run', { mode })
  },
  updates: {
    check: () => ipcRenderer.invoke('slick:updates:check'),
    apply: opts => ipcRenderer.invoke('slick:updates:apply', opts),
    getBranch: () => ipcRenderer.invoke('slick:updates:branch:get'),
    setBranch: name => ipcRenderer.invoke('slick:updates:branch:set', name),
    onProgress: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('slick:updates:progress', listener)

      return () => ipcRenderer.removeListener('slick:updates:progress', listener)
    }
  },
  themes: {
    fetchMarketplace: id => ipcRenderer.invoke('slick:vscode-theme:fetch', id),
    searchMarketplace: query => ipcRenderer.invoke('slick:vscode-theme:search', query)
  },
  // Find-in-page (Ctrl/Cmd+F): delegates to Electron's
  // webContents.findInPage on the IPC sender's window so a Cmd+F pressed
  // in a secondary session window searches THAT window, not the primary.
  // `onFoundInPage` returns the unsubscribe fn; the renderer wires it via
  // `initFindInPageListener` in store/find-in-page.ts and tears it down
  // when the FindBar unmounts.
  findInPage: (query, options) => ipcRenderer.invoke('slick:find-in-page', query, options),
  stopFindInPage: () => ipcRenderer.invoke('slick:stop-find-in-page'),
  onFoundInPage: callback => {
    const listener = (_event, result) => callback(result)
    ipcRenderer.on('slick:found-in-page', listener)

    return () => ipcRenderer.removeListener('slick:found-in-page', listener)
  },
  // Main-process `before-input-event` forwards Ctrl/Cmd+F here so renderer
  // can open the FindBar even when the GTK compositor has already grabbed
  // the chord at the windowing layer (#81727).
  onOpenFindBarRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('slick:open-find-bar', listener)

    return () => ipcRenderer.removeListener('slick:open-find-bar', listener)
  }
})
