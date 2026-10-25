# PerBillion release and operating model

Updated 2026-10-25. The public pilot is deployed at **https://perbillion-705825363504.us-central1.run.app/** in Google Cloud project `perbillion-free-2026`, region `us-central1`. It uses a scale-to-zero Cloud Run service with frontend, gateway, Spring, and Python containers; a private `e2-micro` VM runs MongoDB. The VM has no public IP. All application containers use the same origin.

## Product boundary

- The 24 current lessons, their 48 explained quiz questions, growth simulator, and synthetic paper-trading account are free and work without an account or paid data feed.
- An account is optional. Guest lesson progress stays in browser storage. On sign-in, current-curriculum completions merge by lesson ID, retain the best score, and synchronize to MongoDB. The older 30-lesson curriculum remains a separate prior-coursework transcript; it is never mapped into a new lesson completion.
- Paper trades use fictional prices and virtual cash. The example forecast chart is synthetic. Generated forecasts use historical weekly adjusted prices and statistical models; they are estimates, not recommendations or real-money orders.
- Forecast generation is bounded to five requests per minute and `FORECAST_DAILY_LIMIT` accepted requests per rolling 24 hours for one API gateway process (default 25). The limit is shared by all visitors on that process. A multi-instance deployment needs a shared limiter before scaling out. There is no promise of unlimited live forecasts.
- The gateway field `forecastMonths` remains for existing clients. Its integer value is a **weekly** forecast horizon from 1 to 52.

## Capacity and expected cost

The deployment uses services eligible for Google's Always Free allowances, with one Cloud Run instance at most, no minimum instances, a 30 GB standard persistent disk, private VM networking, and five accepted live forecasts per day for the whole deployment. These choices reduce cost but **do not guarantee a zero bill**. Free quotas are shared across projects on the billing account, and public traffic or egress beyond them is billed. Google billing alerts do not automatically stop all usage. Check the project's billing reports regularly and disable public traffic if a strict zero-dollar requirement becomes binding.

A project-scoped monthly $1 billing alert, `PerBillion free-tier watch`, is configured at 50% and 100% of that amount. It is an alert, not a hard spend cap.

