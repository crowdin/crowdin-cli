@echo off
SETLOCAL
SET TEMPFILE=%TEMP%\tmpfile

pushd %~dp0

ECHO Setting CROWDIN_HOME environment variable
setx /M CROWDIN_HOME "%cd%"

ECHO Adding the current directory to PATH environment variable
setx /M PATH "%PATH%;%cd%"

"%JAVA_HOME%\bin\java" -version 2>& 1 | FIND "java version" > %TEMPFILE%
SET /p VERSIONSTRING= < %TEMPFILE%
DEL %TEMPFILE%
SET MAJORVERSION=%VERSIONSTRING:~14,1%
SET MINORVERSION=%VERSIONSTRING:~16,1%
SET UPDATEVERSION=%VERSIONSTRING:~20,-1%

ECHO Checking JAVA version

IF %MAJORVERSION% GTR 1 GOTO VALID
IF %MINORVERSION% GTR 8 GOTO VALID
IF %UPDATEVERSION% GTR 0 GOTO VALID
ECHO Your JAVA version should be updated to version 1.8. You can download it from https://www.java.com/
GOTO EXIT

:VALID
ECHO Success!

:EXIT
ENDLOCAL
