# Clean Track Buddy - Release Script
# This script helps automate the release process

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [string]$ReleaseNotes = "Bug fixes and improvements"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting release process for version $Version" -ForegroundColor Cyan

# 1. Update version in all files
Write-Host "`n📝 Updating version numbers..." -ForegroundColor Yellow

# Update package.json
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$packageJson.version = $Version
$packageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json"

# Update tauri.conf.json
$tauriConf = Get-Content "src-tauri/tauri.conf.json" -Raw | ConvertFrom-Json
$tauriConf.version = $Version
$tauriConf | ConvertTo-Json -Depth 100 | Set-Content "src-tauri/tauri.conf.json"

# Update Cargo.toml
$cargoToml = Get-Content "src-tauri/Cargo.toml" -Raw
$cargoToml = $cargoToml -replace 'version = ".*"', "version = `"$Version`""
$cargoToml | Set-Content "src-tauri/Cargo.toml"

Write-Host "✅ Version updated to $Version" -ForegroundColor Green

# 2. Build the app
Write-Host "`n🔨 Building application..." -ForegroundColor Yellow
npm run tauri build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed" -ForegroundColor Green

# 3. Sign the installers
Write-Host "`n🔐 Signing installers..." -ForegroundColor Yellow

$keyPath = "$env:USERPROFILE\.tauri\clean-track-buddy.key"

if (-not (Test-Path $keyPath)) {
    Write-Host "❌ Private key not found at $keyPath" -ForegroundColor Red
    Write-Host "Please generate keys first using: npm run tauri signer generate -- -w $keyPath" -ForegroundColor Yellow
    exit 1
}

# Find and sign MSI installer
$msiPath = Get-ChildItem "src-tauri\target\release\bundle\msi\*.msi" | Select-Object -First 1

if ($msiPath) {
    Write-Host "Signing: $($msiPath.Name)" -ForegroundColor Cyan
    npm run tauri signer sign $keyPath --file $msiPath.FullName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MSI signed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to sign MSI" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️  No MSI installer found" -ForegroundColor Yellow
}

# 4. Generate latest.json
Write-Host "`n📄 Generating latest.json..." -ForegroundColor Yellow

$sigPath = Get-ChildItem "src-tauri\target\release\bundle\msi\*.msi.sig" | Select-Object -First 1

if ($sigPath) {
    $signature = Get-Content $sigPath.FullName -Raw
    $msiName = $msiPath.Name
    
    $latestJson = @{
        version = $Version
        notes = $ReleaseNotes
        pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        platforms = @{
            "windows-x86_64" = @{
                signature = $signature.Trim()
                url = "https://github.com/gerigazda0/clean-track-buddy/releases/download/v$Version/$msiName"
            }
        }
    } | ConvertTo-Json -Depth 100
    
    $latestJson | Set-Content "src-tauri\target\release\bundle\latest.json"
    Write-Host "✅ latest.json created" -ForegroundColor Green
} else {
    Write-Host "❌ Signature file not found" -ForegroundColor Red
    exit 1
}

# 5. Summary
Write-Host "`n✨ Release preparation complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Create a new release on GitHub with tag: v$Version"
Write-Host "2. Upload these files from src-tauri\target\release\bundle\:"
Write-Host "   - msi\$msiName"
Write-Host "   - msi\$msiName.sig"
Write-Host "   - latest.json"
Write-Host "3. Add release notes and publish"
Write-Host "`n📦 Files are ready in: src-tauri\target\release\bundle\" -ForegroundColor Yellow
