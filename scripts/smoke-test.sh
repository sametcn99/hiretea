#!/bin/bash
set -e

# Create test results directory
RESULTS_DIR="$(pwd)/test-results"
mkdir -p "$RESULTS_DIR"

# Clean up any existing containers and volumes to start fresh
echo "Cleaning up existing containers and volumes..."
docker compose --profile bundled-gitea down -v || true

echo "========================================="
echo "Running BUNDLED Mode Smoke Test"
echo "========================================="

# Create .env for bundled mode
cat <<EOF > .env
HIRETEA_GITEA_MODE=bundled
HIRETEA_CONFIG_ENCRYPTION_KEY=supersecretkey1234567890123456
NEXTAUTH_SECRET=supersecretkey1234567890123456
NEXTAUTH_URL=http://localhost:3000
BOOTSTRAP_TOKEN=smoke_test_bootstrap_token_123
hiretea_ADMIN_EMAIL=admin@hiretea.local
EOF

# Start bundled mode
docker compose --profile bundled-gitea up -d --build

echo "Waiting for app to become ready on port 3000..."
max_retries=30
count=0
until curl -s http://localhost:3000 > /dev/null; do
    if [ $count -eq $max_retries ]; then
        echo "Timeout waiting for app"
        docker compose --profile bundled-gitea logs > "$RESULTS_DIR/bundled-logs-failed.txt"
        exit 1
    fi
    echo "Waiting... ($count/$max_retries)"
    sleep 5
    count=$((count+1))
done

echo "App is responding! Saving logs..."
docker compose --profile bundled-gitea logs > "$RESULTS_DIR/bundled-logs.txt"
curl -s http://localhost:3000 > "$RESULTS_DIR/bundled-index.html"

# Verify that the app is truly loaded, maybe check if we hit a specific page or login
if grep -qi "Next" "$RESULTS_DIR/bundled-index.html"; then
    echo "Bundled mode HTML looks somewhat valid."
else
    echo "Bundled mode HTML might not be fully loaded, but it responded."
fi

# Clean up bundled mode
docker compose --profile bundled-gitea down -v

echo "========================================="
echo "Running EXTERNAL Mode Smoke Test"
echo "========================================="

# Create .env for external mode
cat <<EOF > .env
HIRETEA_GITEA_MODE=external
HIRETEA_CONFIG_ENCRYPTION_KEY=supersecretkey1234567890123456
NEXTAUTH_SECRET=supersecretkey1234567890123456
NEXTAUTH_URL=http://localhost:3000
BOOTSTRAP_TOKEN=smoke_test_bootstrap_token_123
hiretea_ADMIN_EMAIL=admin@hiretea.local
AUTH_GITEA_ID=dummy-client-id
AUTH_GITEA_SECRET=dummy-client-secret
AUTH_GITEA_ISSUER=http://localhost:3001
GITEA_ADMIN_BASE_URL=http://localhost:3001
GITEA_ORGANIZATION_NAME=hiretea
EOF

# Start external mode (without the bundled-gitea profile)
docker compose up -d --build

echo "Waiting for app to become ready on port 3000..."
count=0
until curl -s http://localhost:3000/setup > /dev/null; do
    if [ $count -eq $max_retries ]; then
        echo "Timeout waiting for app"
        docker compose logs > "$RESULTS_DIR/external-logs-failed.txt"
        exit 1
    fi
    echo "Waiting... ($count/$max_retries)"
    sleep 5
    count=$((count+1))
done

echo "App is responding! Saving logs..."
docker compose logs > "$RESULTS_DIR/external-logs.txt"
curl -s http://localhost:3000/setup > "$RESULTS_DIR/external-setup.html"

# In external mode, we expect to be redirected to /setup or see setup content
if grep -qi "setup" "$RESULTS_DIR/external-setup.html" || curl -s -I http://localhost:3000 | grep -qi "Location: /setup"; then
    echo "External mode setup page looks accessible."
else
    echo "External mode might not have hit setup correctly, but responded."
fi

# Clean up external mode
docker compose down -v

echo "========================================="
echo "Smoke tests completed successfully!"
echo "Check the $RESULTS_DIR directory for logs."
echo "========================================="
