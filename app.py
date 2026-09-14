from flask import Flask, render_template, jsonify, request
from copy import deepcopy

app = Flask(__name__)

BORROWERS = [
    {"id":"B01","name":"Asha","income":32000,"payment":7200,"buffer":18000,"stress":12},
    {"id":"B02","name":"Meena","income":27000,"payment":6800,"buffer":12000,"stress":18},
    {"id":"B03","name":"Ravi","income":41000,"payment":8200,"buffer":28000,"stress":8},
    {"id":"B04","name":"Imran","income":30000,"payment":7000,"buffer":15000,"stress":15},
    {"id":"B05","name":"Kavita","income":24000,"payment":6400,"buffer":9000,"stress":28},
    {"id":"B06","name":"Neha","income":36000,"payment":7600,"buffer":20000,"stress":10},
    {"id":"B07","name":"Suresh","income":22000,"payment":5900,"buffer":7000,"stress":34},
    {"id":"B08","name":"Pooja","income":29000,"payment":6600,"buffer":13000,"stress":20},
    {"id":"B09","name":"Arjun","income":45000,"payment":8500,"buffer":32000,"stress":7},
    {"id":"B10","name":"Fatima","income":26000,"payment":6300,"buffer":11000,"stress":23},
    {"id":"B11","name":"Vikram","income":33000,"payment":7100,"buffer":19000,"stress":13},
    {"id":"B12","name":"Lata","income":25000,"payment":6200,"buffer":10000,"stress":26},
]
BORROWER_IDS = {b["id"] for b in BORROWERS}

# Relationship weights: shared guarantee, same livelihood, same locality, group interaction.
EDGES = [
    ("B01","B02",0.92,"Shared guarantee"),("B01","B03",0.42,"Same locality"),
    ("B01","B04",0.55,"Group support"),("B02","B05",0.88,"Shared guarantee"),
    ("B02","B08",0.58,"Common income source"),("B03","B06",0.86,"Shared guarantee"),
    ("B03","B09",0.71,"Same locality"),("B04","B05",0.74,"Common income source"),
    ("B04","B07",0.91,"Shared guarantee"),("B05","B07",0.82,"Group support"),
    ("B05","B10",0.67,"Same locality"),("B06","B09",0.80,"Shared guarantee"),
    ("B06","B11",0.56,"Group support"),("B07","B08",0.77,"Common income source"),
    ("B08","B10",0.90,"Shared guarantee"),("B09","B11",0.63,"Same locality"),
    ("B10","B12",0.84,"Shared guarantee"),("B11","B12",0.69,"Group support"),
    ("B02","B04",0.49,"Same locality"),("B06","B08",0.52,"Same locality")
]

ACTION_LABELS = {
    "relief": "Temporary repayment relief",
    "grace": "Grace period",
    "guarantee": "Reduce guarantee pressure",
    "coaching": "Income / budgeting coaching",
}


def score_financial_pressure(b):
    debt_ratio = b["payment"] / max(b["income"], 1)
    liquidity_months = b["buffer"] / max(b["income"] - b["payment"], 1)
    ratio_score = min(100, max(0, (debt_ratio - 0.18) * 170))
    liquidity_score = min(100, max(0, (1.5 - liquidity_months) * 50))
    return round(0.6 * ratio_score + 0.4 * liquidity_score, 1)


def classify(b, neighbor_pressure=0):
    own = max(score_financial_pressure(b), b["stress"])
    contagion = min(100, neighbor_pressure)
    if contagion >= 55 and own < 65:
        return "Vulnerable via network"
    if own >= 68 and contagion < 45:
        return "Independent deterioration"
    if own >= 68 and contagion >= 45:
        return "Mixed / high risk"
    if own >= 48:
        return "Contained stress"
    return "Healthy"


def clamp(value, lo, hi):
    return max(lo, min(hi, value))