| Item | Planning basis | Estimated monthly cost |
| --- | --- | ---: |
| MongoDB VM and disk | [One `e2-micro` in `us-central1` and 30 GB-months of standard persistent disk are Always Free eligible](https://docs.cloud.google.com/free/docs/free-cloud-features). This is a 1 GB RAM pilot database, with limited capacity. | $0 within the shared allowance |
| Cloud Run application | [Request-based free tier](https://cloud.google.com/run/pricing) applies to CPU, memory, and requests. Four sidecars share one instance; cold starts and active requests consume the quota. | $0 within the shared allowance; usage beyond it is billed |
| Private configuration and backups | A private Google Cloud Storage bucket in `us-central1` holds two configuration objects and rolling MongoDB archives. [Cloud Storage's free tier](https://docs.cloud.google.com/free/docs/free-cloud-features) applies if shared storage and operation limits are not exceeded. | $0 within the shared allowance |
| Container images | Images are published as public packages in GitHub Container Registry, avoiding Google Artifact Registry storage usage. | $0 at this pilot scale |
| Network egress | Google includes [limited free outbound transfer](https://cloud.google.com/run/pricing); additional public asset traffic is billed. The VM has no external IPv4 address. | Traffic dependent |
| Historical market data | Alpha Vantage `TIME_SERIES_WEEKLY_ADJUSTED`. The owner confirmed that the key is licensed for public use. The operator must maintain that entitlement. | Per the owner's provider agreement |
| Model inference | Statsmodels runs in the Python Cloud Run container; no third-party model token fee. Five jobs per day is the current deployment-wide limit. | Cloud Run usage above its free tier is billed |

The product stays free to learners. The Spring data fetcher caches up to 100 weekly ticker series for 24 hours per process. Each fresh uncached ticker can still use one provider request. The single-instance forecast limit is held in gateway memory and resets on restart; it is a capacity control, not a billing cap.

## Deployment inputs

1. Keep the restricted MongoDB app user's password, JWT secret, and licensed Alpha Vantage key outside Git. `scripts/gcp/make-private-config.py` writes the two production env files with mode `0600`. Upload them to the bucket `perbillion-free-2026-private`. Its public access prevention is enabled, and only the Cloud Run service identity has object-viewer access. The backup VM identity has object-creator access. The database backup credential uses a separate administrator account stored only on the VM.
2. The VM was created as `perbillion-mongo` in `us-central1-a` with `e2-micro`, 30 GB `pd-standard`, and no external IP. MongoDB 7.0 is installed by `scripts/gcp/install-mongo.sh`, listens on loopback and the private VPC address, uses authentication, and caps WiredTiger cache at 256 MB. The application user has `readWrite` only on the `perbillion` database. Access the VM through IAP SSH. `scripts/gcp/seed-legacy-lessons.cjs` loads the prior 30 lessons and indexes without clearing existing records.
3. GitHub Actions publishes the four container images to `ghcr.io/iamirrf` under a `sha-<commit>` tag. After the release checks pass, deploy that exact SHA with `bash scripts/gcp/deploy-cloud-run.sh <commit-sha>`. The script keeps minimum instances at zero, maximum at one, and connects privately to MongoDB with Direct VPC egress.
4. Cloud Run receives configuration from the private bucket at startup through its service account. The frontend serves `/api` and `/uploads` from the same HTTPS origin. If the public origin changes, regenerate `gateway.env`, update `services/frontend/index.html` social metadata, rebuild the frontend image, and deploy a new revision.

```bash
python3 scripts/gcp/make-private-config.py \
  --app-password-file=/secure/mongo-app-password \
  --jwt-secret-file=/secure/jwt-secret \
  --alpha-env-file=/secure/provider.env \
  --output-dir=/secure/perbillion-config \
  --public-origin=https://perbillion-705825363504.us-central1.run.app
gcloud storage cp /secure/perbillion-config/gateway.env /secure/perbillion-config/spring.env \
  gs://perbillion-free-2026-private/
bash scripts/gcp/deploy-cloud-run.sh <tested-commit-sha>
```

## Release checks

The GitHub release workflow runs frontend build and lint, gateway tests, Java build, Python syntax, then a disposable production Compose smoke test including MongoDB, Spring, Python, account progress, and profile image persistence after a gateway restart. Locally, use Java 21 for Maven. Verify the live deployment:

```bash
curl -fsS https://perbillion-705825363504.us-central1.run.app/api/health
python3 scripts/gcp/live-smoke.py https://perbillion-705825363504.us-central1.run.app
```

In a browser on the actual host, complete a guest lesson, refresh, sign in and check merge status, restore on a second device, export, reset only current progress, verify an old-coursework transcript, change growth inputs, reject invalid virtual orders, place valid virtual orders, and exercise forecast pending, completion, error, timeout, and cancellation states. Check desktop and phone widths, keyboard focus, reduced motion, unavailable services, and social preview metadata. A live four-week AAPL forecast completed successfully on 2026-10-25. Confirm no browser runtime errors or horizontal overflow.

## Monitoring and rollback

- Watch Cloud Run 5xx/429 rates, forecast completion and duration, model memory/CPU, provider quota errors, MongoDB health, progress-sync errors, backup jobs, and actual billing. Do not send lesson answers or account tokens to analytics. Measure aggregate lesson starts, completions, and return visits only after choosing a privacy policy and consent approach.
- The VM's `/usr/local/bin/perbillion-backup` runs daily via cron and writes compressed MongoDB archives to `gs://perbillion-free-2026-private/backups/`. The bucket lifecycle removes backup objects after seven days. Test restore into a separate database with `mongorestore --config=/etc/perbillion/mongodump.yaml --gzip --archive=<downloaded-archive> --nsFrom='perbillion.*' --nsTo='perbillion_restore_check.*'`; verify counts and indexes, then remove only that test database. On 2026-10-25, a backup restored 35 documents, including all 30 prior lessons, account progress, an avatar, and a forecast, with zero failures. For a real incident, inspect the separate restore before replacing production data. A new VM also needs fresh MongoDB administrator and app users because the backup covers the `perbillion` database, not the `admin` database.
- If an app revision fails, use `gcloud run revisions list --service=perbillion --region=us-central1 --project=perbillion-free-2026` to find the previous healthy revision, then `gcloud run services update-traffic perbillion --to-revisions=<previous-revision>=100 --region=us-central1 --project=perbillion-free-2026`. Repeat health and live smoke checks. Keep MongoDB intact; `education_progress_v2` is additive and legacy progress remains separate. Restore MongoDB only for a data incident, not for a UI rollback.
- `docker-compose.yml` remains the local development stack. `docker-compose.production.yml` remains a portable single-host production option; it is exercised in CI. The Google deployment uses the same application code in Cloud Run and persistent MongoDB on the free VM.

## Operating limits

There is no custom domain attached. The generated `run.app` hostname is the public origin. The deployed single `e2-micro` database is a limited pilot, not a high-availability database. Forecast requests, account data, and profile images depend on that VM and its rolling backups. Raise capacity and add stronger availability only after measuring traffic and approving a paid hosting budget.
