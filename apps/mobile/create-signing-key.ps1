# Создание ключа подписи Android и подготовка секретов для GitHub.
#
# Запуск: правой кнопкой по файлу → «Выполнить с помощью PowerShell»,
# или в PowerShell:  & "C:\Users\MI\aqyl-teacher\apps\mobile\create-signing-key.ps1"
#
# Что делает:
#   1. создаёт ключ на рабочем столе в папке aqyl-keys (не в репозитории!);
#   2. кодирует его для GitHub и кладёт в буфер обмена;
#   3. открывает страницу секретов GitHub и по одному говорит, что вставить.
#
# Пароль скрипт НЕ придумывает и НЕ сохраняет: его вводите вы, и знать его
# должны только вы. Потеря ключа = невозможность обновлять приложение.

$ErrorActionPreference = "Stop"
$OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8

$keysDir  = Join-Path $env:USERPROFILE "Desktop\aqyl-keys"
$keystore = Join-Path $keysDir "aqyl-release.keystore"
$alias    = "aqyl"

# keytool лежит рядом с java, но в PATH его нет (папка-ярлык Oracle содержит
# только java/javaw/javaws). Ищем сами.
$keytool = "C:\Program Files\Java\jre1.8.0_51\bin\keytool.exe"
if (-not (Test-Path $keytool)) {
    $found = Get-ChildItem "C:\Program Files\Java","C:\Program Files (x86)\Java" -Recurse -Filter keytool.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $keytool = $found.FullName } else { throw "keytool.exe не найден. Установите Java." }
}

New-Item -ItemType Directory -Force -Path $keysDir | Out-Null

Write-Host ""
Write-Host "=== ШАГ 1 из 3. Создание ключа ===" -ForegroundColor Cyan
if (Test-Path $keystore) {
    Write-Host "Ключ уже есть: $keystore" -ForegroundColor Yellow
    Write-Host "Заново НЕ создаю — иначе старые сборки перестанут обновляться."
} else {
    Write-Host "Сейчас keytool спросит пароль. Придумайте его, введите два раза"
    Write-Host "(символы не показываются — это нормально) и СРАЗУ запишите в заметки."
    Write-Host "Один пароль — и на хранилище, и на ключ."
    Write-Host ""
    # PKCS12: современный формат, пароль один на всё. Данные организации заданы
    # заранее, чтобы не отвечать на шесть вопросов подряд.
    & $keytool -genkeypair -v `
        -keystore $keystore -storetype PKCS12 `
        -alias $alias -keyalg RSA -keysize 2048 -validity 10000 `
        -dname "CN=Aqyl, O=Aqyl Corp, L=Almaty, C=KZ"
    if ($LASTEXITCODE -ne 0) { throw "keytool завершился с ошибкой" }
    Write-Host ""
    Write-Host "Ключ создан: $keystore" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== ШАГ 2 из 3. Файл ключа в кодированном виде → буфер обмена ===" -ForegroundColor Cyan
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keystore))
Set-Clipboard -Value $b64
Write-Host "Скопировано в буфер ($($b64.Length) символов)." -ForegroundColor Green

Write-Host ""
Write-Host "=== ШАГ 3 из 3. Четыре секрета в GitHub ===" -ForegroundColor Cyan
Write-Host "Открываю страницу. На ней: поле Name (имя), поле Secret (значение), кнопка Add secret."
Start-Process "https://github.com/aqyl-servise/Aqyl/settings/secrets/actions/new"
Start-Sleep -Seconds 2

$steps = @(
    @{ name = "ANDROID_KEYSTORE_BASE64";   hint = "значение УЖЕ в буфере — просто Ctrl+V в поле Secret" },
    @{ name = "ANDROID_KEYSTORE_PASSWORD"; hint = "пароль, который вы только что придумали" },
    @{ name = "ANDROID_KEY_ALIAS";         hint = "слово  aqyl  (уже в буфере)" },
    @{ name = "ANDROID_KEY_PASSWORD";      hint = "тот же пароль, что и выше" }
)
$i = 0
foreach ($s in $steps) {
    $i++
    if ($s.name -eq "ANDROID_KEY_ALIAS") { Set-Clipboard -Value $alias }
    Write-Host ""
    Write-Host "Секрет $i из 4" -ForegroundColor Yellow
    Write-Host "  Name:   $($s.name)"
    Write-Host "  Secret: $($s.hint)"
    Write-Host "  Нажмите Add secret, затем New repository secret для следующего."
    Read-Host "  Когда добавили — нажмите Enter здесь"
}

Write-Host ""
Write-Host "Готово. Теперь скажите Claude — он запустит подписанную сборку." -ForegroundColor Green
Write-Host "Файл ключа: $keystore — сделайте его копию вне компьютера." -ForegroundColor Yellow
