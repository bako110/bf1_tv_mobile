# Fix UTF-8 encoding in all HTML pages
$replacements = @{
   '&#xC3;&#xa9;' = 'é'   # Ã©
    '&#xC3;&#xa0;' = 'à'   # Ã 
    '&#xC3;&#xa8;' = 'è'   # Ã¨
    '&#xC3;&#xa7;' = 'ç'   # Ã§
    '&#xC3;&#x89;' = 'É'   # Ã‰
    '&#xC3;&#xab;' = 'ë'   # Ã«
    '&#xC2;&#xb7;' = '·'   # Â·
    '&#xe2;&#x80;' = '–'   # â€
}

$files = Get-ChildItem "web\pages\*.html"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content
    
   # Fix common patterns
    $content = $content -replace 'Ã©','é'
    $content = $content -replace 'Ã ','à'
    $content = $content -replace 'Ã§','ç'
    $content = $content -replace 'Ã¨','è'
    $content = $content -replace 'Ã‰','É'
    $content = $content -replace 'Ã«','ë'
    $content = $content -replace 'Ã®','î'
    $content = $content -replace 'Ã¯','ï'
    $content = $content -replace 'Â·','·'
    $content = $content -replace 'â€','–'
    $content = $content -replace 'â€™','''
    $content = $content -replace 'â€œ','"'
    $content = $content -replace 'dâ€™','d'''
    
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "✅ Fixed: $($file.Name)"
    }
}

Write-Host "✅ All files processed"
