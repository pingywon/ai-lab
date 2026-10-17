# AI Lab

Three AI apps built with Claude. One page to open them all.

**Live:** https://lab.meetdominic.me

| App | What it does | Live | Code |
|---|---|---|---|
| Fine Print | Paste a contract, see the red flags. Every quote checked. | https://fineprint.meetdominic.me | https://github.com/pingywon/fine-print |
| First 90 | Any company site, a 90-day automation plan. | https://first90.meetdominic.me | https://github.com/pingywon/first-90 |
| Crew | One job, a whole AI team, one finished page. | https://crew.meetdominic.me | https://github.com/pingywon/crew |

Static page on a Cloudflare Worker. `node scripts/build.mjs`, then `npx wrangler deploy`. Phone check: `BASE=https://lab.meetdominic.me/ node e2e/phone.mjs`.
