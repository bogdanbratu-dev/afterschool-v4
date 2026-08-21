#!/bin/bash
# backup-db.sh — Backup zilnic automat al bazei de date
# Ruleaza prin cron: 0 3 * * * /var/www/afterschool-v4/scripts/backup-db.sh

DB_PATH="/var/www/afterschool-v4/data/afterschool.db"
BACKUP_DIR="/var/www/afterschool-v4/data/backups"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/afterschool_$DATE.db"

# Creeaza folderul de backups daca nu exista
mkdir -p "$BACKUP_DIR"

# Copiaza DB-ul (sqlite3 .backup pentru consistenta)
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup salvat: $BACKUP_FILE"

# Sterge backup-urile mai vechi de 7 zile
find "$BACKUP_DIR" -name "afterschool_*.db" -mtime +7 -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complet. Fisiere pastrate:"
ls -lh "$BACKUP_DIR"
