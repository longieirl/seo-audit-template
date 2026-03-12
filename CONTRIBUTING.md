# Contributing

Thanks for your interest in contributing to seo-audit-template!

## DCO sign-off

All commits must include a Developer Certificate of Origin sign-off. Add `-s` to every commit:

```bash
git commit -s -m "your message"
```

This attests that you have the right to submit the code under the MIT licence. See [developercertificate.org](https://developercertificate.org) for the full text.

## Opening a pull request

1. [Open an issue](https://github.com/longieirl/seo-audit-template/issues) first to discuss the change — especially for new features or behaviour changes.
2. Fork the repo and create a branch from `main`.
3. Follow the prompts in the pull request template (`.github/pull_request_template.md`).
4. Ensure `npm audit --audit-level=high` passes before requesting review.

## Code style

- Keep it plain Node.js — no frameworks, no build steps.
- Run `npm run setup` to verify your environment works end-to-end before opening a PR.
