# Slick CLI Reference

Live sources when anything looks stale: `slick --help`, `slick <command> --help`,
https://slick-agent.hackit.cc/docs/reference/cli-commands

### Global Flags

```
slick [flags] [command]        (no subcommand = interactive chat)

  --version, -V             Show version
  -z, --oneshot PROMPT      One-shot: print ONLY the final response (for scripts/pipes)
  -m MODEL  --provider P    Model/provider override for this invocation
  -t, --toolsets LIST       Comma-separated toolsets for this invocation
  --resume, -r SESSION      Resume session by ID or title
  --continue, -c [NAME]     Resume by name, or most recent session
  --worktree, -w            Isolated git worktree mode (parallel agents)
  --skills, -s SKILL        Preload skills (comma-separate or repeat)
  --profile, -p NAME        Use a named profile
  --yolo                    Skip dangerous command approval
  --tui / --cli             Force the Ink TUI / classic REPL
  --ignore-rules            Skip AGENTS.md/SOUL.md/memory/skill injection
  --safe-mode               Disable ALL customizations (troubleshooting)
  --pass-session-id         Include session ID in system prompt
```

### Chat

```
slick chat [flags]
  -q, --query TEXT          Single query, non-interactive
  --image PATH              Attach a local image to a single query
  -Q, --quiet               Suppress banner, spinner, tool previews
  --checkpoints             Enable filesystem checkpoints (/rollback)
  --max-turns N             Cap tool-calling iterations
  --source TAG              Session source tag (default: cli)
```
(plus the global flags above)

### Configuration

```
slick setup [section]      Wizard (model|tts|terminal|gateway|tools|agent)
slick model                Interactive model/provider picker
slick fallback [add|remove|list]  Fallback provider chain
slick config [show|edit|get|set|unset|path|env-path|check|migrate]
slick login / logout       OAuth sign-in / clear stored auth
slick doctor [--fix]       Check dependencies and config
slick status [--all]       Component status
```

### Tools & Skills

```
slick tools [list|enable NAME|disable NAME]   Per-platform toolsets (curses UI with no args)

slick skills list|browse|search QUERY|inspect ID
slick skills install ID    Hub identifier OR a direct https://…/SKILL.md URL
slick skills config        Enable/disable skills per platform
slick skills check|update|uninstall|publish PATH
slick skills tap add REPO  Add a GitHub repo as a skill source
slick bundles              Skill bundles (one /<name> alias loads several skills)
```

### MCP Servers

```
slick mcp add NAME (--url or --command) | remove | list | test NAME
slick mcp catalog | install NAME     Curated catalog install
slick mcp configure NAME             Toggle tool selection
slick mcp serve                      Run Slick as an MCP server
```
Details (transport, tool discovery, catalog): `references/native-mcp.md`.

### Gateway (Messaging Platforms)

```
slick gateway run|install|start|stop|restart|status|setup
```

20+ platforms: Telegram, Discord, Slack, WhatsApp (Baileys + Business Cloud API), iMessage (Photon — `slick photon setup`), Signal, Email, SMS, Matrix, Mattermost, Teams, LINE, SimpleX, ntfy, Google Chat, Home Assistant, DingTalk, Feishu, WeCom, Weixin, API Server, Webhooks. Open WebUI connects via the API Server adapter. Most adapters ship under `plugins/platforms/`.
Docs: https://slick-agent.hackit.cc/docs/user-guide/messaging/

### Sessions

```
slick sessions list|browse|rename ID TITLE|delete ID|export OUT|prune|stats
```

### Cron / Webhooks

```
slick cron list|create SCHED|edit ID|pause|resume|run ID|remove|status
    Schedules: '30m', 'every 2h', '0 9 * * *', ISO timestamp
slick webhook subscribe NAME|list|remove NAME|test NAME
```
Webhook payloads/routes: `references/webhooks.md`.

### Profiles

```
slick profile list|create NAME (--clone|--clone-all|--clone-from)|use|show|delete
slick profile rename A B | alias NAME | export NAME | import FILE
```

### Credentials & Pools

```
slick auth                 Interactive credential manager
slick auth add [PROVIDER]  Add OAuth or API-key credential (hackit, openai-codex, qwen-oauth, …)
slick auth list|remove P IDX|reset PROVIDER|status
```
Multiple credentials per provider form a pool that rotates automatically and skips exhausted keys.

### Other

```
slick desktop / gui        Native desktop app
slick dashboard            Web admin panel + embedded chat (--stop / --status)
slick proxy                OpenAI-compatible local proxy backed by an OAuth provider
slick portal               Quick setup / sign in via Hackit Portal
slick kanban <verb>        Multi-agent work-queue board
slick project              Named multi-folder workspaces
slick skin list|use|set    Switch/tweak skins (see references/themes.md)
slick pets <verb>          Pet mascots (see references/petdex.md)
slick memory setup|status|off|reset   Memory provider
slick secrets bitwarden|onepassword   External secret stores
slick moa                  Mixture-of-Agents slots
slick hooks / security / backup / import / checkpoints / console
slick logs [-f] [errors]   View agent/error logs
slick send                 One-off message through a gateway platform
slick pairing / plugins / insights / journey / computer-use
slick acp                  ACP server (IDE integration)
slick completion bash|zsh|fish
slick update / uninstall / claw migrate
```

Plugin- and provider-supplied subcommands (e.g. `slick photon setup`) only appear once their plugin is installed/active.

### Where to Find Things

| Looking for... | Location |
|---|---|
| Config options | `slick config edit` · [Configuration docs](https://slick-agent.hackit.cc/docs/user-guide/configuration) |
| Tools / toolsets | `slick tools list` · [Tools reference](https://slick-agent.hackit.cc/docs/reference/tools-reference) |
| Skills catalog | `slick skills browse` · [Skills catalog](https://slick-agent.hackit.cc/docs/reference/skills-catalog) |
| Provider setup | `slick model` · [Providers guide](https://slick-agent.hackit.cc/docs/integrations/providers) |
| Env variables | `slick config env-path` · [Env vars reference](https://slick-agent.hackit.cc/docs/reference/environment-variables) |
| Gateway logs | `~/.slick/logs/gateway.log` (or `slick logs`) |
| Sessions | `slick sessions browse` (reads state.db) |
