# Kill any existing Node processes
taskkill /F /IM node.exe 2>$null

# Wait a moment
Start-Sleep -Seconds 2

# Clear .next cache
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
}

# Start the server using the local Next.js version
Write-Host "Starting AssetTRAC development server..."
Write-Host "Using Next.js 12.3.0 (as specified in package.json)"
Write-Host "Server will be available at: http://localhost:3000"
Write-Host ""

# Use the local node_modules version
& ".\node_modules\.bin\next" dev -p 3000
