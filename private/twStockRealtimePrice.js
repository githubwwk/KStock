"use strict"
var schedule = require('node-schedule');
var request = require('request');
var moment = require('moment');
var wait = require('wait.for');
var cheerio = require('cheerio');
var cheerioTableparser = require('cheerio-tableparser');
var iconv = require('iconv-lite');
var fs = require('fs');
var utility = require("./utility.js");
var db = require('./db.js');
var stockInfoCrawler = require('./twStockDailyInfoCrawler.js');

//var mutex = require( 'node-mutex' )();

//**************************************************
// Variable
//**************************************************
var gStockRealTimePrice = {};
var gStockRealTimeAnalyzeResult = {}; /* Real-time analyze stock result. */
var gLocalFileDbDir = 'daily_stock_price';
var gStockAllInfoObj = {};  /* All stock information, name and id ....*/

exports.gStockRealTimePrice;  /* All stock real time price*/
exports.gStockRealTimeAnalyzeResult = {};

//******************************************
// data_reconstruct()
//******************************************
function _f_stock_data_reconstruct(stockRtpObj)
{
    var result = {};
    try {
        result.highPrice = stockRtpObj.h;
        result.lowPrice = stockRtpObj.l;
        result.currentPrice = stockRtpObj.z;  
        result.tv = stockRtpObj.v;   /* Trading Volumn */
        result.stockId = stockRtpObj.c;    
        let ms_tlong = stockRtpObj.tlong;        
        result.datetime = new moment(parseInt(ms_tlong)).format('YYYY-MM-DD HH:mm-ss');  
    }catch(err){
        console.log('ERROR - stockRealTimePrice getDatafromWeb()' + err);
        console.dir(stockRtpObj);              
    }        
    return result;
} /* function - stock_data_reconstruct */


//******************************************
// _f_getStockDatafromWeb()
//******************************************
function _f_getStockDatafromWeb(options, callback_web)
{               
    
    request( options, function (error, response, body) {          
            if (!error && response.statusCode == 200) {
                //console.log(body);
                let stockObj;
                try {
                    stockObj = JSON.parse(body); 
                    console.log("[stockObj.msgArray.length]:" + stockObj.msgArray.length);
                } catch(err){
                    console.log(body);
                    console.dir(options);
                    return callback_web(-1, error);
                }
                if (stockObj.msgArray == undefined){
                    console.log("ERROR msgArray is undefined.");
                    console.log(body);
                    console.dir(options);                    
                    return callback_web(-1, error);
                }

                return callback_web(null, stockObj);
            }else{            
                try {                    
                    console.log("ERROR - _f_getStockDatafromWeb() statusCode:" + response.statusCode);    
                    return callback_web(-1, error);
                }catch(err){                    
                    return callback_web(-1, error);
                }
            }
             
    });
}
//******************************************
// getTwDate()
//******************************************
function getTwDate(dateStr)
{
    var dateObj = moment(dateStr);
    var year = dateObj.year() - 1911;
    var month = dateObj.month() + 1;
    var date = dateObj.date();
    
    function addZero(str,length){               
        return new Array(length - str.length + 1).join("0") + str;              
    }

    month = addZero(month.toString(), 2);

    var twDateStr = year + "/" + month + "/" + date;
    return twDateStr;
}

//******************************************
// getCookie()
//******************************************
function getCookie(callback_getcookie)
{    
    let cookie = '';
    request( 'http://mis.twse.com.tw/stock/fibest.jsp?stock=', function (error, response, body) {          
            if (!error && response.statusCode == 200) {
                let header_cookie = response.headers['set-cookie'][0];
                let temp_list = header_cookie.split(';');
                cookie = temp_list[0]
                console.log("DEBUG - Cookie:" + cookie);
                //request.shouldKeepAlive = false;                
            }            
            return callback_getcookie(null, cookie);
    });
}

