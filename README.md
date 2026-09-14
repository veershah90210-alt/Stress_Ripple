# Ripple — The Butterfly Effect in Microfinance

StressRipple is a hackathon prototype that models how financial stress can move through a connected microfinance group.

## Why it fits the "Butterfly Effect" theme

A small shock to one borrower can become a group-level risk when borrowers are connected by guarantees, common income sources, locality, or informal support. The prototype visualizes this chain reaction and tries to distinguish:

- **Contained stress** — a borrower is under pressure, but the network is not strongly transmitting it.
- **Vulnerable via network** — a borrower looks manageable on their own, but nearby stressed members increase their risk.
- **Independent deterioration** — the borrower has high own financial pressure even without strong network pressure.
- **Mixed / high risk** — both direct financial weakness and network pressure are high.

## UX / hackathon highlights

- Story-driven four-step flow: spark → ripple → hidden risk → intervention.
- Clickable borrower nodes with a live explanation card.
- Relationship types shown when edges are selected.
- Color-coded selectors and a high-risk-only intervention view.

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

Open `http://127.0.0.1:5000`.

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
