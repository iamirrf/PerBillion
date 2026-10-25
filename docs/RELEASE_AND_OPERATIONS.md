# PerBillion release and operating model

Updated 2026-10-24. This repository has no confirmed live production host. The commands below prepare and verify a deployment; they do not imply that one has occurred.

## Product boundary

- The 24 current lessons, their 48 explained quiz questions, growth simulator, and synthetic paper-trading account are free and work without an account or paid data feed.
- An account is optional. Guest lesson progress stays in browser storage. On sign-in, current-curriculum completions merge by lesson ID, retain the best score, and synchronize to MongoDB. The older 30-lesson curriculum remains a separate prior-coursework transcript; it is never mapped into a new lesson completion.
- Paper trades use fictional prices and virtual cash. The example forecast chart is synthetic. Generated forecasts use historical weekly adjusted prices and statistical models; they are estimates, not recommendations or real-money orders.
- Forecast generation is bounded to five requests per minute and `FORECAST_DAILY_LIMIT` accepted requests per rolling 24 hours for one API gateway process (default 25). The limit is shared by all visitors on that process. A multi-instance deployment needs a shared limiter before scaling out. There is no promise of unlimited live forecasts.
- The gateway field `forecastMonths` remains for existing clients. Its integer value is a **weekly** forecast horizon from 1 to 52.

## Capacity and expected cost

This is a planning estimate for a small, single-host pilot, not a vendor quote or a measured production benchmark. Review prices and terms before purchase.

| Item | Planning basis | Estimated monthly cost |
| --- | --- | ---: |
| App host, MongoDB, Spring, Python model, and gateway | One 4-vCPU, 8-GiB basic virtual machine. [DigitalOcean lists $48/month](https://www.digitalocean.com/pricing/droplets). CPU fit must be load-tested. | $48 |
| Host snapshot backup | Weekly backup at [20% of VM cost](https://www.digitalocean.com/pricing/droplets). Separately test MongoDB restore and keep an offsite copy. | $9.60 plus offsite storage |
| Optional separate model host | 2-vCPU, 4-GiB CPU-optimized machine is [listed at $42/month](https://www.digitalocean.com/pricing/droplets). Needed only if measured model load exceeds the pilot host. | $0 or $42 |
| Optional managed MongoDB | [Atlas dedicated starts around $56.94/month](https://www.mongodb.com/pricing); self-hosting on the pilot VM avoids this line item but shifts backup and maintenance work to the operator. | $0 or $56.94+ |
| Historical market data | The code requests `TIME_SERIES_WEEKLY_ADJUSTED`. [Alpha Vantage describes 25 calls/day on its standard free plan](https://www.alphavantage.co/premium/), but [its terms require an agreement for commercial use](https://www.alphavantage.co/terms_of_service/). Obtain a written entitlement and quote before public live use. | Vendor quote required |
| Model inference | Statsmodels runs on our CPU; there is no third-party model token charge. At 25 jobs/day and an assumed 60 CPU-seconds/job, the workload is about 12.5 CPU-hours/month. Measure real wall time, memory, and peak overlap. | Included in host until capacity is exceeded |

The **known infrastructure planning floor is about $57.60/month**, excluding domain, TLS edge, offsite backups, monitoring, taxes, and licensed market data. A separate model host would bring that example to about $99.60/month. The product stays free to learners; operators fund these costs. The Spring data fetcher caches a maximum of 100 weekly ticker series for 24 hours per process to reduce provider calls. Each fresh uncached ticker can still use one provider request, and no provider entitlement is assumed from caching.

## Deployment inputs

1. Copy `.env.production.example` to `.env` on the target host. Set strong `MONGO_PASSWORD` and `JWT_SECRET`, a properly licensed `ALPHAVANTAGE_API_KEY`, `FRONTEND_URL` to the actual public HTTPS origin, and the desired `FORECAST_DAILY_LIMIT`. Keep `.env` out of Git. Set `MONGODB_URI` only if using a separately managed database.
2. Place a TLS reverse proxy or load balancer in front of local port `PERBILLION_HTTP_PORT` (default `127.0.0.1:8088`). Route the entire origin, including `/api` and `/uploads`, to this port. Configure the edge to pass `X-Forwarded-Proto: https`. Production Compose does not expose MongoDB, Spring, or the Python service publicly. Once the host is known, set the Open Graph and Twitter image URLs in `services/frontend/index.html` to the absolute HTTPS asset URL before building and test an actual link preview; some social crawlers do not execute JavaScript.
3. Ensure DNS, secrets, log collection, storage, backups, provider license, and a restore-tested MongoDB backup are ready. Set up an image registry or keep the previous image digest for rollback.

```bash
docker compose -f docker-compose.production.yml config
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml ps
```

## Release checks

Run frontend `npm run build`, API `npm test`, Spring `mvn test`, and Python `python3 -m compileall -q services/ml-engine`. Then verify every service through the production network:

```bash
curl -fsS http://127.0.0.1:8088/health
curl -fsS http://127.0.0.1:8088/api/health
docker compose -f docker-compose.production.yml exec nginx wget -qO- http://spring-orchestrator:8080/actuator/health
docker compose -f docker-compose.production.yml exec nginx wget -qO- http://ml-engine:5000/health
docker compose -f docker-compose.production.yml exec mongodb mongosh --quiet -u perbillion -p "$MONGO_PASSWORD" --authenticationDatabase admin --eval 'db.adminCommand({ ping: 1 }).ok'
```

In a browser on the actual host, complete a guest lesson, refresh, sign in and check merge status, restore on a second device, export, reset only current progress, verify an old-coursework transcript, change growth inputs, reject invalid virtual orders, place valid virtual orders, and exercise forecast pending, completion, error, timeout, and cancellation states. Check desktop and phone widths, keyboard focus, reduced motion, unavailable services, and social preview metadata. A live forecast check requires valid licensed market-data access. Confirm no browser runtime errors or horizontal overflow.

## Monitoring and rollback

- Watch API 5xx/429 rates, forecast completion and duration, model memory/CPU, provider quota errors, MongoDB health, progress-sync errors, and backup jobs. Do not send lesson answers or account tokens to analytics. Measure aggregate lesson starts, completions, and return visits only after choosing a privacy policy and consent approach.
- If the release fails, disable traffic at the TLS edge, restore the previous image digests or Git release and run `docker compose -f docker-compose.production.yml up -d --build`, then repeat health and smoke checks. Keep MongoDB data intact; the new `education_progress_v2` collection is additive and the legacy collection remains separate. Restore MongoDB from a verified backup only for a data incident, not for a UI rollback.
- `docker-compose.yml` remains the local development stack. The production file uses built frontend and gateway images, persistent database/cache/upload volumes, and a localhost-only HTTP ingress.

## Known release gate in this workspace

Docker is not installed in the current workspace. Builds and browser tests can run locally, but live MongoDB, Spring, Python, Nginx, licensed market data, and full Compose integration must be verified on a Docker-capable host before calling a public release ready. No production deployment is assumed.
