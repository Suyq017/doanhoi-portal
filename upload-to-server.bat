@echo off
echo 🚀 Upload Doanhoi Portal to CentOS Server

set SERVER_IP=103.88.121.146
set SERVER_USER=root
set SERVER_PATH=/opt/doanhoi-portal
set LOCAL_PATH=d:\QToan\doanhoi-portal

echo Uploading source code to %SERVER_IP%...

REM Sử dụng scp để upload (cần cài Git Bash hoặc WSL)
REM Nếu không có scp, sử dụng WinSCP

echo Please use one of these methods to upload:

echo.
echo Method 1: Using scp (if you have Git Bash/WSL):
echo scp -r "%LOCAL_PATH%\*" %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%/

echo.
echo Method 2: Using WinSCP:
echo 1. Open WinSCP
echo 2. Connect to %SERVER_IP% with user: %SERVER_USER%
echo 3. Navigate to %SERVER_PATH%
echo 4. Upload all files from %LOCAL_PATH%

echo.
echo Method 3: Using rsync (if available):
echo rsync -avz --exclude 'node_modules' --exclude '.git' "%LOCAL_PATH%/" %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%/

echo.
echo After upload, SSH to server and run:
echo ssh %SERVER_USER%@%SERVER_IP%
echo cd %SERVER_PATH%
echo chmod +x setup-server.sh
echo ./setup-server.sh
echo chmod +x deploy.sh
echo ./deploy.sh

pause
