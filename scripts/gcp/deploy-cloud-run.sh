#!/usr/bin/env bash
set -euo pipefail

revision_sha=${1:?Pass the tested Git commit SHA used to publish the four GHCR images}
project=perbillion-free-2026
region=us-central1
bucket=perbillion-free-2026-private
image_base=ghcr.io/iamirrf
tag=sha-$revision_sha

gcloud run deploy perbillion \
  --project="$project" --region="$region" --quiet \
  --execution-environment=gen2 \
  --service-account="perbillion-app@$project.iam.gserviceaccount.com" \
  --allow-unauthenticated --ingress=all \
  --min-instances=0 --max-instances=1 --concurrency=8 --timeout=300s \
  --cpu-throttling --no-cpu-boost \
  --network=default --subnet=default --vpc-egress=private-ranges-only \
  --container=frontend \
    --image="$image_base/perbillion-frontend:$tag" \
    --port=80 --cpu=1 --memory=512Mi \
    --startup-probe='httpGet.path=/api/health,httpGet.port=80,periodSeconds=10,timeoutSeconds=5,failureThreshold=30' \
  --container=gateway \
    --image="$image_base/perbillion-api-gateway:$tag" \
    --cpu=1 --memory=512Mi \
    --set-env-vars="PRIVATE_CONFIG_BUCKET=$bucket" \
  --container=spring \
    --image="$image_base/perbillion-spring-orchestrator:$tag" \
    --cpu=1 --memory=1Gi \
    --set-env-vars="PRIVATE_CONFIG_BUCKET=$bucket" \
  --container=ml \
    --image="$image_base/perbillion-ml-engine:$tag" \
    --cpu=1 --memory=1536Mi \
    --set-env-vars='WEB_CONCURRENCY=1,GUNICORN_THREADS=2,OMP_NUM_THREADS=1,OPENBLAS_NUM_THREADS=1'

gcloud run services describe perbillion --project="$project" --region="$region" \
  --format='value(status.url)'
