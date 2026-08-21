#!/bin/bash
cd /var/www/afterschool-v4
cp data/afterschool.db data/afterschool.db.bak 2>/dev/null && echo "DB backup ok"
git pull
if [ ! -s data/afterschool.db ] && [ -f data/afterschool.db.bak ]; then
  cp data/afterschool.db.bak data/afterschool.db
  echo "DB restaurata din backup"
fi
npm run build && pm2 restart afterschool
