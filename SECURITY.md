# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest (`main`) | ✅ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please open a [GitHub Security Advisory](https://github.com/pwd-taly/meta-ads-crm/security/advisories/new) or email the maintainers directly.

Include as much detail as possible:
- Type of vulnerability (e.g. XSS, CSRF, injection)
- File path(s) and line number(s)
- Steps to reproduce
- Potential impact

You can expect an acknowledgement within **48 hours** and a resolution or mitigation plan within **7 days**.

## Security Best Practices for Deployment

- **Never commit `.env` or `.env.local`** — they are git-ignored by default
- **Use a strong, random `JWT_SECRET`** — minimum 32 characters (e.g. `openssl rand -base64 32`)
- **Rotate credentials** if you suspect any secret has been exposed
- **Use HTTPS** in production — the app sets HSTS headers automatically
- **Set `META_APP_SECRET`** to enable HMAC-SHA256 webhook signature verification
