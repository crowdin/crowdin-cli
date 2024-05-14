@echo off
SETLOCAL

pushd %~dp0

ECHO Setting CROWDIN_HOME environment variable
setx /M CROWDIN_HOME "%cd%"

ECHO Adding the current directory to PATH environment variable
setx /M PATH "%PATH%;%cd%"

if "%_JAVACMD"=="" (
  if not "%JAVA_HOME%"=="" (
    if exist "%JAVA_HOME%\bin\java.exe" set "_JAVACMD=%JAVA_HOME%\bin\java.exe"
  )
)

if "%_JAVACMD%"=="" (
    java -version >nul 2^>^&1 && (
        set _JAVACMD=java
    )
)

if "%_JAVACMD%"=="" (
    ECHO Looks like Java is not installed. You can download it from https://www.java.com/
    GOTO EXIT
)

for /f "tokens=3" %%g in ('%_JAVACMD% -version 2^>^&1 ^| findstr /i "version"') do (
    set JAVAVER=%%g
)

set JAVAVER=%JAVAVER:"=%

for /f "delims=. tokens=1-3" %%v in ("%JAVAVER%") do (
    set MAJORVERSION=%%v
    set MINORVERSION=%%w
    set UPDATEVERSION=%%x
)

ECHO Checking JAVA version

IF %MAJORVERSION% GEQ 17 GOTO VALID
ECHO Your JAVA version should be updated to version 17. You can download it from https://www.java.com/
GOTO EXIT

:VALID
ECHO Success!

:EXIT
ENDLOCAL
