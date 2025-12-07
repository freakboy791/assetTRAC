# AssetTRAC Development Server Startup Script
# This script ensures a clean development environment

Write-Host "🚀 Starting AssetTRAC Development Server..." -ForegroundColor Green
Write-Host ""

# Step 1: Kill any existing Node processes
Write-Host "1️⃣ Killing existing Node.js processes..." -ForegroundColor Yellow
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-Host "   ✅ Killed $($nodeProcesses.Count) Node.js processes" -ForegroundColor Green
    } else {
        Write-Host "   ✅ No Node.js processes found" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Error killing processes: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 2: Check if port 3000 is free
Write-Host "2️⃣ Checking port 3000..." -ForegroundColor Yellow
try {
    $portCheck = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "   ⚠️  Port 3000 is still in use, waiting 3 seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    } else {
        Write-Host "   ✅ Port 3000 is free" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✅ Port 3000 is free" -ForegroundColor Green
}

# Step 3: Clean build cache
Write-Host "3️⃣ Cleaning build cache..." -ForegroundColor Yellow
try {
    if (Test-Path ".next") {
        Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
        Write-Host "   ✅ Removed .next directory" -ForegroundColor Green
    } else {
        Write-Host "   ✅ No .next directory found" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Error cleaning cache: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 4: Fix Supabase imports
Write-Host "4️⃣ Fixing Supabase imports..." -ForegroundColor Yellow
try {
    if (Test-Path "fix-supabase-imports.js") {
        node fix-supabase-imports.js
        Write-Host "   ✅ Supabase imports fixed" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  fix-supabase-imports.js not found, skipping..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Error fixing imports: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 5: Install dependencies (if needed)
Write-Host "5️⃣ Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "   📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "   ✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "   ✅ Dependencies already installed" -ForegroundColor Green
}

# Step 6: Start development server
Write-Host "6️⃣ Starting development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Server will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📝 Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

try {
    npm run dev
} catch {
    Write-Host "❌ Error starting development server: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "   1. Check if all dependencies are installed: npm install" -ForegroundColor White
    Write-Host "   2. Check for TypeScript errors: npm run build" -ForegroundColor White
    Write-Host "   3. Check if port 3000 is available: netstat -ano | findstr :3000" -ForegroundColor White
    Write-Host "   4. Try running the fix script manually: node fix-supabase-imports.js" -ForegroundColor White
}
