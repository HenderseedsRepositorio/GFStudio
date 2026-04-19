#!/bin/bash

# GF Studio — CI/CD Testing Script
# Ejecuta automáticamente antes de deploy
# Uso: ./tests/ci-example.sh

set -e

echo "========================================"
echo "GF Studio — Pre-Deploy Testing"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
echo ""

# Run smoke tests
echo "Ejecutando Smoke Tests..."
if node tests/test-smoke.js; then
    echo -e "${GREEN}✓ Smoke tests pasaron${NC}"
else
    echo -e "${RED}✗ Smoke tests fallaron${NC}"
    exit 1
fi
echo ""

# Check file sizes
echo "Verificando tamaños de archivo..."
INDEX_SIZE=$(wc -c < index.html)
INDEX_KB=$((INDEX_SIZE / 1024))
ADMIN_SIZE=$(wc -c < admin.html)
ADMIN_KB=$((ADMIN_SIZE / 1024))

if [ $INDEX_KB -lt 150000 ]; then
    echo -e "${GREEN}✓ index.html: ${INDEX_KB}KB${NC}"
else
    echo -e "${YELLOW}⚠ index.html: ${INDEX_KB}KB (> 150KB recomendado)${NC}"
fi

if [ $ADMIN_KB -lt 180000 ]; then
    echo -e "${GREEN}✓ admin.html: ${ADMIN_KB}KB${NC}"
else
    echo -e "${YELLOW}⚠ admin.html: ${ADMIN_KB}KB (> 180KB recomendado)${NC}"
fi
echo ""

# Check for console.log
echo "Verificando problemas comunes..."
CONSOLE_COUNT=$(grep -r "console\." index.html admin.html 2>/dev/null | wc -l)
if [ $CONSOLE_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ Sin console.log encontrados${NC}"
else
    echo -e "${YELLOW}⚠ Encontrados $CONSOLE_COUNT console.log${NC}"
fi

DEBUGGER_COUNT=$(grep -r "debugger" index.html admin.html 2>/dev/null | wc -l)
if [ $DEBUGGER_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ Sin debugger statements${NC}"
else
    echo -e "${RED}✗ Encontrados $DEBUGGER_COUNT debugger statements${NC}"
    exit 1
fi

TODO_COUNT=$(grep -r "TODO\|FIXME" index.html admin.html 2>/dev/null | wc -l)
if [ $TODO_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ Sin TODO/FIXME comments${NC}"
else
    echo -e "${YELLOW}⚠ Encontrados $TODO_COUNT TODO/FIXME comments${NC}"
fi
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}✓ PRE-DEPLOY CHECKS PASSED${NC}"
echo "========================================"
echo ""
echo "Ready to deploy to Vercel!"
echo "Next steps:"
echo "  1. git add -A"
echo "  2. git commit -m 'chore: pre-release QA'"
echo "  3. git push origin main"
echo ""
