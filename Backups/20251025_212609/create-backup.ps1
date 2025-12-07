# AssetTRAC Backup Script
# Creates timestamped backup with automatic cleanup (keeps 5 most recent)
# Usage: .\create-backup.ps1 "Milestone description"

param(
    [Parameter(Mandatory=$true)]
    [string]$MilestoneDescription
)

# Get current timestamp for backup folder name
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFolder = "Backups\$timestamp"

# Source directory (current project root)
$sourceDir = "."

# Exclude patterns for Robocopy
$excludePatterns = @(
    "node_modules",
    ".next",
    ".git",
    "Backups",
    "*.log",
    ".env.local",
    ".env",
    "*.tmp",
    "*.temp"
)

# Build Robocopy exclude string
$excludeString = ($excludePatterns | ForEach-Object { "/XD $_" }) -join " "

Write-Host "Creating backup: $backupFolder" -ForegroundColor Green
Write-Host "Milestone: $MilestoneDescription" -ForegroundColor Yellow

# Create backup directory
New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null

# Execute Robocopy
$robocopyArgs = @(
    $sourceDir,
    $backupFolder,
    "/E",           # Copy subdirectories including empty ones
    "/R:3",         # Retry 3 times on failure
    "/W:1",         # Wait 1 second between retries
    "/NFL",         # No file list
    "/NDL",         # No directory list
    "/NJH",         # No job header
    "/NJS",         # No job summary
    "/NC",          # No class
    "/NS",          # No size
    "/NP",          # No progress
    $excludeString.Split(" ")
)

Write-Host "Executing Robocopy..." -ForegroundColor Cyan
$robocopyResult = & robocopy @robocopyArgs

# Check if backup was successful
if ($LASTEXITCODE -le 7) {
    Write-Host "Backup created successfully!" -ForegroundColor Green
    
    # Count existing backups and clean up if more than 5
    $existingBackups = Get-ChildItem -Path "Backups" -Directory | Sort-Object Name -Descending
    
    if ($existingBackups.Count -gt 5) {
        Write-Host "Found $($existingBackups.Count) backups. Cleaning up oldest..." -ForegroundColor Yellow
        
        # Keep the 5 most recent, delete the rest
        $backupsToDelete = $existingBackups | Select-Object -Skip 5
        
        foreach ($backup in $backupsToDelete) {
            Write-Host "Deleting old backup: $($backup.Name)" -ForegroundColor Red
            Remove-Item -Path $backup.FullName -Recurse -Force
        }
        
        Write-Host "Cleanup completed. Kept 5 most recent backups." -ForegroundColor Green
    }
    
    # Update CHANGE_LOG.md
    $changeLogPath = "CHANGE_LOG.md"
    $backupEntry = @"

## Milestone Backups
### [$(Get-Date -Format "yyyy-MM-dd HH:mm")] - Backup: $timestamp
**Milestone**: $MilestoneDescription
- Backup created successfully
- Automated cleanup completed (kept 5 most recent backups)

"@

    # Read current content
    $currentContent = Get-Content $changeLogPath -Raw
    
    # Insert new backup entry at the top after the header
    $headerEnd = $currentContent.IndexOf("## Recent Changes Made")
    if ($headerEnd -eq -1) {
        $headerEnd = $currentContent.IndexOf("## Current Working Features")
    }
    if ($headerEnd -eq -1) {
        $headerEnd = $currentContent.IndexOf("## Testing Checklist")
    }
    if ($headerEnd -eq -1) {
        # If no sections found, add at the beginning
        $newContent = $backupEntry + "`n`n" + $currentContent
    } else {
        $newContent = $currentContent.Substring(0, $headerEnd) + $backupEntry + "`n`n" + $currentContent.Substring($headerEnd)
    }
    
    # Write updated content
    Set-Content -Path $changeLogPath -Value $newContent -Encoding UTF8
    
    Write-Host "CHANGE_LOG.md updated with backup entry" -ForegroundColor Green
    Write-Host "Backup completed: $backupFolder" -ForegroundColor Green
    
} else {
    Write-Host "Backup failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "Robocopy exit codes: 0-7 = success, 8+ = error" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nBackup Summary:" -ForegroundColor Cyan
Write-Host "- Backup Folder: $backupFolder" -ForegroundColor White
Write-Host "- Milestone: $MilestoneDescription" -ForegroundColor White
Write-Host "- Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host "- Total Backups: $((Get-ChildItem -Path "Backups" -Directory).Count)" -ForegroundColor White
