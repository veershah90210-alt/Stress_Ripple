# Ripple — The Butterfly Effect in Microfinance

Live Demo: https://stress-ripple.vercel.app/

StressRipple is a hackathon prototype that models how financial stress can move through a connected microfinance group.

## Why it fits the "Butterfly Effect" theme

A small shock to one borrower can become a group-level risk when borrowers are connected by guarantees, common income sources, locality, or informal support. The prototype visualizes this chain reaction and tries to distinguish:

- **Contained stress** — a borrower is under pressure, but the network is not strongly transmitting it.
- **Vulnerable via network** — a borrower looks manageable on their own, but nearby stressed members increase their risk.
- **Independent deterioration** — the borrower has high own financial pressure even without strong network pressure.
- **Mixed / high risk** — both direct financial weakness and network pressure are high.

## What's new in this pass

- **Guided onboarding tour.** First-time visitors see a welcome card and can step through a 9-stop spotlight tour of every part of the app (skippable, replayable any time from the footer button, keyboard-navigable with ← → and Esc).
- **Inline glossary tooltips.** Small "?" badges next to jargon like *shock size*, *ripple round*, *own finances*, *network pressure*, and *hidden network risk* explain terms in place, no docs required.
- **Live story progress.** The four-step bar at the top now highlights and checks off where you are (spark → ripple → hidden risk → intervention) as you use the app.
- **Loading and error states.** Buttons disable and stats pulse while a request is in flight; failed requests show a dismissible banner with a retry action instead of failing silently.
- **Accessibility pass.** Keyboard-focusable network nodes with ARIA labels, visible focus rings, `prefers-reduced-motion` support, and semantic roles on the risk meter and error banner.
- **Visual refresh.** A distinct type pairing (Fraunces for headings, IBM Plex Sans for UI), refined dark palette, hover/selection states on the network graph, and a cleaner responsive layout down to small phones.

## UX / hackathon highlights

- Story-driven four-step flow: spark → ripple → hidden risk → intervention, with the step bar lighting up as you progress.
- **Built-in guided tour** for new users: a 6-step spotlight walkthrough (▶ button in the header, replayable anytime from the footer or the floating `?` button bottom-right). First-time visitors see it automatically; it won't reappear once dismissed (remembered in the browser).
- Inline "?" info tooltips next to the shock-size control and the own-finances / network-pressure numbers, explaining exactly what each score means.
- Clickable, keyboard-accessible borrower nodes with a live explanation card, plus hover tooltips on nodes and edges.
- Relationship types shown when edges are selected.
- Color-coded selectors and a high-risk-only intervention view.
- Loading states (spinner + disabled buttons) while a ripple or intervention is computing, and toast notifications confirming what happened or flagging a failed request.
- Defensive backend input validation — unknown borrower IDs, out-of-range shock sizes/rounds, and unknown intervention actions fall back to sane defaults instead of erroring.
- Responsive layout down to small mobile screens, visible keyboard focus states, and reduced-motion support.

## Core MVP

1. Interactive borrower network.
2. Adjustable shock to any borrower.
3. Multi-round stress propagation.
4. Root-cause classification.
5. "What-if" intervention simulation.
6. Synthetic data so the app works without external APIs.

## Tech stack

- Python
- Flask
- HTML / CSS / JavaScript
- SVG for the network visualization
- No database or API key required

## Run locally

```bash
git clone https://github.com/<your-username>/stress-ripple.git
cd stress-ripple

python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000`. On first load you'll see the onboarding tour — replay it any time from the "Replay tutorial" button in the footer.

## Demo story

Start with borrower **B07** and apply a 30–40 point shock.

Watch how connected borrowers change over several rounds.

Then click **Intervene** on the shocked borrower and compare the number of borrowers crossing the high-risk threshold.

The key idea: **treat the original borrower as the spark, not automatically as the culprit.**

## Model

For each borrower:

- `own_pressure` estimates direct financial pressure from debt payment and liquidity.
- `network_pressure` estimates pressure received from stressed neighbors.
- Edge weight represents the strength of the relationship.
- Stress is propagated for several rounds with a damping term so the system does not explode forever.

This is intentionally an interpretable simulation rather than a black-box ML model.

## Future extensions

- Real repayment histories.
- Missed-payment sequences.
- Income seasonality.
- GIS / village-level clusters.
- Learned edge weights from historical repayment data.
- Calibrated probability of default at 30/60/90 days.
- Explainable intervention optimization.
