#!/bin/bash

# ================== CONFIGURACIÓN ==================
BASE_DIR="/var/www/html/GA/Programa"
LOG_FILE="$BASE_DIR/metricas_servidores.log"
API_URL="http://172.17.175.137:3000/api/registros-metricas"
FECHA=$(date +"%Y-%m-%d %H:%M:%S")

mkdir -p "$BASE_DIR"

REPOSITORIOS=(
  "Centro de la Imagen|emunoz@172.17.175.80" #Contraseña: T2ownieB1°NM##iml
  "Cervantino|emunoz@172.17.175.122" #Contraseña: #yE-U100!))QXX0
  "CID|emunoz@172.17.175.127" #Contraseña: Bluemoon#20/kW°
  "INERHM|emunoz@172.17.175.99" #Contraseña: !Bluemoon00#vii
  "MNCP|emunoz@10.11.255.137" #Contraseña: !*90ws(xhL[si7
  "Monsiteca|emunoz@172.17.175.204" #Contraseña: D#N0PpymEwnsBRwfFr3eUT
  "Multimedia|emunoz@172.17.175.105" #Contraseña: Bluemoon#20/kW![/3
  "Original|emunoz@172.17.175.225" #Contraseña: Bluemoon#20/kWabyss
  "Patrimonio Ferrocarrilero|emunoz@172.17.175.129" #Contraseña: Bluemoon#20/kW°
  "Radio Educación|emunoz@172.17.175.171" #Contraseña: B0m67c))reducXQ!22-S
  "Helenico|emunoz@172.17.175.137" #Contraseña: Bluemoon#20/#!
  "Sitios y Monumentos|emunoz@172.17.175.91" #Contraseña: Bluemoon#20/kW!RM9[))0
  "Fondo Reservado MIGRADO|sitiosymonumentos@172.17.175.201" #Contraseña: qamBKJudc8
)

# ================== ENCABEZADO LOG ==================
{
  echo "========================================"
  echo "  MÉTRICAS GENERALES DE SERVIDORES"
  echo "  Fecha: $FECHA"
  echo "========================================"
  echo
} > "$LOG_FILE"

# ================== LOOP PRINCIPAL ==================
for entry in "${REPOSITORIOS[@]}"; do

  REPO="${entry%%|*}"
  SERVER="${entry##*|}"
  SERVER_IP="${SERVER##*@}"

  {
    echo "----------------------------------------"
    echo "Repositorio: $REPO"
    echo "Servidor: $SERVER_IP"
    echo
  } >> "$LOG_FILE"

  # ---------- Prueba de conexión ----------
  ssh -o ConnectTimeout=8 "$SERVER" "exit" &>/dev/null
  if [ $? -ne 0 ]; then
    echo "❌ ERROR: No se pudo conectar al servidor" >> "$LOG_FILE"

    curl -s -X PUT "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{
        \"servidor\": \"$SERVER_IP\",
        \"estado\": \"Inaccesible\"
      }" > /dev/null

    echo >> "$LOG_FILE"
    continue
  fi

 # ---------- Obtener métricas (Versión Ultra-Compatible) ----------
  # Ejecutamos un solo comando que imprime los valores separados por comas
  RAW_DATA=$(ssh -o LogLevel=ERROR -o ConnectTimeout=8 "$SERVER" "
    USO=\$(df / --human-readable | awk 'NR==2 {print \$3}' 2>/dev/null || df / | awk 'NR==3 {print \$2}');
    TOTAL=\$(df / --human-readable | awk 'NR==2 {print \$2}' 2>/dev/null || df / | awk 'NR==3 {print \$1}');
    MEM=\$(awk '/MemTotal/ {printf \"%.0fG\", \$2/1024/1024}' /proc/meminfo);
    CPUS=\$(nproc 2>/dev/null || echo '1');
    SO=\$(grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '\"' 2>/dev/null || uname -s);
    PHP_V=\$(php -v 2>/dev/null | head -n 1 | awk '{print \$2}' || echo 'N/A');
    MDB_V=\$(mysql --version 2>/dev/null | sed -n 's/.*Distrib \([0-9.]*\).*/\1/p' || echo 'N/A');
    
    echo \"\$USO|\$TOTAL|\$MEM|\$CPUS|\$SO|\$PHP_V|\$MDB_V\"
  ")

  # ---------- Parseo de seguridad ----------
  IFS='|' read -r USO TOTAL MEMORIA CPU SO PHP MDB <<< "$RAW_DATA"

# ---------- Log ----------
{
  echo "📊 Métricas del Servidor"
  echo "💾 Almacenamiento: ${USO:-N/A} de ${TOTAL:-N/A}"
  echo "🧠 Memoria: ${MEMORIA:-N/A}"
  echo "⚙️ Procesadores: ${CPU:-N/A}"
  echo "🐧 Sistema Operativo: ${SO:-N/A}"
  echo "🐘 PHP: ${PHP:-N/A}"
  echo "🐬 MariaDB: ${MDB:-N/A}"
  echo
} >> "$LOG_FILE"

# ---------- Envío a la API ----------
curl -s -X PUT "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"servidor\": \"$SERVER_IP\",
    \"almacenamiento_asignado\": \"${TOTAL:-}\",
    \"almacenamiento_utilizado\": \"${USO:-}\",
    \"memoria\": \"${MEMORIA:-}\",
    \"procesadores\": \"${CPU:-}\",
    \"sistema_operativo\": \"${SO:-}\",
    \"version_php\": \"${PHP:-}\",
    \"version_mdb\": \"${MDB:-}\",
    \"estado\": \"Activo\"
  }" > /dev/null


# ================== FIN ==================
echo "======== FIN DEL REPORTE ========" >> "$LOG_FILE"
echo "📄 Reporte generado en:"
echo "   $LOG_FILE"
done