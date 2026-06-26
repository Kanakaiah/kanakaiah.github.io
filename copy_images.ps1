$srcDir = "C:\Users\etipa\.gemini\antigravity\brain\c4e0d273-1f10-4c43-ad02-d1d0b66b3d91"
$destDir = "public\chapters\1john"

New-Item -ItemType Directory -Force -Path $destDir | Out-Null

Get-ChildItem -Path $srcDir -Filter "1john_ch*.png" | ForEach-Object {
    $newName = $_.Name -replace '^1john_(ch\d+).*', '$1.png'
    $destPath = Join-Path -Path $destDir -ChildPath $newName
    Copy-Item -Path $_.FullName -Destination $destPath -Force
    Write-Host "Copied $($_.Name) to $destPath"
}
