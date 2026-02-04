#!/bin/bash
#Llamando Variables y funciones
source "/home/userrespaldossc/Documentos/config.sh"
source "/home/userrespaldossc/Documentos/funciones.sh"




#$serverPassword = "T2ownieB1°NM##iml"
# Definir variables Centro de la Imagen
remoteServer="emunoz@172.17.175.80"
#Ruta de origen
remoteWordpressPath="/home/repositorio/public_html/wordpress"
#Ruta destino
nombreRepo="Centro de la Imagen"
destinoBackup=$DISCO_EXTERNO1"/Centro de la Imagen"
#Credenciales acceso
dbName="repositorio_2206"
dbUser="repositorio"
dbPassword="D4cADX85LOFv3lD8WVseIuNg"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"







#Definir variables FIC Blocksy
remoteServer="emunoz@172.17.175.137"
#Ruta de origen
remoteWordpressPath="/var/www/html/fic"
#Ruta destino
nombreRepo="FIC Blocksy"
destinoBackup=$DISCO_EXTERNO1"/FICBlocksy"
#Credenciales acceso
dbName="fic"
dbUser="adminficsc"
dbPassword="#03T2eCH0k9TJ3o3gpNVUsJ"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"









#$serverPassword = "#yE-U100!))QXX0"
# Definir variables Cervantino
remoteServer="emunoz@172.17.175.122"
#Ruta de origen
remoteWordpressPath="/var/www/html"
#Ruta destino
nombreRepo="Cervantino"
destinoBackup=$DISCO_EXTERNO1"/Cervantino_FIC"
#Credenciales acceso
dbName="fic"
dbUser="adminficsc"
dbPassword="#03T2eCH0k9TJ3o3gpNVUsJ"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"






#$serverPassword = "Bluemoon#20/kW°"
# Definir variables CID
remoteServer="emunoz@172.17.175.127"
#Ruta de origen
remoteWordpressPath="/var/www/html/cid"
#Ruta destino
nombreRepo="CID"
destinoBackup=$DISCO_EXTERNO1"/CID"
#Credenciales acceso
dbName="cid"
dbUser="admincidsc"
dbPassword="T2eCH0k9TJ3o3gpNVUsJ"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"






#$serverPassword ="Y42hclm6xG"
# Definir variables BIBLIOTECA MÉXICO
#remoteServer="freservadobm@172.17.175.173"
#Ruta de origen
#nombreRepo="Fondo Reservado"
#remoteWordpressPath="/var/www/html/bibmex"
#Ruta destino
#destinoBackup=$DISCO_EXTERNO1"/FondoReservado"
#Credenciales acceso
#dbName="bibmex"
#dbUser="emunoz"
#dbPassword="27851sj4ySVB0i3rqHjp"
#EJECUTANDO RESPALDO
#respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
#write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"





#$serverPassword = "!Bluemoon00#vii"
# Definir variables INHERM
remoteServer="emunoz@172.17.175.99"
#Ruta de origen
remoteWordpressPath="/var/www/html/restauracion/repoinehrm2"
#Ruta destino
nombreRepo="INERHM"
destinoBackup=$DISCO_EXTERNO1"/INEHRM"
#Credenciales acceso
#dbName="inehrm"
dbName="inehrm_repositorio"
dbUser="jargenis"
dbPassword="bluemoon#20"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"





#$serverPassword = "!*90ws(xhL[si7"
# Definir variables MNCP
remoteServer="emunoz@10.11.255.137"
#Ruta de origen
remoteWordpressPath="/srv/www/wordpress"
#Ruta destino
nombreRepo="MNCP"
destinoBackup=$DISCO_EXTERNO1"/MNCP"
#Credenciales acceso
dbName="mncp"
dbUser="wordpress"
dbPassword="MzxTC8boNmkE4d"
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"





#$serverPassword = "D#N0PpymEwnsBRwfFr3eUT"
# Definir variables Monsiteca
remoteServer="emunoz@172.17.175.204"
#Ruta de origen
remoteWordpressPath="/var/www/html/monsiteca"
#Ruta destino
nombreRepo="Monsiteca"
destinoBackup=$DISCO_EXTERNO1"/Monsiteca"
#Credenciales acceso
dbName="repomonsiteca"
dbUser="emunoz"
dbPassword="UTlDRqn9dqOc5CxuctGa"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"






#$serverPassword = "Bluemoon#20/kW![/3"
# Definir variables Multimedia
remoteServer="emunoz@172.17.175.105"
#Ruta de origen
remoteWordpressPath="/var/www/html/multimedia"
#Ruta destino
nombreRepo="Multimedia"
destinoBackup=$DISCO_EXTERNO1"/Multimedia"
#Credenciales acceso
dbName="multimedia"
dbUser="multiscultura"
dbPassword="RFrzwMvIHJ2ouRjmk4w6#W4spY"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"






