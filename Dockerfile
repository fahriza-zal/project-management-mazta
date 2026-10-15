# syntax=docker/dockerfile:1

# ============================================================
# Stage 1 — Build (Vite menghasilkan static files ke /dist)
# ============================================================
# Node sesuai engines di package.json (^18 || ^20 || >=22).
FROM node:22-alpine AS build

WORKDIR /app

# Install deps dulu (layer ini di-cache selama lockfile tidak berubah).
COPY package.json package-lock.json ./
RUN npm ci

# --- Konfigurasi env (di-bake saat build) ------------------------------
# Nilai ini client-side (ter-bundle ke JS browser), jadi di-set di sini
# sebagai ENV. vite loadEnv() membaca process.env; project ini meng-expose
# prefix VITE_ dan API_ (lihat envPrefix di vite.config.js), sehingga .env
# TIDAK perlu ikut ke build context.
#
# API_GATEWAY  → endpoint GraphQL (HTTP) sekaligus sumber URL WebSocket
#                (wss:// diturunkan dari sini di apolloClient.js).
# VITE_FIREBASE_* → config Firebase Cloud Messaging (web push), bersifat publik.
ARG API_GATEWAY
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_VAPID_KEY

ENV API_GATEWAY=$API_GATEWAY \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY

# Salin sisa source lalu build (env di atas sudah tersedia).
COPY . .
RUN npm run build

# ============================================================
# Stage 2 — Serve (nginx menyajikan SPA, history-mode fallback)
# ============================================================
FROM nginx:alpine AS runtime

# Konfigurasi nginx untuk SPA (Vue Router history mode) di-inline supaya
# repo cukup punya Dockerfile + .dockerignore (tanpa file nginx terpisah).
# Produksi: Apollo client menembak API_GATEWAY (HTTP + WS) secara langsung,
# jadi nginx TIDAK perlu mem-proxy /graphql — hanya serve static + fallback
# ke index.html.
RUN printf '%s\n' \
    'server {' \
    '    listen       80;' \
    '    server_name  _;' \
    '    root   /usr/share/nginx/html;' \
    '    index  index.html;' \
    '    gzip on;' \
    '    gzip_vary on;' \
    '    gzip_min_length 1024;' \
    '    gzip_types text/plain text/css application/javascript application/json image/svg+xml application/wasm;' \
    '    location / {' \
    '        try_files $uri $uri/ /index.html;' \
    '    }' \
    '    location = /firebase-messaging-sw.js {' \
    '        add_header Cache-Control "no-cache, no-store, must-revalidate";' \
    '    }' \
    '    location /assets/ {' \
    '        access_log off;' \
    '        expires 1y;' \
    '        add_header Cache-Control "public, immutable";' \
    '    }' \
    '}' > /etc/nginx/conf.d/default.conf

# Hanya hasil build yang masuk image final (tanpa node_modules / .env).
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
