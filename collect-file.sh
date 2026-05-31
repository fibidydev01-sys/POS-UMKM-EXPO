#!/bin/bash
# ================================================================
# collect-files.sh — POS UMKM File Collector
# Run from: d:/BOILERPLATE/pos-umkm
# Output  : collection/COLLECT-<timestamp>.txt
#           collection/typecheck-<timestamp>.txt
#           collection/lint-<timestamp>.txt
# Skip    : assets/, node_modules/, .gitignore,
#            pnpm-lock.yaml, LICENSE, *.lock
# ================================================================

ROOT="./src"
OUT="collection"
mkdir -p "$OUT"

BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║         FILE COLLECTOR — POS UMKM                ║${RESET}"
echo -e "${BOLD}╠══════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}║  LAYERS                                          ║${RESET}"
echo -e "${BOLD}║  1.${RESET}  ${CYAN}app/${RESET}                                   ${BOLD}║${RESET}"
echo -e "${BOLD}║  2.${RESET}  ${CYAN}components/dashboard/${RESET}                  ${BOLD}║${RESET}"
echo -e "${BOLD}║  3.${RESET}  ${CYAN}components/kasir/${RESET}                      ${BOLD}║${RESET}"
echo -e "${BOLD}║  4.${RESET}  ${CYAN}components/menu/${RESET}                       ${BOLD}║${RESET}"
echo -e "${BOLD}║  5.${RESET}  ${CYAN}components/pengaturan/${RESET}                 ${BOLD}║${RESET}"
echo -e "${BOLD}║  6.${RESET}  ${CYAN}components/shared/${RESET}                     ${BOLD}║${RESET}"
echo -e "${BOLD}║  7.${RESET}  ${CYAN}components/ui/${RESET}                         ${BOLD}║${RESET}"
echo -e "${BOLD}║  8.${RESET}  ${CYAN}lib/db/${RESET}                                ${BOLD}║${RESET}"
echo -e "${BOLD}║  9.${RESET}  ${CYAN}lib/export/${RESET}                            ${BOLD}║${RESET}"
echo -e "${BOLD}║  10.${RESET} ${CYAN}lib/aktivasi/${RESET}                          ${BOLD}║${RESET}"
echo -e "${BOLD}║  11.${RESET} ${CYAN}lib/printer/${RESET}                           ${BOLD}║${RESET}"
echo -e "${BOLD}║  12.${RESET} ${CYAN}lib/utils/${RESET}                             ${BOLD}║${RESET}"
echo -e "${BOLD}║  13.${RESET} ${CYAN}lib/cart/${RESET}                              ${BOLD}║${RESET}"
echo -e "${BOLD}║  14.${RESET} ${CYAN}lib/config/${RESET}                            ${BOLD}║${RESET}"
echo -e "${BOLD}║  15.${RESET} ${CYAN}constants/${RESET}                             ${BOLD}║${RESET}"
echo -e "${BOLD}║                                                  ║${RESET}"
echo -e "${BOLD}║  88.${RESET} ${GREEN}ALL COMPONENTS (2–7)${RESET}                   ${BOLD}║${RESET}"
echo -e "${BOLD}║  77.${RESET} ${GREEN}ALL LIB (8–14)${RESET}                         ${BOLD}║${RESET}"
echo -e "${BOLD}║  99.${RESET} ${GREEN}ALL LAYERS (everything)${RESET}                ${BOLD}║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${YELLOW}Pilih layer (contoh: 1 atau 1 3 5 atau 99):${RESET} "
read -r INPUT

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
FILE="$OUT/COLLECT-${TIMESTAMP}.txt"
TC_FILE="$OUT/typecheck-${TIMESTAMP}.txt"
LINT_FILE="$OUT/lint-${TIMESTAMP}.txt"
FOUND=0; MISSING=0; TOTAL=0

# ── typecheck + lint dulu sebelum collect ────────────────────────
echo ""
echo -e "${BOLD}▶ Running typecheck...${RESET}"
npm run typecheck 2>&1 | tee "$TC_FILE"
TC_EXIT=${PIPESTATUS[0]}
if [ $TC_EXIT -eq 0 ]; then
  echo -e "  ${GREEN}✓ Typecheck PASSED${RESET}"
else
  echo -e "  ${RED}✗ Typecheck FAILED — lihat $TC_FILE${RESET}"
fi

echo ""
echo -e "${BOLD}▶ Running lint...${RESET}"
npm run lint 2>&1 | tee "$LINT_FILE"
LINT_EXIT=${PIPESTATUS[0]}
if [ $LINT_EXIT -eq 0 ]; then
  echo -e "  ${GREEN}✓ Lint PASSED${RESET}"
else
  echo -e "  ${RED}✗ Lint FAILED — lihat $LINT_FILE${RESET}"
fi

echo ""
echo -e "${BOLD}▶ Collecting source files...${RESET}"

{
echo "################################################################"
echo "##  POS UMKM — SOURCE COLLECTION"
echo "##  Generated  : $(date '+%Y-%m-%d %H:%M:%S')"
echo "##  Selection  : $INPUT"
echo "##  Typecheck  : $([ $TC_EXIT -eq 0 ] && echo PASSED || echo FAILED)"
echo "##  Lint       : $([ $LINT_EXIT -eq 0 ] && echo PASSED || echo FAILED)"
echo "##  Skipped    : assets/, node_modules/, .gitignore,"
echo "##               pnpm-lock.yaml, LICENSE, *.lock, root files"
echo "################################################################"
echo ""
} > "$FILE"

