$srcDir = "C:\Users\etipa\.gemini\antigravity\brain\c4e0d273-1f10-4c43-ad02-d1d0b66b3d91"
$destDir = "public\chapters\genesis"

New-Item -ItemType Directory -Force -Path $destDir | Out-Null

Get-ChildItem -Path $srcDir -Filter "genesis_ch*.png" | ForEach-Object {
    # Extract the chX part from names like genesis_ch1_light_12345.png
    if ($_.Name -match 'genesis_(ch\d+)') {
        $newName = $matches[1] + ".png"
        $destPath = Join-Path -Path $destDir -ChildPath $newName
        Copy-Item -Path $_.FullName -Destination $destPath -Force
        Write-Host "Copied $($_.Name) to $destPath"
    }
}
