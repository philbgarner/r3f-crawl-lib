param(
    [Parameter(Mandatory)][string]$Tag
)

if ($Tag -notmatch '^v\d+\.\d+\.\d+$') {
    Write-Error "Usage: .\scripts\release.ps1 v#.#.#"
    exit 1
}

$ErrorActionPreference = 'Stop'

npm version $Tag --no-git-tag-version

npm run build
npm run build:server

git add package.json package-lock.json dist/
git commit -m "build: $Tag"

git tag $Tag
git push origin HEAD
git push origin $Tag

Write-Host "Released $Tag"