//******************************************
// _f_readAllStockPriceFromWeb
//******************************************
function _f_readAllStockPriceFromWeb(stockid_list, callback_readPrice)
{        
    let options_default = {
        url : '',
        method: "GET",             
        headers:{}
    };

    let xtime = new moment().format('x'); /* Unix ms timestamp */               
    //let cookie_temp = '%COOKIE_STR%; _ga=GA1.3.360613230.1488807194; __utma=193825960.360613230.1488807194.1490979469.1491336371.21; __utmz=193825960.1490631663.15.7.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); %COOKIE_STR%'; 
    let cookie_temp = '%COOKIE_STR%; __utma=193825960.360613230.1488807194.1492798024.1493652322.29; __utmz=193825960.1492798024.28.13.utmcsr=123.194.172.32:3000|utmccn=(referral)|utmcmd=referral|utmcct=/; _ga=GA1.3.360613230.1488807194; %COOKIE_STR%';
    function exec(callback_exe)
    {                          
         let cookie = wait.for(getCookie);                             
         options_default.headers.Cookie = cookie;        

         let result = {};
         
         /* Onetime to get 100 stock price */
         for (let i=0; i<stockid_list.length ; i+=100)
         { 
            /* Gen multiple stock id string */ 
            let url_stockId_str = ''; 
            let onetime_len = ((stockid_list.length - i) >= 100)?100:(stockid_list.length - i);
            for(let j=0; j<onetime_len ; j++){ 
              url_stockId_str += 'tse_' + stockid_list[i+j] + '.tw|';
            }
            url_stockId_str = url_stockId_str.slice(0, -1);

            /* Gen again Cookie */
            let cookie = wait.for(getCookie);                             
            options_default.headers.Cookie = cookie; 
            
            let url = 'http://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=' + url_stockId_str + '&json=1&delay=0&_=' + xtime;                 
                
            options_default.url = url; 
           
                 let stockObj = wait.for(_f_getStockDatafromWeb, options_default);    
                 for (let msg of stockObj.msgArray)
                 {
                    let stock_data_dict = _f_stock_data_reconstruct(msg);  
                    if (stock_data_dict.stockId != undefined)
                    {                               
                        result[stock_data_dict.stockId] = stock_data_dict;  
                    }else{
                        console.log("ERROR - Invalid msg object!");
                    }
                 }                                                           

            wait.for(utility.sleepForMs, 100); /* mis.twse.com.tw limitation. Should add delay. */ 
         } /* for */
         callback_exe(null, result);
    } /* readStockPrice() */

    wait.launchFiber(exec, callback_readPrice);
}

//******************************************
// _f_genLocalDbFileName()
//******************************************
function _f_genLocalDbFileName(dateTime)
{
    let dateStr = moment(dateTime).format("YYYYMMDD");                  
    let localDbFileName = 'realtime_sp_' + dateStr + '.db';
    return localDbFileName;
}

//******************************************
// _f_initStockIdList()
//******************************************
function _f_initStockIdList()
{
    let result = wait.for(db.twseStockPRE_Find, '2017-04-14');
    let stock_list = JSON.parse(result[0].data);
    let stockid_list = [];
    for(let stock of stock_list)
    {
        stockid_list.push(stock.stockId);
    } /* for */

    let retObj = {};
    retObj.stockIdList = stockid_list;
    retObj.stockObjList = stock_list;
    return retObj;

} /* _f_initStockIdList */

//******************************************
// _f_isDuringOpeningtime()
//******************************************
function _f_isDuringOpeningtime()
{
    let today = moment().format('YYYY-MM-DD');
    let start_time = today +' 09:00';
    let end_time = today +' 14:00';     
    return moment().isBetween(start_time, end_time);
}


/* Check whether during start time and end time. */
function _f_isDuringSpecialTime(checkDateTime, start_time, end_time)
{
    let today = moment().format('YYYY-MM-DD');
    let start_time_str = today +' ' + start_time;
    let end_time_str = today + ' ' + end_time;     
    if (checkDateTime == "")
    {
        return moment().isBetween(start_time_str, end_time_str);
    }else{
        return moment(checkDateTime, 'YYYY-MM-DD HH:mm-ss').isBetween(start_time_str, end_time_str);
    }
}

//******************************************
// _f_isAfterClosingtime()
//******************************************
function _f_isAfterClosingtime()
{
    let today = moment().format('YYYY-MM-DD');    
    let end_time = today +' 14:00';     
    return moment().isAfter(end_time);
}

