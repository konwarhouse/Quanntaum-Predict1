#!/bin/bash
# Script to restore working versions of reliability components
# Created: April 26, 2025

echo "Restoring working versions of Weibull Analysis components..."

# Create a backup of current files
BACKUP_DATE=$(date +%Y-%m-%d-%H%M%S)
mkdir -p ./backups/pre_restore_$BACKUP_DATE
echo "Creating backup of current files in ./backups/pre_restore_$BACKUP_DATE/"
cp client/src/components/reliability/WeibullAnalysisForm.tsx ./backups/pre_restore_$BACKUP_DATE/
cp client/src/components/reliability/DataDrivenWeibullAnalysis.tsx ./backups/pre_restore_$BACKUP_DATE/

# Restore working files
echo "Restoring WeibullAnalysisForm.tsx..."
cp ./backups/working_state_2025-04-26/WeibullAnalysisForm.tsx client/src/components/reliability/

echo "Restoring DataDrivenWeibullAnalysis.tsx..."
cp ./backups/working_state_2025-04-26/DataDrivenWeibullAnalysis.tsx client/src/components/reliability/

echo "Restoration complete!"
echo "Previous files backed up to ./backups/pre_restore_$BACKUP_DATE/"