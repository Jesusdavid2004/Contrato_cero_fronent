#!/bin/sh
set -eu
# Renders the nginx config from environment (Railway assigns PORT dynamically
# and exposes the backend through its private DNS name) and starts nginx.
# Defaults keep docker-compose working unchanged (listen 80, backend:3001).
: "${PORT:=80}"
: "${BACKEND_HOST:=backend}"
: "${BACKEND_PORT:=3001}"
# Nginx needs an explicit resolver IP when proxy_pass uses a variable.
# Railway injects its internal DNS into resolv.conf, which already resolves
# *.railway.internal. Every nameserver is kept (IPv6 literals need brackets,
# otherwise nginx reads "fd12::10" as address "fd12" with port "10" and dies
# with "invalid port in resolver"). Fall back to Docker's embedded DNS.
# RESOLV_CONF exists only to test this block without touching /etc.
if [ -z "${RESOLVER:-}" ]; then
  RESOLV_CONF="${RESOLV_CONF:-/etc/resolv.conf}"
  nameservers="$(awk '/^nameserver[[:space:]]+/{print $2}' "$RESOLV_CONF" 2>/dev/null || true)"
  formatted=""
  # shellcheck disable=SC2086
  for ns in $nameservers; do
    case "$ns" in
      *:*)
        formatted="$formatted [$ns]"
        ;;
      *)
        formatted="$formatted $ns"
        ;;
    esac
  done
  # shellcheck disable=SC2086
  RESOLVER="$(printf '%s' "$formatted" | sed 's/^ //')"
  if [ -z "$RESOLVER" ]; then
    RESOLVER="127.0.0.11"
  fi
fi
export PORT BACKEND_HOST BACKEND_PORT RESOLVER
envsubst '${PORT} ${BACKEND_HOST} ${BACKEND_PORT} ${RESOLVER}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf
nginx -t
exec nginx -g 'daemon off;'
