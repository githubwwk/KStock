set PATH=%PATH%;C:\Program Files\MongoDB\Server\3.4\bin
mongodump -h 127.0.0.1:27017 -d kStock -o ./backup/kStock-mongodb
net start MongoD
node app.js
pause