# ── single file collector ────────────────────────────────────────
cf() {
    local f="$1"
    TOTAL=$((TOTAL + 1))
    {
    echo ""
    echo "================================================"
    echo "FILE: ${f#./}"
    } >> "$FILE"
    if [ -f "$f" ]; then
        local lines; lines=$(wc -l < "$f" 2>/dev/null || echo "0")
        echo -e "  ${GREEN}✓${RESET} ${f#./} (${lines} lines)"
        FOUND=$((FOUND + 1))
        {
        echo "Lines: $lines"
        echo "================================================"
        echo ""
        cat "$f"
        printf "\n\n"
        } >> "$FILE"
    else
        echo -e "  ${RED}✗${RESET} MISSING: ${f#./}"
        MISSING=$((MISSING + 1))
        {
        echo "STATUS: *** FILE NOT FOUND ***"
        echo "================================================"
        echo ""
        } >> "$FILE"
    fi
}

# ── section header ───────────────────────────────────────────────
sec() {
    local label="$1"
    echo -e "\n${BOLD}▶ $label${RESET}"
    {
    echo ""
    echo "################################################################"
    echo "##  $label"
    echo "################################################################"
    echo ""
    } >> "$FILE"
}

# ── layer runner ─────────────────────────────────────────────────
run_layer() {
    case "$1" in
        1)
            sec "app/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/app" -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | sort -z)
            ;;
        2)
            sec "components/dashboard/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/components/dashboard" -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | sort -z)
            ;;
        3)
            sec "components/kasir/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/components/kasir" -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | sort -z)
            ;;
        4)
            sec "components/menu/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/components/menu" -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | sort -z)
            ;;
        5)
            sec "components/pengaturan/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/components/pengaturan" -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | sort -z)
            ;;
        6)
            sec "components/shared/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/components/shared" -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | sort -z)
            ;;
        7)
            sec "components/ui/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/components/ui" -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | sort -z)
            ;;
        8)
            sec "lib/db/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/lib/db" -type f -name "*.ts" -print0 | sort -z)
            ;;
        9)
            sec "lib/export/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/lib/export" -type f -name "*.ts" -print0 | sort -z)
            ;;
        10)
            sec "lib/aktivasi/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/lib/aktivasi" -type f -name "*.ts" -print0 | sort -z)
            ;;
        11)
            sec "lib/printer/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/lib/printer" -type f -name "*.ts" -print0 | sort -z)
            ;;
        12)
            sec "lib/utils/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/lib/utils" -type f -name "*.ts" -print0 | sort -z)
            ;;
        13)
            sec "lib/cart/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/lib/cart" -type f -name "*.ts" -print0 | sort -z)
            ;;
        14)
            sec "lib/config/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/lib/config" -type f -name "*.ts" -print0 | sort -z)
            ;;
        15)
            sec "constants/"
            while IFS= read -r -d '' f; do cf "$f"
            done < <(find "$ROOT/constants" -type f -name "*.ts" -print0 | sort -z)
            ;;
        *)
            echo -e "  ${RED}⚠ Pilihan tidak valid: $1${RESET}"
            ;;
    esac
}

# ── dispatch ─────────────────────────────────────────────────────
if echo "$INPUT" | grep -qw "99"; then
    for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do run_layer $i; done
elif echo "$INPUT" | grep -qw "88"; then
    for i in 2 3 4 5 6 7; do run_layer $i; done
elif echo "$INPUT" | grep -qw "77"; then
    for i in 8 9 10 11 12 13 14; do run_layer $i; done
else
    for i in $INPUT; do run_layer "$i"; done
fi

# ── summary ──────────────────────────────────────────────────────
pct=0; [ $TOTAL -gt 0 ] && pct=$(( FOUND * 100 / TOTAL ))

echo ""
echo -e "${BOLD}════════════════════════════════════${RESET}"
echo -e "  ${GREEN}✓ Found   : $FOUND / $TOTAL${RESET}"
echo -e "  ${RED}✗ Missing : $MISSING${RESET}"
echo -e "  Coverage  : $pct%"
echo -e "${BOLD}────────────────────────────────────${RESET}"
echo -e "  Typecheck : $([ $TC_EXIT -eq 0 ] && echo -e "${GREEN}PASSED${RESET}" || echo -e "${RED}FAILED${RESET}")"
echo -e "  Lint      : $([ $LINT_EXIT -eq 0 ] && echo -e "${GREEN}PASSED${RESET}" || echo -e "${RED}FAILED${RESET}")"
echo -e "${BOLD}════════════════════════════════════${RESET}"
echo -e "  Collect : ${CYAN}$FILE${RESET}"
echo -e "  TC      : ${CYAN}$TC_FILE${RESET}"
echo -e "  Lint    : ${CYAN}$LINT_FILE${RESET}"
echo ""

{
echo ""
echo "################################################################"
echo "##  SUMMARY"
echo "################################################################"
echo "Found     : $FOUND / $TOTAL"
echo "Missing   : $MISSING"
echo "Coverage  : $pct%"
echo "Typecheck : $([ $TC_EXIT -eq 0 ] && echo PASSED || echo FAILED)"
echo "Lint      : $([ $LINT_EXIT -eq 0 ] && echo PASSED || echo FAILED)"
} >> "$FILE"