Add-Type -AssemblyName System.Windows.Forms

Write-Host "Ecranul ramane activ. Apasa Ctrl+C pentru a opri."

while ($true) {
    $pos = [System.Windows.Forms.Cursor]::Position
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(($pos.X + 1), $pos.Y)
    Start-Sleep -Milliseconds 100
    [System.Windows.Forms.Cursor]::Position = $pos
    Start-Sleep -Seconds 59
}
