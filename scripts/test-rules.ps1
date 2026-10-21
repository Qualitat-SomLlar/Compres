# Executa les proves de firestore.rules amb l'emulador des d'una còpia mínima FORA d'OneDrive.
# (Amb node_modules dins d'OneDrive, els fitxers "només al núvol" fan fallar o alentir Node.)
# Ús (PowerShell):  powershell -ExecutionPolicy Bypass -File scripts\test-rules.ps1
# Requisits: Node. Java 21+ al PATH, o un JDK 21 portàtil a %LOCALAPPDATA%\somllar-tools\jdk21\*
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $env:LOCALAPPDATA 'somllar-tools'
$work = Join-Path $tools 'rules-work'

$portable = Get-ChildItem (Join-Path $tools 'jdk21') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if ($portable) { $env:JAVA_HOME = $portable.FullName; $env:PATH = "$($portable.FullName)\bin;$env:PATH" }

New-Item -ItemType Directory -Force (Join-Path $work 'tests') | Out-Null
if (-not (Test-Path (Join-Path $work 'package.json'))) {
  Set-Content -Encoding utf8 (Join-Path $work 'package.json') '{ "name": "somllar-rules-work", "private": true, "type": "module", "devDependencies": { "@firebase/rules-unit-testing": "^3.0.4", "firebase": "^10.12.0", "tsx": "^4.21.0", "typescript": "~5.8.2", "@types/node": "^22.14.0" } }'
}
Copy-Item (Join-Path $root 'firestore.rules'), (Join-Path $root 'firebase.emulator.json') $work -Force
Copy-Item (Join-Path $root 'tests\firestore.rules.test.ts') (Join-Path $work 'tests') -Force

Push-Location $work
try {
  if (-not (Test-Path 'node_modules')) { npm.cmd install --no-audit --no-fund }
  npx.cmd firebase-tools emulators:exec --config firebase.emulator.json --only firestore "npx tsx --test tests/firestore.rules.test.ts"
  exit $LASTEXITCODE
} finally { Pop-Location }
