# Observability Stack Setup Guide

## Environment Variables

Required in `.env.local`:
- `SLACK_WEBHOOK_URL` — Slack webhook for alerts
- `ALERT_EMAIL` — Email address for critical alerts
- `LOG_LEVEL` — Logging level (info, warn, error) — default: info

## Getting Slack Webhook URL

1. Go to Slack workspace settings
2. Apps & integrations → Create New App
3. Choose "From scratch"
4. Enable Incoming Webhooks
5. Copy webhook URL to SLACK_WEBHOOK_URL

## Starting the Stack

```bash
npm install
npm run build
docker-compose up -d
```

## Access URLs

- Grafana: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9090
- App metrics: http://localhost:3000/api/metrics

## Logs Location

- App logs: /var/log/meta-ads-crm/app-YYYY-MM-DD.log
- Job logs: /var/log/meta-ads-crm/jobs-YYYY-MM-DD.log
- Error logs: /var/log/meta-ads-crm/errors-YYYY-MM-DD.log

## Verifying Metrics Collection

1. Wait 30 seconds for Prometheus to scrape
2. Open http://localhost:9090
3. Search for `leads_scored_total` or `http_requests_total`
4. Should show data points

## Configuring Alerts

See `ALERT_SETUP.md` for manual alert configuration in Grafana UI.
