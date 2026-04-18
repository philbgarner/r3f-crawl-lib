#!/usr/bin/env bash
set -e

TAG="$1"

if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Usage: ./scripts/release.sh v#.#.#"
  exit 1
fi

npm version "$TAG" --no-git-tag-version

npm run build
npm run build:server

git add package.json package-lock.json
git add -f dist/
git commit -m "build: $TAG"

git tag "$TAG"
git push origin HEAD
git push origin "$TAG"

echo "Released $TAG"
