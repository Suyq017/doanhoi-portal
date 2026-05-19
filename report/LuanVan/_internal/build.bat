@echo off
setlocal
cd /d "%~dp0\.."
if not exist build mkdir build
xelatex -synctex=1 -interaction=nonstopmode -file-line-error -output-directory=build main.tex
if errorlevel 1 exit /b %errorlevel%
copy /y build\main.pdf . >nul
if errorlevel 1 (
	echo Warning: Could not overwrite main.pdf because it is in use. build\main.pdf has the latest output.
)