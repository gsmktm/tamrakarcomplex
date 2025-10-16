import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from flask import Flask, jsonify, render_template, request

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "phones.json"


class PhoneCatalog:
    """Encapsulates phone catalogue operations."""

    def __init__(self, data_path: Path) -> None:
        self.data_path = data_path
        self._phones = self._load_data()

    def _load_data(self) -> List[Dict]:
        with self.data_path.open("r", encoding="utf-8") as f:
            phones = json.load(f)
        phones.sort(key=lambda phone: phone["official_price"], reverse=True)
        return phones

    @property
    def phones(self) -> List[Dict]:
        return self._phones

    def find_phone(self, phone_id: str) -> Dict:
        return next((phone for phone in self._phones if phone["id"] == phone_id), None)

    def search(self, query: str, brand: str = None, max_price: int | None = None) -> List[Dict]:
        query_lower = query.lower()
        results = []
        for phone in self._phones:
            matches_query = query_lower in phone["name"].lower() or query_lower in phone["brand"].lower()
            matches_brand = brand.lower() == phone["brand"].lower() if brand else True
            matches_price = phone["official_price"] <= max_price if max_price else True
            if matches_query and matches_brand and matches_price:
                results.append(phone)
        return results


catalog = PhoneCatalog(DATA_PATH)
app = Flask(__name__)


@app.context_processor
def inject_globals():
    return {
        "current_year": datetime.utcnow().year,
        "brands": sorted({phone["brand"] for phone in catalog.phones}),
    }


@app.route("/")
def index():
    hero_highlights = catalog.phones[:4]
    return render_template("index.html", hero_highlights=hero_highlights)


@app.route("/exchange", methods=["GET", "POST"])
def exchange():
    valuation = None
    selected_phone = None
    if request.method == "POST":
        phone_id = request.form.get("phone_id")
        condition = request.form.get("condition")
        storage = request.form.get("storage")
        accessories = request.form.getlist("accessories")
        warranty = request.form.get("warranty")

        age_raw = request.form.get("age", "0")
        try:
            age = max(0, min(6, int(age_raw)))
        except (TypeError, ValueError):
            age = 0

        selected_phone = catalog.find_phone(phone_id)
        if selected_phone:
            valuation = calculate_exchange_value(selected_phone, condition, storage, accessories, warranty, age)

    return render_template("exchange.html", phones=catalog.phones, valuation=valuation, selected_phone=selected_phone)


def calculate_exchange_value(phone: Dict, condition: str, storage: str, accessories: List[str], warranty: str, age: int) -> Dict:
    base_price = phone["base_price"]
    condition_multiplier = phone["condition_adjustments"].get(condition, 0.6)

    storage_multiplier = 1.0
    if storage and storage not in phone["storage"]:
        storage_multiplier = 0.9
    elif storage and storage.endswith("256GB"):
        storage_multiplier = 1.05
    elif storage and storage.endswith("512GB"):
        storage_multiplier = 1.12

    accessories_bonus = 0.0
    if accessories:
        accessories_bonus = min(len(accessories) * 0.02, 0.06)

    warranty_bonus = 0.05 if warranty == "active" else 0.0

    age_penalty = max(0, age - 1) * 0.05
    age_multiplier = max(0.5, 1.0 - age_penalty)

    estimated_price = base_price * condition_multiplier * storage_multiplier
    estimated_price *= 1 + accessories_bonus + warranty_bonus
    estimated_price *= age_multiplier

    return {
        "estimated_price": round(estimated_price, -2),
        "condition": condition,
        "storage": storage,
        "accessories": accessories,
        "warranty": warranty,
        "age": age,
    }


@app.route("/prices")
def prices():
    return render_template("prices.html", phones=catalog.phones)


@app.route("/deep-search")
def deep_search():
    return render_template("search.html")


@app.route("/api/search")
def api_search():
    query = request.args.get("query", "")
    brand = request.args.get("brand")
    max_price_param = request.args.get("max_price")
    max_price = int(max_price_param) if max_price_param else None
    results = catalog.search(query, brand=brand, max_price=max_price) if query else []
    return jsonify(results)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
