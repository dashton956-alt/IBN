# HashiCorp Vault Secrets Setup Guide

This guide provides step-by-step instructions for securely storing and retrieving secrets in HashiCorp Vault for your IBN stack.

---

## 1. Start Vault and Vault-UI

```pwsh
# In your IBN directory
# Start Vault and Vault-UI
# (Make sure vault-docker-compose.yml is configured)
docker compose -f vault-docker-compose.yml up -d
```

- Vault UI: http://localhost:8083
- Vault API: http://localhost:8200

---

## 2. Log In to Vault-UI

1. Open http://localhost:8083 in your browser.
2. Use Vault Address: `http://vault:8200` (or `http://localhost:8200` if configured)
3. Use Token: `root` (default for dev mode)

---

## 3. Enable KV Secrets Engine (if not enabled)

1. In Vault-UI, go to "Secrets Engines".
2. Enable a new "Key/Value" engine at path `secret/` (default).

---

## 4. Add Secrets to Vault

For each secret, use a clear path and key name. Example paths:

- `intent-nexus/NSO_API_KEY`
- `intent-nexus/NETBOX_API_TOKEN`
- `django/SECRET_KEY`
- `monitor-stack/MYSQL_ROOT_PASSWORD`
- `netbox/db_password`
- `netbox/secret_key`
- `netbox/redis_password`
- `netbox/email_password`
- `ldap/auth_ldap_bind_password`
- `grafana/GF_SECURITY_ADMIN_PASSWORD`

### Steps:
1. In Vault-UI, go to "Secrets" > "KV".
2. Click "Create Secret" or "Add Secret".
3. Enter the path (e.g., `intent-nexus/NSO_API_KEY`).
4. Add key-value pairs (e.g., `value: your_actual_api_key`).
5. Save.

---

## 5. Retrieve Secrets in Your Code

- Use Vault HTTP API or a Vault client library to fetch secrets at runtime.
- Example API call:

```bash
curl \
  --header "X-Vault-Token: root" \
  --request GET \
  http://localhost:8200/v1/secret/data/intent-nexus/NSO_API_KEY
```

- Integrate with your backend/frontend using environment variables or direct API calls.

---

## 6. Update Application Configs

- Remove hardcoded secrets from code and .env files.
- Update your apps to fetch secrets from Vault at startup or runtime.
- Example: Use a secretsService or Vault client in Python, Node.js, etc.

---

## 7. Best Practices

- Use descriptive paths for secrets.
- Restrict access to Vault and tokens.
- Rotate secrets regularly.
- Never commit secrets to version control.
- Document new secrets and update this guide as needed.

---

## 8. Common Secrets to Store

| Path                        | Key/Value Example                | Description                  |
|-----------------------------|----------------------------------|------------------------------|
| intent-nexus/NSO_API_KEY    | value: <nso_api_key>             | NSO API Key                  |
| intent-nexus/NETBOX_API_TOKEN | value: <netbox_token>           | NetBox API Token             |
| intent-nexus/GITLAB_TOKEN   | value: <gitlab_token>            | GitLab Token                 |
| intent-nexus/OPENAI_API_KEY | value: <openai_key>              | OpenAI API Key               |
| django/SECRET_KEY           | value: <django_secret_key>       | Django Secret Key            |
| monitor-stack/MYSQL_ROOT_PASSWORD | value: <mysql_root_pw>      | MySQL Root Password          |
| netbox/db_password          | value: <db_password>             | NetBox DB Password           |
| netbox/secret_key           | value: <netbox_secret_key>       | NetBox Secret Key            |
| netbox/redis_password       | value: <redis_password>          | NetBox Redis Password        |
| netbox/email_password       | value: <email_password>          | NetBox SMTP Password         |
| ldap/auth_ldap_bind_password| value: <ldap_bind_pw>            | LDAP Bind Password           |
| grafana/GF_SECURITY_ADMIN_PASSWORD | value: <grafana_admin_pw>  | Grafana Admin Password       |

---

## 9. Troubleshooting

- If Vault-UI cannot connect, check VAULT_URL and container status.
- If secrets are not found, check the path and key spelling.
- Use Vault logs and UI for error details.

---

## 10. References

- [Vault Documentation](https://www.vaultproject.io/docs)
- [Vault HTTP API](https://www.vaultproject.io/api-docs)
- [Vault-UI](https://github.com/djenriquez/vault-ui)

---

Update this guide as your stack evolves and new secrets are added.
