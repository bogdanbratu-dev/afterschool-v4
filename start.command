#!/bin/bash
cd "$(dirname "$0")"

# Opreste serverul vechi daca ruleaza
if [ -f .server.pid ]; then
  PID=$(cat .server.pid)
  if kill -0 $PID 2>/dev/null; then
    kill $PID
    sleep 1
  fi
  rm -f .server.pid
fi

# Obtine IP-ul local pentru acces din retea
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "=================================================="
echo "  AfterSchool Finder"
echo "=================================================="

# Verifica daca exista un build de productie si daca sursa e mai noua
NEED_BUILD=false
if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
  NEED_BUILD=true
elif [ "$(find src -newer .next/BUILD_ID -name '*.tsx' -o -name '*.ts' 2>/dev/null | head -1)" != "" ]; then
  NEED_BUILD=true
fi

if [ "$NEED_BUILD" = true ]; then
  echo "  Construiesc aplicatia (prima rulare sau modificari detectate)..."
  echo "  (Poate dura 1-2 minute)"
  echo ""
  npm run build
  if [ $? -ne 0 ]; then
    echo ""
    echo "  Eroare la build! Verifica erorile de mai sus."
    exit 1
  fi
  echo ""
fi

echo "  Pornesc serverul..."
npm run start &
echo $! > .server.pid
sleep 2

echo ""
echo "  ✓ Server pornit cu succes!"
echo ""
echo "  Acces de pe acest PC:"
echo "    http://localhost:3000"
if [ -n "$LOCAL_IP" ]; then
  echo ""
  echo "  Acces din retea (alte PC-uri / telefoane):"
  echo "    http://$LOCAL_IP:3000"
fi
echo ""
echo "  (Foloseste stop.sh pentru a opri serverul)"
echo "=================================================="

open http://localhost:3000
