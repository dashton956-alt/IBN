#!/bin/sh
# Vault OIDC setup script for Keycloak integration

set -e

VAULT_ADDR="http://localhost:8200"
OIDC_DISCOVERY_URL="http://keycloak:8080/realms/IBN"
OIDC_CLIENT_ID="vault-client"
OIDC_CLIENT_SECRET="REPLACE_WITH_CLIENT_SECRET"
REDIRECT_URI="http://localhost:8200/ui/vault/auth/oidc/oidc/callback"

vault auth enable oidc || true

vault write auth/oidc/config \
    oidc_discovery_url="$OIDC_DISCOVERY_URL" \
    oidc_client_id="$OIDC_CLIENT_ID" \
    oidc_client_secret="$OIDC_CLIENT_SECRET" \
    default_role="default"

vault write auth/oidc/role/default \
    bound_audiences="$OIDC_CLIENT_ID" \
    allowed_redirect_uris="$REDIRECT_URI" \
    user_claim="preferred_username" \
    policies="default"

echo "Vault OIDC setup complete."
