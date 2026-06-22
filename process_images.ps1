$src_dir = "C:\Users\etipa\.gemini\antigravity\brain\5de79edc-87ed-498c-8409-3a1259e17680"
$dest_base = "C:\Users\etipa\.gemini\antigravity\scratch\kanakaiah_git\public\chapters"

$pngs = Get-ChildItem -Path $src_dir -Filter "*.png"

foreach ($png in $pngs) {
    $filename = $png.Name
    $parts = $filename.Split('_')
    if ($parts.Length -ge 3) {
        $book = $parts[0]
        $ch = $parts[1]
        
        $book_dir = Join-Path $dest_base $book
        if (-not (Test-Path $book_dir)) {
            New-Item -ItemType Directory -Path $book_dir | Out-Null
        }
        
        $dest_file = Join-Path $book_dir "ch$ch.png"
        Move-Item -Path $png.FullName -Destination $dest_file -Force
        Write-Host "Moved $filename to $book/ch$ch.png"
    }
}
