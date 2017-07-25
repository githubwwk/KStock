:: Get Date String
@ECHO OFF
FOR /F "TOKENS=*" %%A IN ('PN_DT.exe DT') DO SET DATE_TIME=%%A



:: Backup MongoDB
set PATH=%PATH%;C:\Program Files\MongoDB\Server\3.4\bin
::mongod --dbpath D:\Work\mongodb\data --logpath=D:\Work\mongodb\log\log.txt --install
mongodump -h 127.0.0.1:27017 -d kStock -o ./backup/kStock-mongodb

:: Backup MongoDB 
@cd backup
@cd kStock-mongodb
::@7z a -r .\kStock_%DATE_TIME% .\kStock
cd ..
cd ..

:: Start MongoD
net start MongoD

:: Start Server
node app.js

pause
