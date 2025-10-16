# Tamrakar Complex Exchange Hub

A compact full-stack web experience for **tamrakarcomplex.com** that focuses on
phone exchange valuations, market price intelligence, and deep catalogue search
for Nepal.

## Features

- **Exchange valuation engine** inspired by leading trade-in flows. Calculates
  offers by combining condition, storage tier, accessories, warranty, and device
  age adjustments.
- **Price dashboard** showcasing flagship and mid-range devices with official
  pricing alongside Tamrakar Complex base exchange offers.
- **Deep search module** with instant filtering by keyword, brand, and price
  ceiling. Results include key specs and pricing references.

## Project structure

```
app.py                # Flask application entry point
templates/            # HTML templates (Jinja2)
static/css/styles.css # Styling
static/js/search.js   # Deep search client logic
data/phones.json      # Device catalogue powering features
```

## Requirements

- Python 3.10+

Install dependencies:

```
pip install -r requirements.txt
```

## Running locally

```
flask --app app run --debug
```

The application will be available at <http://localhost:5000>.

## Production deployment

### Gunicorn (bare metal or VM)

```
pip install -r requirements.txt
gunicorn app:app --bind 0.0.0.0:8000
```

Point your reverse proxy (Nginx/Caddy/etc.) at port 8000.

### Docker

```
docker build -t tamrakarcomplex .
docker run -p 8000:8000 tamrakarcomplex
```

Visit <http://localhost:8000> to view the site. Deploy the container image to any
container hosting provider (Render, Fly.io, Railway, etc.) to make the site live.

### Platform-as-a-service (Heroku, Render)

This repository includes a `Procfile` declaring a `gunicorn` web process. Most
PaaS platforms detect the Python application automatically; simply point them at
this repo and ensure the `PORT` environment variable is provided.

## Deep search API

`GET /api/search`

Query parameters:

- `query` – keyword to match against device name or brand (required)
- `brand` – optional brand filter
- `max_price` – optional maximum official price (integer NPR)

Returns JSON array of matching devices including pricing and spec highlights.

## Exchange valuation logic

The valuation algorithm adjusts each device's base exchange price using:

1. **Condition multipliers** sourced from the catalogue.
2. **Storage multipliers** favouring higher tiers.
3. **Accessory & warranty bonuses** for complete device packages.
4. **Age penalties** to account for market depreciation.

The final valuation is rounded to the nearest hundred for easy quoting in
store.
