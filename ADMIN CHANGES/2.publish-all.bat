@echo off
setlocal

title PearlSkino - Publish Everything

echo.
echo ============================================================
echo          PEARLSKINO - PUBLISH ALL CHANGES
echo ============================================================
echo.

cd /d "D:\BIZNES\PearlSkino BD\pearlskino-bd"

if errorlevel 1 (
    echo.
    echo ERROR: Could not open the PearlSkino project directory.
    echo.
    pause
    exit /b 1
)

echo [1/5] Checking Git status...
echo.

git status

echo.
echo ============================================================
echo [2/5] Adding ALL project changes...
echo ============================================================
echo.

git add -A

if errorlevel 1 (
    echo.
    echo ERROR: Git could not stage the changes.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo [3/5] Checking whether there are changes to commit...
echo ============================================================
echo.

git diff --cached --quiet

if %errorlevel%==0 (
    echo.
    echo No changes found.
    echo Nothing needs to be published.
    echo.
    pause
    exit /b 0
)

echo.
echo ============================================================
echo [4/5] Creating Git commit...
echo ============================================================
echo.

git commit -m "Update PearlSkino project"

if errorlevel 1 (
    echo.
    echo ERROR: Git commit failed.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo [5/5] Pushing to GitHub...
echo ============================================================
echo.

git push origin main

if errorlevel 1 (
    echo.
    echo ============================================================
    echo ERROR: Git push failed.
    echo ============================================================
    echo.
    echo The changes were committed locally but were NOT pushed.
    echo.
    echo Run:
    echo git status
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo             PUBLISH SUCCESSFUL
echo ============================================================
echo.
echo All Git-tracked changes have been:
echo.
echo     [OK] Added
echo     [OK] Committed
echo     [OK] Pushed to origin/main
echo.
echo Vercel should now detect the new GitHub commit
echo and start a deployment automatically.
echo.

echo Current Git status:
echo ------------------------------------------------------------

git status

echo.
echo ============================================================
echo                 DONE
echo ============================================================
echo.

pause