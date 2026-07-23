@echo off
echo Adding firewall rules for frontend and backend servers...
echo.
echo Please run this as Administrator!
echo.
pause

echo Adding rule for Laravel Backend (port 8000)...
netsh advfirewall firewall add rule name="Laravel Backend" dir=in action=allow protocol=TCP localport=8000

echo Adding rule for Frontend Dev Server (port 5173)...
netsh advfirewall firewall add rule name="Frontend Dev Server" dir=in action=allow protocol=TCP localport=5173

echo.
echo Firewall rules added successfully!
echo.
pause
