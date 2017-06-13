"use strict"

var fs = require('fs');
var moment = require('moment');

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
    dateStr = dateStr.replace(/\//g, '-');
    let date_list = dateStr.split('-');
    let dc_year = parseInt(date_list[0]) + 1911;
    date_list[0] = dc_year.toString();
    date_list[1] = addZero(date_list[1].toString(), 2);
    date_list[2] = addZero(date_list[2].toString(), 2);
    let dc_date = date_list.join('-');
    return dc_date;
}

/* 106/01/05 -> 2017/06/01 */
exports.twDateToDcDate_ex = function(dateStr, src_separate_char, dest_separate_char)
{
    function addZero(str,length){               
        return new Array(length - str.length + 1).join("0") + str;              
    }
    dateStr = dateStr.replace(/\//g, src_separate_char);
    let date_list = dateStr.split(src_separate_char);
    let dc_year = parseInt(date_list[0]) + 1911;
    date_list[0] = dc_year.toString();
    date_list[1] = addZero(date_list[1].toString(), 2);
    date_list[2] = addZero(date_list[2].toString(), 2);
    let dc_date = date_list.join(dest_separate_char);
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

/*'2017/01/05' -> '106/01/05' */
exports.dcDateToTwDate_ex = function(dateStr, src_separate_char, dest_separate_char)
{
    function addZero(str,length){               
        return new Array(length - str.length + 1).join("0") + str;              
    }
    let date_list = dateStr.split(src_separate_char);
    let dc_year = parseInt(date_list[0]) - 1911;
    date_list[0] = dc_year.toString();
    date_list[1] = addZero(date_list[1].toString(), 2);
    date_list[2] = addZero(date_list[2].toString(), 2);
    let tw_date = date_list.join(dest_separate_char);
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

//******************************************
// lastOpenDateOfWeek()
//******************************************
exports.lastOpenDateOfWeek = function()
{           
    /* Sunday:0 Monday:1 ... */
    let today = moment().format('YYYY-MM-DD');    
    let todayOfWeek = moment().weekday();
    let yesterdayOfWeek = moment().subtract(1, 'day').weekday();
    let lastOpenDay;            
    let subtractMappting = { 6:1,0:2, 1:3}; /* Sunday:0 (Friday is subtract 2)*/
    let end_time = today +' 14:00';  
    let start_time = today +' 09:00'; 

    if (todayOfWeek == 0 || todayOfWeek == 6)
    {       
        lastOpenDay = moment().subtract(subtractMappting[todayOfWeek], 'day').format('YYYY-MM-DD');
    }
    else if(todayOfWeek == 1)
    {                
        if (moment().isBefore(start_time))
        {
            lastOpenDay = moment().subtract(subtractMappting[todayOfWeek], 'day').format('YYYY-MM-DD');
        }else{
            lastOpenDay = today;
        }
    }
    else {        
       if (moment().isBefore(start_time))
       {
           /* N day 12:00~09:00 */
           lastOpenDay = moment().subtract(1, 'day').format('YYYY-MM-DD');
       }else
       { 
           lastOpenDay = today;         
       } 
    }/* if-else */

    return lastOpenDay;
} 

//******************************************
// isDuringOpeningtime()
// 9:00~14:00 return true.
//******************************************
exports.isDuringOpeningtime = function()
{
    let today = moment().format('YYYY-MM-DD');
    let sart_time = today +' 09:00';
    let end_time = today +' 14:00';
    return moment().isBetween(sart_time, end_time);
}

exports.isAfterClosingtime = function
()
{
    let today = moment().format('YYYY-MM-DD');
    let end_time = today +' 14:00';
    return moment().isAfter(end_time);
}