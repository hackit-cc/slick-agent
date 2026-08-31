---
title: "Sophos Tool Gateway"
description: "One subscription, every tool. Web search, image generation, TTS, and cloud browsers — all routed through Sophos Portal with no extra API keys."
sidebar_label: "Tool Gateway"
sidebar_position: 2
---

# Sophos Tool Gateway

**One subscription. Every tool built in.**

The Tool Gateway is included with every paid [Sophos Portal](https://portal.sophostechne.com) subscription. It routes Slick' tool calls — web search, image generation, text-to-speech, and cloud browser automation — through infrastructure Sophos already runs, so you don't have to sign up with Firecrawl, FAL, OpenAI, Browser Use, or anyone else just to make your agent useful.

<div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1.5rem 0'}}>
  <a href="https://portal.sophostechne.com/manage-subscription" style={{background: 'var(--ifm-color-primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold'}}>Start or manage subscription →</a>
</div>

## What's included

| | Tool | What you get |
|---|---|---|
| 🔍 | **Web search & extract** | Agent-grade web search and full-page extraction via Firecrawl. No rate limits to worry about — the gateway handles scaling. |
| 🎨 | **Image generation** | Nine models under one endpoint: **FLUX 2 Klein 9B**, **FLUX 2 Pro**, **Z-Image Turbo**, **Nano Banana Pro** (Gemini 3 Pro Image), **GPT Image 1.5**, **GPT Image 2**, **Ideogram V3**, **Recraft V4 Pro**, **Qwen Image**. Pick per-generation with a flag, or let Slick default to FLUX 2 Klein. |
| 🔊 | **Text-to-speech** | OpenAI TTS voices wired into the `text_to_speech` tool. Drop voice notes into Telegram, generate audio for pipelines, narrate anything. |
| 🌐 | **Cloud browser automation** | Headless Chromium sessions via Browser Use. `browser_navigate`, `browser_click`, `browser_type`, `browser_vision` — all the agent-driving primitives, no Browserbase account required. |

All four are pay-as-you-use billed against your Sophos subscription. Use any combination — run the gateway for web and images while keeping your own ElevenLabs key for TTS, or route everything through Sophos.

## Why it's here

Building an agent that can actually *do things* means stitching together 5+ API subscriptions — each with their own signup, rate limits, billing, and quirks. The gateway collapses that into one account:

- **One bill.** Pay Sophos; we handle the rest.
- **One signup.** No Firecrawl, FAL, Browser Use, or OpenAI audio accounts to manage.
- **One key.** Your Sophos Portal OAuth covers every tool.
- **Same quality.** Same backends the direct-key route uses — just fronted by us.

Bring your own keys anytime — per-tool, whenever you want to. The gateway isn't a lock-in, it's a shortcut.

## Get started

There are three ways in — pick whichever fits where you are:

```bash
slick setup --portal     # Fresh install: Sophos OAuth + set Sophos as provider + turn on the Tool Gateway in one go
```

```bash
slick model              # Switch your inference provider to Sophos Portal — Slick then offers to turn on the gateway for all tools
```

```bash
slick tools              # Enable the gateway per-tool — pick "Sophos Subscription" for any tool you want
```

`slick setup --portal` and `slick model` are the all-at-once paths: log in once, optionally flip every tool to the gateway. `slick tools` is the à la carte path — turn on just the tools you want, one at a time.

**You don't have to log in first.** With `slick tools`, the Sophos-managed backends (Web search, Image, Video, TTS, Browser) are always listed, even if you've never signed into Sophos Portal. Select one and Slick runs the Portal login right there if you aren't already authenticated — no need to run `slick model` beforehand. If your Sophos OAuth is already active, selecting the backend enables it immediately with no extra prompt. This path only logs you in and turns on the one tool you picked — it does **not** switch your inference provider, and it does **not** prompt you to enable the gateway for every other tool.

Check what's active at any time:

```bash
slick portal info        # Portal auth + Tool Gateway routing summary
slick portal tools       # Gateway catalog with current routing per tool
slick status             # Full system status (Tool Gateway is one section)
```

`slick portal info` shows a section like:

```
◆ Sophos Tool Gateway
  Sophos Portal     ✓ managed tools available
  Web tools       ✓ active via Sophos subscription
  Image gen       ✓ active via Sophos subscription
  TTS             ✓ active via Sophos subscription
  Browser         ○ active via Browser Use key
```

Tools marked "active via Sophos subscription" are going through the gateway. Anything else is using your own keys.

## Eligibility

The Tool Gateway is a **paid-subscription** feature. Free-tier Sophos accounts can use Portal for inference but don't include managed tools — [upgrade your plan](https://portal.sophostechne.com/manage-subscription) to unlock the gateway.

Some accounts are also entitled to a **free tool pool** — a small managed-tool allowance that covers gateway tool calls without a paid subscription. When a free pool is available, the gateway surfaces it and shows a setup prompt on first use, so you can opt in and start using managed tools right away.

## The enablement checklist

Picking a Sophos model (`slick model`) offers a per-tool checklist of gateway backends. Its behavior respects your existing setup:

- Tools you've explicitly pointed at another backend (e.g. `web.backend: searxng`, `browser.cloud_provider: camofox`) are **never offered** — your selection can't be accidentally overwritten.
- Tools configured via environment variables alone (e.g. `SEARXNG_URL`, `CAMOFOX_URL`) are offered **unchecked**, labeled to keep your own backend.
- Only genuinely unconfigured tools come pre-checked.
- Declines stick: if you submit the checklist with a tool unchecked, it won't be pre-checked on future Sophos model swaps (stored in `tool_gateway_declined_tools` in `config.yaml`; checking it later clears the decline).

## Mix and match

The gateway is per-tool. Turn it on for just what you want:

- **All tools through Sophos** — easiest; one subscription, done.
- **Gateway for web + images, bring your own TTS** — keep your ElevenLabs voice, let Sophos handle the rest.
- **Gateway only for things you don't have keys for** — "I already pay for Browserbase, but I don't want a Firecrawl account" works fine.

Switch any tool at any time via:

```bash
slick tools          # Interactive picker for each tool category
```

Select the tool, pick **Sophos Subscription** as the provider (or any direct provider you prefer). No config editing required. If you aren't logged into Sophos Portal yet, picking **Sophos Subscription** kicks off the Portal login inline — you don't need to authenticate through `slick model` first.

## Using individual image models

Image generation defaults to FLUX 2 Klein 9B for speed. Override per-call by passing the model ID to the `image_generate` tool:

| Model | ID | Best for |
|---|---|---|
| FLUX 2 Klein 9B | `fal-ai/flux-2/klein/9b` | Fast, good default |
| FLUX 2 Pro | `fal-ai/flux-2-pro` | Higher fidelity FLUX |
| Z-Image Turbo | `fal-ai/z-image/turbo` | Stylized, fast |
| Nano Banana Pro | `fal-ai/nano-banana-pro` | Google Gemini 3 Pro Image |
| GPT Image 1.5 | `fal-ai/gpt-image-1.5` | OpenAI image gen, text+image |
| GPT Image 2 | `fal-ai/gpt-image-2` | OpenAI latest |
| Ideogram V3 | `fal-ai/ideogram/v3` | Strong prompt adherence + typography |
| Recraft V4 Pro | `fal-ai/recraft/v4/pro/text-to-image` | Vector-style, graphic design |
| Qwen Image | `fal-ai/qwen-image` | Alibaba multimodal |

The set evolves — `slick tools` → Image Generation shows the current live list.

---

## Configuration reference

Most users never need to touch this — `slick model` and `slick tools` cover every workflow interactively. This section is for writing config.yaml directly or scripting setups.

### One selection key per tool category

Each tool category has a single provider-selection key, written by the `slick tools` picker (or the desktop GUI). Picking the **Sophos Subscription** row stores the value `sophos`, which routes that category through the managed Tool Gateway. Picking a BYOK row stores the vendor name (`fal`, `openai`, `firecrawl`, `browser-use`, ...), which goes direct with your own credentials:

```yaml
web:
  backend: sophos          # web search/extract via the Tool Gateway

image_gen:
  provider: sophos         # image generation via the Tool Gateway

tts:
  provider: sophos         # TTS via the Tool Gateway

stt:
  provider: sophos         # speech-to-text via the Tool Gateway

browser:
  cloud_provider: sophos   # cloud browser via the Tool Gateway
```

The runtime **always uses the stored selection** — credential presence never selects or reroutes a category. A `FAL_KEY` sitting in `.env` is ignored while `image_gen.provider: sophos`; conversely, `image_gen.provider: fal` with no `FAL_KEY` set produces a clear error instead of silently falling back to the gateway:

```
image_gen is configured to use fal (set via slick tools), but FAL_KEY is not set. Run 'slick tools' to change it.
```

Categories you have **never configured** (no selection key ever written) autodetect from available credentials, same as before. But once a selection exists, adding a key to `.env` does not change the route — only `slick tools` (or editing the selection key) does.

### Switching back to your own keys

```bash
slick tools    # pick the tool → choose a direct provider (e.g. Firecrawl)
```

Or set the selection key directly:

```yaml
web:
  backend: firecrawl   # Slick now uses FIRECRAWL_API_KEY from .env
```

### Legacy `use_gateway` flag (deprecated)

Older Slick versions used a per-tool `use_gateway: true` boolean to route through the gateway. That flag is **legacy**: it is never written anymore, and the `slick tools` picker removes it from a category's config when it rewrites the selection. Old configs that still contain `use_gateway: true` are interpreted at read time as the `sophos` selection, so existing setups keep working. Don't set `use_gateway` in new configs — select the provider in `slick tools` instead.

### Self-hosted gateway (advanced)

Running your own Sophos-compatible gateway? Override endpoints in `~/.slick/.env`:

```bash
TOOL_GATEWAY_DOMAIN=your-domain.example.com
TOOL_GATEWAY_SCHEME=https
TOOL_GATEWAY_USER_TOKEN=your-token        # normally auto-populated from Portal login
FIRECRAWL_GATEWAY_URL=https://...         # override one endpoint specifically
```

These knobs exist for custom infrastructure setups (enterprise deployments, dev environments). Regular subscribers never set them.

## FAQ

### Does it work with Telegram / Discord / the other messaging gateways?

Yes. Tool Gateway operates at the tool-execution layer, not the CLI. Every interface that can call a tool — CLI, Telegram, Discord, Slack, IRC, Teams, the API server, anything — benefits from it transparently.

### What happens if my subscription expires?

Tools routed through the gateway stop working until you renew or swap in direct API keys via `slick tools`. Slick shows a clear error pointing at the portal.

### Can I see usage or costs per tool?

Yes — the [Sophos Portal dashboard](https://portal.sophostechne.com) breaks usage down by tool so you can see what's driving your bill.

### Is Modal (serverless terminal) included?

Modal is available as an **optional add-on** through the Sophos subscription, not part of the default Tool Gateway bundle. Configure it via `slick setup terminal` or directly in `config.yaml` when you want a remote sandbox for shell execution.

### Do I need to delete my existing API keys when I enable the gateway?

No — keep them in `.env`. While a tool's selection is **Sophos Subscription**, direct keys for that tool are simply ignored. Pick the direct provider again in `slick tools` and your keys become the source again. The gateway isn't a lock-in.