//******************************************
// getRealTimeStockPrice()
//******************************************
function getRealTimeStockPrice(stockid_list, callback)
{    
        utility.timestamp('getRealTimeStockPrice()+++');    
        
        let stockRealTimePrice;
        let bGetRealTimeFromWeb = true;
        
        /* Check where should get price from local file or from web. */
        
        if (!_f_isDuringOpeningtime())
        {            
            /* Check local file db exist or not. */
            let yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
            let today = moment().format('YYYY-MM-DD');            

            let filename = _f_genLocalDbFileName(today);
            let filedir = './db/' + gLocalFileDbDir + '/' + filename;
            let yesterdayFilename = _f_genLocalDbFileName(yesterday);
            let yesterdayFiledir = './db/' + gLocalFileDbDir + '/' + yesterdayFilename;

            if (fs.existsSync(filedir)) {                
                /* 14:00~24:00 could read from today file data */
                /* Check whether exist today price data. */                                    
                //console.log(filedir);
                stockRealTimePrice = utility.readDataDbFile(filedir);
                bGetRealTimeFromWeb = false; 
                return callback(null, stockRealTimePrice);
            }else if ((fs.existsSync(yesterdayFiledir)) && (!_f_isAfterClosingtime())) 
            {  
                /* 00:00 ~ 09:00 could read yesterday file data. */
                /* Check whether exist yesterday price data. */
                stockRealTimePrice = utility.readDataDbFile(yesterdayFiledir);
                bGetRealTimeFromWeb = false; 
                return callback(null, stockRealTimePrice);
            }else{
                /* Sunday:0 Monday:1 ... */
                let todayOfWeek = moment().weekday();
                let yesterdayOfWeek = moment().subtract(1, 'day').weekday();
                
                if (todayOfWeek == 0 || todayOfWeek == 6 || ((todayOfWeek == 1) && (!_f_isAfterClosingtime())))
                {
                    let subtractMappting = { 6:1,0:2, 1:3}; /* Sunday:0 (Friday is subtract 2)*/

                    let lastOpenDay = moment().subtract(subtractMappting[todayOfWeek], 'day').format('YYYY-MM-DD');

                    /* During Friday 14:00 to Monday 8:95 */
                    let filename = _f_genLocalDbFileName(lastOpenDay);
                    let filedir = './db/' + gLocalFileDbDir + '/' + filename;

                    if (fs.existsSync(filedir)) {                                            
                        stockRealTimePrice = utility.readDataDbFile(filedir);
                        bGetRealTimeFromWeb = false; 
                        return callback(null, stockRealTimePrice);
                    }else{
                          bGetRealTimeFromWeb = true;   
                    }
                }else{                
                    console.log("INFO - Get real time price from web.");
                    bGetRealTimeFromWeb = true;    
                }
            }
        } /* if */

        if (bGetRealTimeFromWeb)
        {

            _f_readAllStockPriceFromWeb(stockid_list, function(err, result){        
                stockRealTimePrice = result;
            
                /* Backup to file db, if not during 9:00~14:30, backup to file db. */
                if (( Object.keys(stockRealTimePrice).length > 0 ) && (!_f_isDuringOpeningtime()))
                {
                    //console.log("First Element key:" + Object.keys(gStockRealTimePrice)[0]);
                    //console.log("Result Length:" + Object.keys(gStockRealTimePrice).length);

                    let firstKey =  Object.keys(stockRealTimePrice)[0];

                    let localDbFileName = _f_genLocalDbFileName(stockRealTimePrice[firstKey].datetime);
                    utility.writeDbFile(localDbFileName, gLocalFileDbDir, stockRealTimePrice);   
                }                                            
                utility.timestamp('getRealtimeStockPric()---');
                return callback(null, stockRealTimePrice);    
            });
        } else{
            return callback(null, stockRealTimePrice);   
        }        
}

function _f_add_stock_info(stockId, type, stockRealTimePrice, srtpObj, analyzeResult)
{
    srtpObj[stockId] = stockRealTimePrice[stockId];                             
    if (analyzeResult[type] == undefined){
        analyzeResult[type] = [];                    
    }                

    let lastCP = stockInfoCrawler.gStockDailyInfo[stockId].result_StockInfo.CP;
    let currentGP = parseFloat(srtpObj[stockId].currentPrice) - lastCP;                
    srtpObj[stockId].GS = currentGP.toFixed(2);
    srtpObj[stockId].GSP = ((currentGP/lastCP)*100).toFixed(1);                
    analyzeResult[type].push(stockInfoCrawler.gStockDailyInfo[stockId]);    
}

