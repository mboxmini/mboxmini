@echo off
setlocal

:: Load environment variables
for /f "tokens=*" %%a in (scripts\config\windows.env) do set %%a

:: Start the server
cd %~dp0\..
server.exe 