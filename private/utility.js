"use strict"

var fs = require('fs');

exports.timestamp = function (msg)
{
    var milliseconds = new Date().getTime();
    console.log('[TS ' + milliseconds + '] ' + msg);
}

//***************************************************
// twDateToDcDate() 
// '106-01-05' -> '2017-01-05' 
//***************************************************
exports.twDateToDcDate = function(dateStr)
{
    function addZero(str,length){               
        return new Array(length - str.length + 1).join("0") + str;              
    }
    let date_list = dateStr.split('-');
    let dc_year = parseInt(date_list[0]) + 1911;
    date_list[0] = dc_year.toString();
    date_list[1] = addZero(date_list[1].toString(), 2);
    date_list[2] = addZero(date_list[2].toString(), 2);
    let dc_date = date_list.join('-');
    return dc_date;
}


//***************************************************
// dcDateToTwDate() 
// '2017-01-05' -> '106-01-05'
//***************************************************
exports.dcDateToTwDate = function(dateStr)
{
    function addZero(str,length){               
        return new Array(length - str.length + 1).join("0") + str;              
    }
    let date_list = dateStr.split('-');
    let dc_year = parseInt(date_list[0]) - 1911;
    date_list[0] = dc_year.toString();
    date_list[1] = addZero(date_list[1].toString(), 2);
    date_list[2] = addZero(date_list[2].toString(), 2);
    let tw_date = date_list.join('-');
    return tw_date;
}

//***************************************************
// sleep  
// wait.for(utility.sleepForMs, 1000);
//***************************************************
exports.sleepForMs =  function(ms,sleepCallback) {
  setTimeout(function() {
    return sleepCallback();
  }, ms);
}

//******************************************
// readDataDbFile()
//******************************************
exports.readDataDbFile = function(file_name)
{
    try {
      //console.log('readDataDbFile()+++');
      var content = fs.readFileSync(file_name);
      //console.log(content);
      var db = JSON.parse(content.toString());
      return db;
    }catch(err){
        throw err;
    }
}

//******************************************
// writeDataDbFile()
//******************************************
exports.writeDbFile = function(filename, dir, dataObj)
{
  let db_dir = './db/';
    if (!fs.existsSync(db_dir)) {
      fs.mkdirSync(db_dir);
    }

    let db_file_dir = db_dir + '/' + dir + '/';

    if (!fs.existsSync(db_file_dir)) {
      fs.mkdirSync(db_file_dir);
    }

  var dbfile = db_file_dir + '/' + filename;
  fs.writeFileSync(dbfile, JSON.stringify(dataObj));
  console.log('Write File DB:' + dbfile);

    return 0;
}