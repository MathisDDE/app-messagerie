@echo off
echo Génération du PDF de la documentation...

REM Vérifier si pandoc est installé
where pandoc >nul 2>nul
if %errorlevel% neq 0 (
    echo Pandoc n'est pas installé. Veuillez l'installer depuis : https://pandoc.org/installing.html
    pause
    exit /b 1
)

REM Générer le PDF
pandoc DOCUMENTATION_TECHNIQUE.md -o DOCUMENTATION_TECHNIQUE.pdf --pdf-engine=xelatex -V geometry:margin=1in -V documentclass=report -V colorlinks=true

if %errorlevel% equ 0 (
    echo PDF généré avec succès : DOCUMENTATION_TECHNIQUE.pdf
) else (
    echo Erreur lors de la génération du PDF
)

pause 