//******************************************
// _f_analyze_realtime_stock()
//******************************************
function _f_analyze_realtime_stock(stockRealTimePrice)
{
  let analyzeResult = {};
  let srtpObj = {}; /* store real-time price */ 

  while (stockInfoCrawler.gStockDailyInfo == undefined)
  {
      console.log("Wait stockInfoCrawler.gStockDailyInfo...");
      wait.for(utility.sleepForMs, 1000);
  }
 
  /* Check last stock id in list whether it is ready. */
  while (stockInfoCrawler.gStockDailyInfo['9958'] == undefined)
  {
      console.log("Wait stockInfoCrawler.gStockDailyInfo['9958']...");
      wait.for(utility.sleepForMs, 1000);
  }

  for (let stockId of gStockAllInfoObj.stockIdList)
  {       
     //try {
          let times = 1;
          /* Transfer datetime: 2017-05-02 09:22-44, remove '-44' */
          let re = /\-[0-9]*$/g;
          let temp_datetime;
          try {
            temp_datetime = stockRealTimePrice[stockId].datetime;
          } 
          catch(err)
          {
            console.log("ERROR - Undefined RealTimePrice Object:");  
            console.log("Stock ID:" + stockId);  
            console.dir(stockRealTimePrice[stockId]);
            continue;
          } /* try -catch */
          if (temp_datetime == undefined){
              console.log("ERROR - temp_datetime: undefined");
              console.dir(stockRealTimePrice[stockId]);
              continue;
          }
          temp_datetime = temp_datetime.replace(re, '');
          
          if(_f_isDuringSpecialTime(temp_datetime, '09:05', '09:15'))
          {
              /* 09:10 check, TV is over 1/10 TVMA30 */ 
              times = 10;
          }
          else if(_f_isDuringSpecialTime(temp_datetime, '09:25', '09:35'))          
          {
              /* 09:30 check, TV  is over 1/3 TVMA03. */
              times = 3.3333;
          }
          else if(!_f_isDuringOpeningtime())
          {
              /* Close market, TV  is over 2 times TVMA03. */
              times = 0.5
          } 
          
          try {
             if (stockInfoCrawler.gStockDailyInfo[stockId].result_TV == undefined ||
                 stockInfoCrawler.gStockDailyInfo[stockId].result_MA == undefined)
             {
                continue;
             }

             /* 量太小不看 */
             if (stockInfoCrawler.gStockDailyInfo[stockId].result_TV.RTVMA_03 < 500){
                continue; 
             }              
          } 
          catch(err)
          {
              console.log("ERROR - Undefined result_TV Object:");  
              console.log("Stock ID:" + stockId);                
              continue;
          }
           
          /*************************************************/   
          /* check Realtime TV */
          /*************************************************/
          if((parseInt(stockRealTimePrice[stockId].tv)*times) > (parseInt(stockInfoCrawler.gStockDailyInfo[stockId].result_TV.RTVMA_03)))
          {
            let type = 'TVMA03_compare_' + times.toString();          
            _f_add_stock_info(stockId, type, stockRealTimePrice, srtpObj, analyzeResult);                                  
          }   
          /*************************************************/          

          /*************************************************/
          /* Check through MA60 */ 
          /*************************************************/
          let yesterday_cp = stockInfoCrawler.gStockDailyInfo[stockId].result_StockInfo.CP;
          let current_cp = parseFloat(stockRealTimePrice[stockId].currentPrice);
          let MA60 =  parseFloat(stockInfoCrawler.gStockDailyInfo[stockId].result_MA.MA60);  
          if((yesterday_cp < MA60) && (current_cp >= MA60))
          {
             let type = 'MA60_Through_UP';          
             _f_add_stock_info(stockId, type, stockRealTimePrice, srtpObj, analyzeResult);                                                 
          } 
            
          if((yesterday_cp > MA60) && (current_cp <= MA60))
          {
             let type = 'MA60_Through_DOWN';        
             _f_add_stock_info(stockId, type, stockRealTimePrice, srtpObj, analyzeResult);                                               
          }          
          /*************************************************/

          /*************************************************/
          /* Check Price is MAX/min during 60 days.
          /*************************************************/
          let DURATION_MAX =  parseFloat(stockInfoCrawler.gStockDailyInfo[stockId].result_MA.MAX);  
          let DURATION_MIN =  parseFloat(stockInfoCrawler.gStockDailyInfo[stockId].result_MA.MIN);
          if (current_cp > DURATION_MAX){
             let type = 'P > MAX(60)';         
             _f_add_stock_info(stockId, type, stockRealTimePrice, srtpObj, analyzeResult);                                                
          } 
         
          if (current_cp < DURATION_MIN){
             let type = 'P < MIN(60)';        
            _f_add_stock_info(stockId, type, stockRealTimePrice, srtpObj, analyzeResult);                                                 
          }           
          /*************************************************/
          console.log(stockId + " CP:" + current_cp + ' min:' + DURATION_MIN + ' max:' + DURATION_MAX);
          console.log(stockId + " CP:" + current_cp + ' MA60:' + MA60);

          /* Check MA5 through MA20 real-time */
/*          
          let MA20 =  parseFloat(stockInfoCrawler.gStockDailyInfo[stockId].result_MA.MA20);  
          let MA5 =  parseFloat(stockInfoCrawler.gStockDailyInfo[stockId].result_MA.MA5);  
          let MA20_2nd =  parseFloat(stockInfoCrawler.gStockDailyInfo[stockId].result_MA.MA20);  
          let MA5_2dn =  parseFloat(stockInfoCrawler.gStockDailyInfo[stockId].result_MA.MA5);            
          (MA20*20) - (MA20_2nd*20)
          if((yesterday_cp > MA60) && (current_cp <= MA60))
          {
             let type = 'MA60_Through_DOWN';
             if (parseInt(stockRealTimePrice[stockId].tv) > 1000)
             {          
                _f_add_stock_info(stockId, type, stockRealTimePrice, srtpObj, analyzeResult);                      
             }              
          }    
*/
      //} catch(err){
      //    console.log("ERROR - Compare TVMA Error! (" + stockId + ')' + err);
      //} /* try-catch */           
  } /* for */

  let result = {}; 
  
  result.srtpAllObj = srtpObj;
  result.analyzeResult = analyzeResult;

  return result;
}

