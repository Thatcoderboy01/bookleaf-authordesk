# Deployment Guide: BookLeaf AuthorDesk

This document outlines the deployment strategy, runtime requirements, and configuration prerequisites for hosting BookLeaf AuthorDesk in staging and production environments.

---

## 1. Runtime & Infrastructure Requirements

- **Node.js Environment:** Node.js `v20.x` or later.
- **Database Server:** MySQL `8.0` or later (or AWS RDS / GCP Cloud SQL for MySQL).
- **Process Manager:** `pm2`, Docker, or container orchestration (Kubernetes, AWS ECS, Google Cloud Run).
- **Static Hosting / Reverse Proxy:** Nginx, Caddy, Cloudflare Pages, or AWS S3 + CloudFront.

---

## 2. Environment Variables Checklist

### Backend Production Configuration (`server/.env`)
- `NODE_ENV=production`
- `PORT=5000`
- `CLIENT_URL=https://authordesk.bookleafpub.com` (Set to exact deployed frontend domain)
- `DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/bookleaf_authordesk?sslaccept=strict"`
- `JWT_SECRET="<generate-high-entropy-64-char-secret>"`
- `JWT_EXPIRES_IN=1d`
- `GEMINI_API_KEY="<production-google-ai-studio-api-key>"`
- `GEMINI_MODEL="gemini-3.6-flash"`

### Frontend Production Configuration (`client/.env`)
- `VITE_API_BASE_URL="https://api.authordesk.bookleafpub.com/api"`

---

## 3. Production Build & Execution

### Backend
```bash
cd server
npm ci --omit=dev
npx prisma migrate deploy
node src/server.js
```

### Frontend
```bash
cd client
npm ci
npm run build
# Built static assets reside in client/dist/
```

---

## 4. Single-Page Application (SPA) Routing Configuration

Because BookLeaf AuthorDesk uses the browser's HTML5 History API (`/author/*`, `/admin/*`, `/login`), web servers must route non-file requests to `index.html`.

### Nginx Example
```nginx
server {
    listen 80;
    server_name authordesk.bookleafpub.com;
    root /var/www/bookleaf-authordesk/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
