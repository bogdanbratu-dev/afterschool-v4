Add-Type -Name Power -Namespace Win32 -MemberDefinition @"
  [DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);
"@

$flags = 2147483649

[Win32.Power]::SetThreadExecutionState($flags) | Out-Null
Write-Host "PC-ul nu va intra in standby. Apasa Ctrl+C pentru a opri."

try {
  while ($true) {
    [Win32.Power]::SetThreadExecutionState($flags) | Out-Null
    Start-Sleep -Seconds 30
  }
} finally {
  [Win32.Power]::SetThreadExecutionState(2147483648) | Out-Null
  Write-Host "Setarile de sleep restaurate."
}