#$serverPassword = "Bluemoon#20/kWabyss"
# Definir variables Original
remoteServer="emunoz@172.17.175.225"
#Ruta de origen
remoteWordpressPath="/var/www/html/original2025"
#Ruta destino
nombreRepo="Original"
destinoBackup=$DISCO_EXTERNO1"/Original"
#Credenciales acceso
dbName="original"
dbUser="emunoz"
dbPassword="Bluemoon#20"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"





#$serverPassword = "Bluemoon#20/kW°"
# Definir variables Patrimonio Ferrocarrilero
remoteServer="emunoz@172.17.175.129"
#Ruta de origen
remoteWordpressPath="/var/www/html/ferrocarriles"
#Ruta destino
nombreRepo="Patrimonio Ferrocarrilero"
destinoBackup=$DISCO_EXTERNO1"/Patrimonio Ferrocarrilero"
#Credenciales acceso
dbName="ferrocarriles"
dbUser="emunoz"
dbPassword="Bluemoon#20"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"








#$serverPassword = "B0m67c))reducXQ!22-S"
# Definir variables RADIO EDUCACIÓN
remoteServer="emunoz@172.17.175.171"
#Ruta de origen
remoteWordpressPath="/var/www/html/reporadioeducacion"
#Ruta destino
nombreRepo="Radio Educación"
destinoBackup=$DISCO_EXTERNO1"/Radio educacion"
#Credenciales acceso
dbName="reporadioeducacion"
dbUser="adminsc"
dbPassword="Bluemoon#20"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"







#user: desarrollo
#$serverPassword = "xpG2qdilrmNprAK5y6xs3t"
# Definir variables Plan Desarrollo
remoteServer="desarrollo@172.17.175.184"
#Ruta de origen
remoteWordpressPath="/var/www/html/pdesarrollo"
#Ruta destino
nombreRepo="PlanDesarrollo"
destinoBackup=$DISCO_EXTERNO1"/PlanDesarrollo"
#Credenciales acceso
dbName="sdc_pdesarrollo"
dbUser="emunozdgtic"
dbPassword="7sx0Sl4zUGkO5p8#t9lOGaq"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"






#
#$serverPassword = "Bluemoon#20/kW!RM9[))0"
# Definir variables SITIOS Y MONUMENTOS
remoteServer="emunoz@172.17.175.91"
#Ruta de origen
remoteWordpressPath="/var/www/html/migracion"
#Ruta destino
nombreRepo="Sitios y Monumentos"
destinoBackup=$DISCO_EXTERNO1"/Sitios y monumentos"
#Credenciales acceso
dbName="sitiosmonumentos2025"
dbUser="scmonumentos"
dbPassword="V5pThlFWO1EcHZUB1blw"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"




#$serverPassword = "Bluemoon#20/#!"
# Definir variables TESAURO
remoteServer="emunoz@172.17.175.137"
#Ruta de origen
remoteWordpressPath="/var/www/html/tesauro"
#Ruta destino
nombreRepo="Tesauro"
destinoBackup=$DISCO_EXTERNO1"/Tesauro"
#Credenciales acceso
dbName="tesauro"
dbUser="emunoz"
dbPassword="Bluemoon#20"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"









#$serverPassword = "Bluemoon#20/#!"
# Definir variables AGREGADOR MEXICANA REPO 2.0
remoteServer="emunoz@172.17.175.137"
#Ruta de origen
remoteWordpressPath="/var/www/html/agregador"
#Ruta destino
nombreRepo="Agregador"
destinoBackup=$DISCO_EXTERNO1"/agregador"
#Credenciales acceso
dbName="desarrollo"
dbUser="omar"
dbPassword="mexicana2024#"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"






#$serverPassword = "qamBKJudc8"
# Definir variables FONDO RESERVADO
remoteServer="sitiosymonumentos@172.17.175.201"
#Ruta de origen
remoteWordpressPath="/var/www/html"
#Ruta destino
nombreRepo="Fondo reservdado_MIGRADO"
destinoBackup=$DISCO_EXTERNO1"/Fondo reservdado_MIGRADO"
#Credenciales acceso
dbName="frbibmexico_bd"
dbUser="mexicana_freservadobm"
dbPassword="9ubCoWSaw3ilYCWJ5efS"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"





#$serverPassword = "Bluemoon#20/#!"
# Definir variables HELENICO
remoteServer="emunoz@172.17.175.137"
#Ruta de origen
remoteWordpressPath="/var/www/html/cultura"
#Ruta destino
nombreRepo="Helenico"
destinoBackup=$DISCO_EXTERNO1"/Helenico"
#Credenciales acceso
dbName="culturatest"
dbUser="omar"
dbPassword="mexicana2024#"
#EJECUTANDO RESPALDO
respaldar "$nombreRepo" "$dbUser" "$dbPassword" "$dbName" "$destinoBackup" "$remoteServer" "$remoteWordpressPath"
write_log "-------------------------- Se ejecuto el respaldo $nombreRepo --------------------------"
