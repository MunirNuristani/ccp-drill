# Cloud Practitioner Drill

A mobile-first, installable PWA for practicing the AWS Certified Cloud Practitioner (CLF-C02) exam — 205 questions covering every task statement in the official exam guide, each with an explanation for every answer choice.

## Modes

- **Full Exam** — 65 questions, no answers revealed until you finish, then a pass/fail score against the real 700/1000 bar. Every attempt is saved so you can track progress over time.
- **Quick Practice** — pick a round length (5/10/20/40) and a topic, get the explanation immediately after each answer. Stop anytime.

Questions are drawn least-recently-seen first, so repeat sessions surface fresh material before anything repeats.

## Running locally

This is a static site with no build step.

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploying

Static hosting only — point Vercel (or any static host) at this directory. `vercel.json` sets cache headers so the service worker and manifest update promptly on new deploys.

## Tech

Single-file vanilla HTML/CSS/JS app (`index.html`), no framework, no build step. `manifest.json` + `sw.js` make it installable and usable offline once loaded.
