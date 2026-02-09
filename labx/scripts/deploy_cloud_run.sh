#!/usr/bin/env bash
# Deploy labx FastAPI service to Google Cloud Run.
#
# Prerequisites:
#   - gcloud CLI authenticated: gcloud auth login
#   - Project set: gcloud config set project medward-pro
#   - APIs enabled: Cloud Run, Cloud Build, Container Registry
#   - ANTHROPIC_API_KEY set as a Secret Manager secret
#
# Usage:
#   ./scripts/deploy_cloud_run.sh

set -euo pipefail

PROJECT_ID="${GCP_PROJECT:-medward-pro}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE_NAME="labx"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

cd "$(dirname "$0")/.."

echo "=== Building Docker image ==="
gcloud builds submit \
  --tag "${IMAGE}:latest" \
  --project "${PROJECT_ID}" \
  -f docker/Dockerfile \
  .

echo "=== Deploying to Cloud Run ==="
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}:latest" \
  --region "${REGION}" \
  --platform managed \
  --memory 1Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 120 \
  --set-secrets "ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest" \
  --allow-unauthenticated \
  --project "${PROJECT_ID}"

echo ""
echo "=== Deployment complete ==="
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --project "${PROJECT_ID}" \
  --format 'value(status.url)')
echo "Service URL: ${SERVICE_URL}"
echo "Health check: ${SERVICE_URL}/health"
echo "API docs: ${SERVICE_URL}/docs"
echo ""
echo "To configure the Firebase function to use this service:"
echo "  firebase functions:config:set labx.url=\"${SERVICE_URL}\""
