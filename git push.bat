@echo off
cd /d "D:\BIZNES\PearlSkino BD\pearlskino-bd"

echo Staging changes...
git add .

echo Committing changes...
git commit -m "Auto update: %date% %time%"

echo Pushing to remote...
git push

echo Done!
timeout /t 3