# Optional Skills

Official skills maintained by Sophos Techne that are **not activated by default**.

These skills ship with the slick-agent repository but are not copied to
`~/.slick/skills/` during setup. They are discoverable via the Skills Hub:

```bash
slick skills browse               # browse all skills, official shown first
slick skills browse --source official  # browse only official optional skills
slick skills search <query>       # finds optional skills labeled "official"
slick skills install <identifier> # copies to ~/.slick/skills/ and activates
```

## Why optional?

Some skills are useful but not broadly needed by every user:

- **Niche integrations** — specific paid services, specialized tools
- **Experimental features** — promising but not yet proven
- **Heavyweight dependencies** — require significant setup (API keys, installs)

By keeping them optional, we keep the default skill set lean while still
providing curated, tested, official skills for users who want them.
