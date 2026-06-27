$srcDir = "C:\Users\etipa\.gemini\antigravity\brain\c4e0d273-1f10-4c43-ad02-d1d0b66b3d91"
$destDir = "public\books"

New-Item -ItemType Directory -Force -Path $destDir | Out-Null

$books = @("genesis", "exodus", "leviticus", "numbers", "deuteronomy", "joshua", "judges", "ruth", "1samuel", "2samuel", "1kings", "2kings")

foreach ($book in $books) {
    # Find the most recently generated image for this book
    $latestImage = Get-ChildItem -Path $srcDir -Filter "${book}_*.png" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if ($latestImage) {
        $destPath = Join-Path -Path $destDir -ChildPath "${book}.png"
        Copy-Item -Path $latestImage.FullName -Destination $destPath -Force
        Write-Host "Copied $($latestImage.Name) to $destPath"
    } else {
        Write-Host "Warning: No image found for $book"
    }
}
