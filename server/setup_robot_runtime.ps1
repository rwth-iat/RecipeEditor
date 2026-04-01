param(
    [string]$ToolsRoot = (Join-Path $PSScriptRoot "tools")
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$toolsPath = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$runtimeRoot = Join-Path $toolsPath "tools"
if ($ToolsRoot) {
    $runtimeRoot = $ToolsRoot
}

$robotDir = Join-Path $runtimeRoot "robot"
$jreDir = Join-Path $runtimeRoot "jre"
$tmpDir = Join-Path $runtimeRoot "tmp"
$robotJarPath = Join-Path $robotDir "robot.jar"
$javaExePath = Join-Path $jreDir "bin\\java.exe"

New-Item -ItemType Directory -Force -Path $runtimeRoot, $robotDir, $tmpDir | Out-Null

if (-not (Test-Path -LiteralPath $robotJarPath)) {
    Invoke-WebRequest `
        -Uri "https://github.com/ontodev/robot/releases/latest/download/robot.jar" `
        -OutFile $robotJarPath
}

if (-not (Test-Path -LiteralPath $javaExePath)) {
    $apiUrl = "https://api.adoptium.net/v3/assets/latest/21/hotspot?architecture=x64&image_type=jre&os=windows"
    $release = Invoke-RestMethod -Uri $apiUrl | Select-Object -First 1
    if (-not $release.binary.package.link) {
        throw "Could not resolve the latest Temurin JRE package from the Adoptium API."
    }

    $zipPath = Join-Path $tmpDir $release.binary.package.name
    Invoke-WebRequest -Uri $release.binary.package.link -OutFile $zipPath

    if (Test-Path -LiteralPath $jreDir) {
        Remove-Item -LiteralPath $jreDir -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $jreDir | Out-Null

    $extractRoot = Join-Path $tmpDir "temurin-extract"
    if (Test-Path -LiteralPath $extractRoot) {
        Remove-Item -LiteralPath $extractRoot -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null

    Expand-Archive -Path $zipPath -DestinationPath $extractRoot -Force
    $expandedJre = Get-ChildItem -LiteralPath $extractRoot -Directory | Select-Object -First 1
    if (-not $expandedJre) {
        throw "Temurin JRE archive did not contain an extractable directory."
    }

    Get-ChildItem -LiteralPath $expandedJre.FullName -Force | ForEach-Object {
        Move-Item -LiteralPath $_.FullName -Destination $jreDir -Force
    }

    Remove-Item -LiteralPath $extractRoot -Recurse -Force
    Remove-Item -LiteralPath $zipPath -Force
}

if (-not (Test-Path -LiteralPath $javaExePath)) {
    throw "Java runtime setup failed. '$javaExePath' was not created."
}

Write-Host "ROBOT runtime ready."
Write-Host "robot.jar: $robotJarPath"
Write-Host "java.exe : $javaExePath"
