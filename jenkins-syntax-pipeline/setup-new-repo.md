# Jenkins Syntax Pipeline: New Private Repo & Vault Integration

## 1. Create a New Private GitHub Repo
- Create a new private repository in your GitHub organization/account for sensitive config and automation.
- Add the Jenkins pipeline as a collaborator with write access.

## 2. Store GitHub API Key in Vault
- Add your GitHub API token to Vault for secure access by Jenkins.
- Example Vault path: `secret/ci/github-token`
- Jenkins should be configured to fetch this token at runtime (not hardcoded).

## 3. Jenkinsfile Integration
- The Jenkinsfile uses the `github-token` credential, which should be injected from Vault.
- All PRs, branch creation, and pushes use this token for authentication.

## 4. Security
- No API keys or secrets are stored in the repo or Jenkins config—only in Vault.
- The pipeline will fail if the token is not available from Vault.

---

**Next Steps:**
- Set up Vault integration in Jenkins (e.g., with the HashiCorp Vault plugin or CLI fetch in the pipeline).
- Document the Vault path and access policy for the Jenkins user.
