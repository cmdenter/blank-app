# Security Policy

## Overview

This application follows security best practices for handling sensitive configuration data. All API keys, tokens, and secrets are managed through Streamlit's secrets management system or environment variables.

## Current Security Status

### ✅ No API Keys Required (Current Implementation)

The app currently uses **Yahoo Finance (yfinance)**, which is a free, open-source library that **does not require API keys or authentication**. This means:

- No secrets need to be configured for the app to work
- No API keys to manage or rotate
- No rate limiting concerns for normal use
- Completely free to deploy and use

### 🔐 Security Infrastructure (Future-Ready)

Even though the current implementation doesn't require secrets, we've built in security infrastructure for future extensibility:

1. **Secrets Management Function**: `get_config()` safely retrieves secrets
2. **Dual Support**: Works with both Streamlit secrets and environment variables
3. **Example Configuration**: `.streamlit/secrets.toml.example` shows how to add secrets
4. **Git Protection**: `.streamlit/secrets.toml` is in `.gitignore`

## How Secrets Are Managed

### Local Development

**Option 1: Streamlit Secrets (Recommended)**
```bash
# Create secrets file (already in .gitignore)
cp .streamlit/secrets.toml.example .streamlit/secrets.toml

# Edit and add your keys
nano .streamlit/secrets.toml
```

**Option 2: Environment Variables**
```bash
# Set environment variables
export API_KEY="your_key_here"
export API_SECRET="your_secret_here"

# Run the app
streamlit run lead_lag_app.py
```

### Production Deployment (Streamlit Cloud)

1. Go to your app on Streamlit Community Cloud
2. Click **Settings** → **Secrets**
3. Add secrets in TOML format:

```toml
[your_service]
api_key = "your_actual_key_here"
```

4. Save and redeploy

The app automatically detects and uses these secrets via `st.secrets`.

## Security Best Practices

### ✅ DO

- **Use secrets.toml or environment variables** for all sensitive data
- **Keep .streamlit/secrets.toml in .gitignore** (already configured)
- **Use different keys** for development and production
- **Rotate API keys regularly** if using paid services
- **Use Streamlit Cloud secrets** for deployed applications
- **Review code** before deploying to ensure no hardcoded secrets
- **Limit API key permissions** to minimum required scope

### ❌ DON'T

- **Never hardcode API keys** in source code
- **Never commit secrets.toml** to version control
- **Never share API keys** in public channels (Slack, Discord, GitHub issues)
- **Never use production keys** in development environments
- **Never log or print** API keys or secrets
- **Never expose secrets** in error messages

## Code Review Checklist

Before committing code, verify:

- [ ] No API keys in source code
- [ ] No secrets in comments
- [ ] .gitignore includes .streamlit/secrets.toml
- [ ] All secrets accessed via `get_config()` function
- [ ] No secrets in git history (use git-secrets or gitleaks)

## Adding New Data Providers

If you want to add a new data provider that requires API keys:

### 1. Add to secrets.toml.example

```toml
[new_provider]
api_key = "YOUR_API_KEY_HERE"
```

### 2. Update the app code

```python
# Get API key securely
api_key = get_config("new_provider.api_key")

if not api_key:
    st.warning("⚠️ API key not configured. Add to .streamlit/secrets.toml")
    return None

# Use the API key
response = requests.get(url, headers={"Authorization": f"Bearer {api_key}"})
```

### 3. Document in README

Update the README with:
- How to obtain the API key
- Configuration instructions
- Any limitations or rate limits

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Contact the maintainers privately
3. Provide details about the vulnerability
4. Allow time for a fix before public disclosure

## Security Scanning

This repository should be scanned with:

- **git-secrets**: Prevents committing secrets to git
- **gitleaks**: Detects secrets in git history
- **Bandit**: Python security linter
- **Safety**: Checks dependencies for known vulnerabilities

Example CI/CD security checks:

```bash
# Install tools
pip install bandit safety

# Run security scans
bandit -r lead_lag_app.py
safety check --json
```

## Dependency Security

All dependencies are pinned with minimum versions in `requirements.txt`:

```
streamlit>=1.28.0
yfinance>=0.2.28
...
```

### Updating Dependencies

```bash
# Check for security updates
pip list --outdated

# Update requirements
pip install --upgrade -r requirements.txt

# Test the app
streamlit run lead_lag_app.py

# Update requirements.txt
pip freeze > requirements.txt
```

## Compliance

This application:

- ✅ Does not store user data
- ✅ Does not collect personal information
- ✅ Uses publicly available financial data
- ✅ Follows OWASP security guidelines
- ✅ Implements least privilege for API access
- ✅ Uses HTTPS for all external API calls (via yfinance)

## License

This security policy is part of the MIT licensed project.

## Questions?

For security questions or concerns, please review:
1. This SECURITY.md file
2. .streamlit/secrets.toml.example
3. README.md deployment section
