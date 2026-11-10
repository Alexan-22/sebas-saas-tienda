param([Parameter(Mandatory=$true)][string]$SessionDirectory, [switch]$PrepareOnly)
$ErrorActionPreference='Stop'
$session=(Resolve-Path -LiteralPath $SessionDirectory).Path
if (!(Test-Path -LiteralPath (Join-Path $session 'SESSION_ACTIVE'))) { throw 'Sesion aislada inactiva; inicia Test-B1-Isolated.ps1 -BrowserSession' }
$source=Join-Path $session 'proxy.json'
$config=Get-Content -LiteralPath $source -Raw | ConvertFrom-Json
$route=$config.'/api/**'
$target=[Uri]$route.target
if($target.Scheme -ne 'http' -or $target.Host -ne '127.0.0.1' -or $target.Port -le 0 -or $route.changeOrigin -ne $false) { throw 'Proxy aislado invalido' }
$client=New-Object Net.Sockets.TcpClient
try { $client.Connect('127.0.0.1',$target.Port) } finally { $client.Dispose() }
$destination=Join-Path $session 'proxy.angular-4201.json'
if(Test-Path -LiteralPath $destination) { Copy-Item -LiteralPath $destination -Destination ($destination+'.bak-'+[guid]::NewGuid().ToString('N')) }
$json=@{'/api/**'=@{target=$target.AbsoluteUri.TrimEnd('/');secure=$false;changeOrigin=$false};'/uploads/**'=@{target=$target.AbsoluteUri.TrimEnd('/');secure=$false;changeOrigin=$false}} | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText($destination,$json,(New-Object Text.UTF8Encoding($false)))
$bytes=[IO.File]::ReadAllBytes($destination)
if($bytes[0] -ne 123) { throw 'El proxy debe comenzar por { sin BOM' }
Write-Host "Proxy UTF-8 sin BOM: $destination; backend aislado: $($target.Port)"
if(!$PrepareOnly) {
 Push-Location (Split-Path $PSScriptRoot -Parent)
 try { & npm.cmd start -- --port 4201 --proxy-config $destination; if($LASTEXITCODE -ne 0) { throw 'Angular termino con error' } }
 finally { Pop-Location }
}
