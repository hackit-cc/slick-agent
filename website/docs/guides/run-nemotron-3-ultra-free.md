---
sidebar_position: 0
title: "Run Nemotron 3 Ultra free in Slick Agent"
description: "Try NVIDIA Nemotron 3 Ultra on Hackit Portal — free June 4–18 — with day 0 support in Slick Agent"
---

# Run Nemotron 3 Ultra free in Slick Agent

Hackit has been inducted into the **Nemotron Coalition** of leading AI labs working with **NVIDIA** to advance open frontier foundation models. In honor of this, we've partnered with **Nebius** to provide **Nemotron 3 Ultra** free on [Hackit Portal](https://portal.hackit.cc) for two weeks (**June 4th – June 18th**). Follow the instructions below to try the model in your Slick Agent today.

:::info Limited-time offer
The `nvidia/nemotron-3-ultra:free` tier is available from **June 4th to June 18th**. The `:free` tag is what keeps it on the no-cost plan — pick that exact variant.
:::

Pick whichever install fits you. The **desktop app** is the easiest — no terminal required. If you live in a terminal, the **command-line** install is right below it.

## Option A — Desktop app (recommended)

The simplest path: a one-click installer with a guided, point-and-click setup. No terminal needed.

### 1. Download and install

[Download the Slick Desktop installer](https://slick-agent.hackit.cc/) for macOS or Windows, then open it. On first launch it finishes setting itself up (usually under a minute).

### 2. Connect Hackit Portal

When the app opens, you'll see a "Let's get you set up" screen. Click **Hackit Portal** (marked **Recommended**). Your browser opens — create a [Hackit Portal](https://portal.hackit.cc) account (or sign in), choose the **Free** plan, and authorize Slick. The app connects automatically.

### 3. Pick the free Nemotron 3 Ultra model

After connecting, the app shows a **Default model** card. Click **Change**, search for **nemotron 3 ultra**, and select the variant tagged **Free tier**:

```
nvidia/nemotron-3-ultra:free
```

The `:free` tag is what keeps it on the no-cost tier — pick that variant.

### 4. Start chatting

Click **Start chatting**. That's it — you're talking to Nemotron 3 Ultra, free.

## Option B — Command line

Prefer the terminal?

### 1. Install Slick Agent

On macOS/Linux/WSL2/Android, run

```bash
curl -fsSL https://slick-agent.hackit.cc/install.sh | bash
```

On Windows, run

```powershell
iex (irm https://slick-agent.hackit.cc/install.ps1)
```

Prefer to review first? Download [`install.sh`](https://slick-agent.hackit.cc/install.sh), inspect it, then run it.

After it finishes, reload your shell:

```bash
source ~/.bashrc   # or source ~/.zshrc
```

### 2. Run Quick Setup

```bash
slick setup
```

Select **Quick Setup**. Slick opens a browser tab and waits for you to finish the next steps.

### 3. Create a Hackit Portal account

In the browser, create a [Hackit Portal](https://portal.hackit.cc) account (or sign in) and choose the **Free** plan.

### 4. Connect your account

When prompted to connect your account to Slick Agent, click **Connect**. You'll see a confirmation once it's linked.

### 5. Select the free Nemotron 3 Ultra model

Return to your terminal. From the model list, select:

```
nvidia/nemotron-3-ultra:free
```

The `:free` tag is what keeps it on the no-cost tier, so make sure you pick that variant.

### 6. Start chatting

Complete the remaining Quick Setup prompts, then run:

```bash
slick
```

That's it — you're talking to Nemotron 3 Ultra, free.

## Switching to it later

Already set up with another model?

- **Desktop app:** open the model picker, search for **nemotron 3 ultra**, and select the **Free tier** variant.
- **CLI / TUI:** switch any time from inside a session with `/model nvidia/nemotron-3-ultra:free`, or run `/model` to open the picker and choose it from the list.

## Troubleshooting

- **Don't see the model in the list?** Make sure you finished the Hackit Portal connection and that you're on the **Free** plan. In the CLI, `slick portal info` confirms you're logged in and routing through Hackit.
- **Picked the wrong variant?** Re-select `nvidia/nemotron-3-ultra:free` — the `:free` suffix is required to stay on the no-cost tier.
- **Browser didn't open / you're on a remote host (CLI)?** See [OAuth over SSH / Remote Hosts](/guides/oauth-over-ssh) for port-forwarding workarounds.

## See also

- **[Desktop App](/user-guide/desktop)** — The native one-click app (macOS, Windows, Linux)
- **[Run Slick Agent with Hackit Portal](/guides/run-slick-with-hackit-portal)** — Full Portal walkthrough: models, Tool Gateway, and verification
- **[Hackit Portal integration](/integrations/hackit-portal)** — What's in the subscription
- **[Quickstart](/getting-started/quickstart)** — Install-to-chat in under 5 minutes
