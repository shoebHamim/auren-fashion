#!/usr/bin/env sh
# Creates the local buckets (idempotent). Production uses Cloudflare R2 buckets created once by hand.
set -eu
for bucket in auren-public-media auren-private-docs; do
  printf 's3.bucket.create -name %s\n' "$bucket" | docker compose exec -T storage weed shell -master=localhost:9333 >/dev/null 2>&1 || true
done
docker compose exec -T storage sh -c 'printf "s3.bucket.list\n" | weed shell -master=localhost:9333' | grep -E 'auren-(public-media|private-docs)'
