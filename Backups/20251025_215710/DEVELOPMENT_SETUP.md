# AssetTRAC Development Setup

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)
```powershell
npm run dev:full
```
This will automatically:
- Kill existing Node processes
- Clean build cache
- Fix Supabase imports
- Install dependencies
- Start the development server

### Option 2: Manual Setup
```powershell
# 1. Kill existing processes
taskkill /f /im node.exe

# 2. Clean build cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# 3. Fix Supabase imports
npm run fix-imports

# 4. Start development server
npm run dev
```

### Option 3: Clean Development
```powershell
npm run dev:clean
```
This will fix imports and start the server in one command.

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run dev:clean` | Fix imports + start server |
| `npm run dev:full` | Full automated setup |
| `npm run dev:force` | Kill port 3000 + start server |
| `npm run fix-imports` | Fix Supabase import issues |
| `npm run build` | Build for production |
| `npm run start` | Start production server |

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Module not found: Can't resolve 'lib/supabaseClient'"
**Solution:** Run the fix script
```powershell
npm run fix-imports
```

#### 2. "Port 3000 is already in use"
**Solution:** Use the force script
```powershell
npm run dev:force
```

#### 3. "Internal server error" on login
**Solution:** Run full cleanup
```powershell
npm run dev:full
```

#### 4. "Failed to compile" errors
**Solution:** Clean and rebuild
```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev:clean
```

### Manual Fixes

If the automated scripts don't work, you can manually fix issues:

1. **Kill all Node processes:**
   ```powershell
   taskkill /f /im node.exe
   ```

2. **Clean build cache:**
   ```powershell
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   ```

3. **Check port availability:**
   ```powershell
   netstat -ano | findstr :3000
   ```

4. **Verify server is running:**
   ```powershell
   try { $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5; Write-Host "Server Status: $($response.StatusCode)" } catch { Write-Host "Server Error: $($_.Exception.Message)" }
   ```

## 📁 Files Created for Permanent Solution

- `fix-supabase-imports.js` - Automated script to fix Supabase import issues
- `start-dev.ps1` - PowerShell script for full development setup
- `DEVELOPMENT_SETUP.md` - This documentation

## 🔄 How the Fix Works

The `fix-supabase-imports.js` script:

1. **Identifies problematic files** with old Supabase imports
2. **Calculates correct import paths** based on file location
3. **Replaces createClient imports** with shared client imports
4. **Fixes database operations** to use correct clients:
   - `supabase()` for auth operations
   - `supabaseAdmin()` for database operations
5. **Cleans up duplicate imports** and unused code

## 🎯 Best Practices

1. **Always use the automated scripts** instead of manual commands
2. **Run `npm run dev:full`** when encountering persistent issues
3. **Check the console output** for any error messages
4. **Verify the server is responding** before testing the application

## 🆘 Emergency Reset

If everything fails, run this complete reset:

```powershell
# Kill all processes
taskkill /f /im node.exe

# Clean everything
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# Reinstall and start
npm install
npm run dev:full
```

This setup ensures a reliable development environment and prevents the common Supabase client issues from recurring.
