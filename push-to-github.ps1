# Argus -> GitHub: fresh init + first push
# Run from: C:\Workspace\apps\argus
# Usage:    powershell -ExecutionPolicy Bypass -File .\push-to-github.ps1

$ErrorActionPreference = "Stop"
Set-Location -Path "C:\Workspace\apps\argus"

Write-Host "==> Cleaning up sandbox leftover (.git-test)..."
if (Test-Path ".git-test") { Remove-Item -Force ".git-test" }

Write-Host "==> Removing any lingering .git directory..."
if (Test-Path ".git") { Remove-Item -Recurse -Force ".git" }

Write-Host "==> git init (branch: main)..."
git init -b main

Write-Host "==> Configuring local commit identity..."
git config user.email "u9006205@gmail.com"
git config user.name  "Jeff Yang"

Write-Host "==> Staging all files (respecting .gitignore)..."
git add -A

Write-Host "==> Files to be committed:"
git status --short | Select-Object -First 20
$total = (git status --short | Measure-Object -Line).Lines
Write-Host "    ... $total entries total"

Write-Host "==> Initial commit..."
git commit -m "chore: initial commit (fresh history) - argus satellite/event tracker"

Write-Host "==> Adding remote: https://github.com/Restip2745/argus.git"
git remote add origin https://github.com/Restip2745/argus.git

Write-Host "==> Pushing to origin/main..."
git push -u origin main

Write-Host ""
Write-Host "Done. Repo is now live at https://github.com/Restip2745/argus" -ForegroundColor Green