def build_state(shock_id=None, shock_size=0.0, rounds=3):
    borrowers = deepcopy(BORROWERS)

    if shock_id not in BORROWER_IDS:
        shock_id = "B07"
    shock_size = clamp(shock_size, 0, 100)
    rounds = int(clamp(rounds, 0, 12))

    stress = {b["id"]: float(b["stress"]) for b in borrowers}
    stress[shock_id] = min(100, stress[shock_id] + shock_size)

    history = [stress.copy()]
    for _ in range(rounds):
        nxt = stress.copy()
        for a, b, w, rel in EDGES:
            spill = max(0, stress[a] - 45) * w * 0.18
            spill2 = max(0, stress[b] - 45) * w * 0.18
            nxt[b] = min(100, nxt[b] + spill)
            nxt[a] = min(100, nxt[a] + spill2)
        # mild time decay so the model is not an ever-growing cascade
        for k in nxt:
            nxt[k] = max(0, nxt[k] - 2.0)
        stress = nxt
        history.append(stress.copy())

    neighbors = {b["id"]: [] for b in borrowers}
    for a, b, w, rel in EDGES:
        neighbors[a].append((b, w, rel))
        neighbors[b].append((a, w, rel))

    nodes = []
    for b in borrowers:
        weighted = sum(max(0, stress[n] - 35) * w for n, w, _ in neighbors[b["id"]])
        pressure = min(100, weighted * 0.85)
        own = score_financial_pressure(b)
        label = classify(b, pressure)
        nodes.append({
            **b,
            "stress": round(stress[b["id"]], 1),
            "own_pressure": own,
            "network_pressure": round(pressure, 1),
            "classification": label,
            "degree": len(neighbors[b["id"]]),
            "explanation": (
                "Pressure is mostly direct: debt burden/liquidity is the main signal."
                if own >= 68 and pressure < 45 else
                "Pressure is mostly network-driven: nearby stressed borrowers raise exposure."
                if pressure >= 55 and own < 65 else
                "Both the borrower's own finances and network connections contribute."
                if own >= 68 and pressure >= 45 else
                "Stress is present, but the current evidence suggests it remains contained."
                if own >= 48 else
                "No major direct or network pressure is detected right now."
            )
        })
    return nodes, history


def make_edges():
    return [{"source": a, "target": b, "weight": w, "relationship": rel} for a, b, w, rel in EDGES]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/state")
def state():
    shock = request.args.get("shock", "B07")
    try:
        size = float(request.args.get("size", "30"))
    except ValueError:
        size = 30.0
    try:
        rounds = int(request.args.get("rounds", "4"))
    except ValueError:
        rounds = 4
    nodes, history = build_state(shock, size, rounds)
    return jsonify({"nodes": nodes, "edges": make_edges(), "history": history,
                     "shock": shock, "shock_size": size})


@app.route("/api/simulate", methods=["POST"])
def simulate():
    payload = request.get_json(silent=True) or {}
    shock = payload.get("shock", "B07")
    size = float(payload.get("size", 30))
    rounds = int(payload.get("rounds", 4))
    nodes, history = build_state(shock, size, rounds)
    return jsonify({"nodes": nodes, "edges": make_edges(), "history": history,
                     "shock": shock, "shock_size": size})


@app.route("/api/intervention", methods=["POST"])
def intervention():
    payload = request.get_json(silent=True) or {}
    target = payload.get("target", "B07")
    if target not in BORROWER_IDS:
        target = "B07"
    action = payload.get("action", "relief")
    if action not in ACTION_LABELS:
        action = "relief"
    reduction = {"relief": 18, "grace": 12, "guarantee": 9, "coaching": 7}.get(action, 10)

    before_nodes, before_history = build_state(target, 32, 4)
    # Simulate intervention by reducing the shock and one node's stress.
    after_nodes, after_history = build_state(target, max(0, 32 - reduction), 4)

    before_map = {n["id"]: n["stress"] for n in before_nodes}
    after_map = {n["id"]: n["stress"] for n in after_nodes}
    affected_before = sum(v >= 50 for v in before_map.values())
    affected_after = sum(v >= 50 for v in after_map.values())

    return jsonify({
        "action": action,
        "action_label": ACTION_LABELS[action],
        "target": target,
        "before": before_map,
        "after": after_map,
        "affected_before": affected_before,
        "affected_after": affected_after,
        "risk_reduction": round(max(0, affected_before - affected_after), 2)
    })


if __name__ == "__main__":
    app.run(debug=True)