//******************************************
// updateRealTimeStockPrice()
//******************************************
function _f_updateRealTimeStockPrice(stockInfoObj)
{
    utility.timestamp('updateRealTimeStockPrice()+++');
    if (stockInfoObj == undefined) 
    {    
        return;
    }

    if (gStockRealTimePrice == undefined) 
    {    
        return;
    }

    /* 09:00 ~ 13:30 */
    /* get real time price */  
    let testmode = false;
    getRealTimeStockPrice(stockInfoObj.stockIdList, function(err, result) 
    {
        gStockRealTimePrice = result;
        exports.gStockRealTimePrice = gStockRealTimePrice;      
       
        if(_f_isDuringOpeningtime() || testmode == true)
        {                 
           /* Do someting, check TV MA */
           let result_analyze  = _f_analyze_realtime_stock(gStockRealTimePrice);
           exports.gStockRealTimeAnalyzeResult = result_analyze;                       
           utility.timestamp('updateRealTimeStockPrice() Done!');
        }
    });
}; 

function _f_init_scheduler()
{
    let rule = new schedule.RecurrenceRule();
　　let times = [];
    
    /* Every 10 minute to update stock price. */
　　for(let i=0; i<60; i=i+3){
　　　　times.push(i);
　　}
　　rule.minute = times;    
    rule.hour = [9, 10, 11, 12, 13];  
    rule.dayOfWeek = [1, 2, 3, 4, 5]; /* Monday to Friday */
    let j = schedule.scheduleJob(rule, function(){
        console.log('scheduleJob: updateTwStockTwsePRE()');
        _f_updateRealTimeStockPrice(gStockAllInfoObj);
    });
}

//******************************************
// Utility
//******************************************
exports.init = function()
{    
    console.log("INFO - twStockRealTimePrice init()");
    function exec(callback)
    {
        gStockAllInfoObj = _f_initStockIdList();        
        //gStockAllInfoObj.stockIdList = ['2498', '2454', '1101']; /* For Test only */
        _f_updateRealTimeStockPrice(gStockAllInfoObj); 
        _f_init_scheduler();

        return callback(null);
    }
    wait.launchFiber(exec, function(){});
};

//exports.init();
