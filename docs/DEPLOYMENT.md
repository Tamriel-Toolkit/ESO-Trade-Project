# ESO Trade Platform — Production Deployment Guide

This guide describes production deployment topology, reverse proxy integration, environment configuration, and client-IP rate limiting controls for the **ESO Trade Project** backend and frontend services.

---

## 1. System Architecture & Topology

In a production environment, the ESO Trade Express API should run behind an edge reverse proxy (such as **Nginx**, **Caddy**, **Traefik**, or **AWS Application Load Balancer**) with optional CDN/WAF termination (e.g., **Cloudflare**).

```
[ Clients / In-Game Addon Watcher ]
                │
                ▼ (HTTPS / Port 443)
┌─────────────────────────────────────────┐
│       Edge Reverse Proxy / WAF          │
│   (Nginx / Caddy / Cloudflare / ALB)    │
│  - SSL/TLS Termination                  │
│  - Appends Client IP to X-Forwarded-For │
│  - Sets X-Forwarded-Proto: https        │
└───────────────────┬─────────────────────┘
                    │
                    ▼ (HTTP / Port 5001)
┌─────────────────────────────────────────┐
│           Express API Server            │
│  - Validated `TRUST_PROXY` config       │
│  - Per-Client IP Rate Limiting          │
│  - HttpOnly SameSite=None Auth Cookies  │
│  - SQLite Persistent Storage            │
└─────────────────────────────────────────┘
```

---

## 2. Express Proxy Trust (`TRUST_PROXY`)

Express defaults to `trust proxy: false`. When exposed directly to the internet, this protects against spoofed `X-Forwarded-For` request headers. However, when deployed behind a reverse proxy, leaving `trust proxy: false` causes all incoming connections to appear from the proxy's IP address (e.g., `127.0.0.1`), resulting in:
1. **False-Positive Global Throttling**: Every user shares the same rate-limit bucket (`generalLimiter`: 100 req/min, `authLimiter`: 10 req/min). If a single user or scanner triggers the limit, all users worldwide are locked out.
2. **Loss of Audit Trails**: Server logs and authentication records cannot distinguish distinct users.

### Supported `TRUST_PROXY` Values

Configure `TRUST_PROXY` in `backend/.env` according to your specific network topology:

| Topology | `TRUST_PROXY` Setting | How It Works |
|---|---|---|
| **Direct Internet-Facing** (No reverse proxy) | `false` *(default)* | Socket remote address is used. All incoming `X-Forwarded-*` headers are ignored. |
| **Single Reverse Proxy Hop** (Nginx / Caddy / ALB directly in front of Node) | `1` | Express trusts the rightmost proxy hop and derives `req.ip` from the last IP appended to `X-Forwarded-For`. Upstream spoofed headers are ignored. |
| **Dual-Hop / CDN + Proxy** (Cloudflare → Nginx → Node) | `2` | Express trusts 2 hops from the back, properly attributing the end client IP. |
| **Localhost Reverse Proxy** (Nginx on same machine) | `loopback` | Express only trusts forwarded headers when the incoming connection is from `127.0.0.1` or `::1`. |
| **Container Subnets** (Docker Bridge / Kubernetes Pods) | `loopback, 10.0.0.0/8, 172.16.0.0/12` | Express trusts forwarded headers only when arriving from private subnet addresses. |
| **Fully Isolated Private Network** | `true` | Trusts all hops. **WARNING**: Use only in air-gapped or strictly firewall-isolated networks. |

> [!IMPORTANT]
> Invalid or malformed `TRUST_PROXY` values (such as non-numeric strings, negative hop counts, or unparsable IP ranges) **fail fast** and terminate server initialization immediately with a fatal error to prevent running with insecure defaults.

---

## 3. Reverse Proxy Configuration Examples

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.esomarketplace.example.com;

    ssl_certificate /etc/letsencrypt/live/api.esomarketplace.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.esomarketplace.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;

        # WebSocket & connection upgrade support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Forwarded identity headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

With the Nginx configuration above, set:
```ini
TRUST_PROXY=1
```

### Caddy Configuration

```caddy
api.esomarketplace.example.com {
    reverse_proxy 127.0.0.1:5001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

With Caddy, set:
```ini
TRUST_PROXY=1
```

---

## 4. Rate Limiting Specifications

The backend applies multi-tier IP rate limits via `express-rate-limit` based on `req.ip`:

1. **General API Limiter (`/api/`)**:
   - Limit: **100 requests per minute** per client IP.
   - Headers: Returns standard `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers.
2. **Authentication Limiter (`/api/auth/`)**:
   - Limit: **10 attempts per minute** per client IP.
   - Purpose: Mitigates credential stuffing, password brute-forcing, and registration flooding.
3. **Batch Upload Limiter (`/api/market/upload-scans`)**:
   - Limit: **10 batch uploads per minute** per client IP.
   - Purpose: Protects SQLite transactional write pipelines from ingestion storms.

When `TRUST_PROXY` is configured correctly, rate limits apply to the genuine client's IP address rather than the reverse proxy's address.

---

## 5. Deployment Verification Checklist

Before opening the API to production traffic, verify:

- [ ] `NODE_ENV=production` is set in `backend/.env`.
- [ ] `FRONTEND_URL` matches the canonical frontend origin (e.g. `https://esomarketplace.example.com`).
- [ ] `TRUST_PROXY` is set to `1` (or matching hop count / subnet).
- [ ] `ENABLE_DEV_ENDPOINTS` is absent or set to `false`.
- [ ] `npm test` passes all 56 test suites (including proxy trust validation).
- [ ] A test request through the proxy sends `X-Forwarded-For` and logs the correct client IP.
