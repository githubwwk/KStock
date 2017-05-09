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
exports.gStockRealTimePrice;
var gStockRealTimeTVGSPCheckResult = {};
exports.gStockRealTimeTVGSPCheckResult;
var gLocalFileDbDir = 'daily_stock_price';
var gStockAllObj;
exports.gStockAllObj;

//******************************************
// data_reconstruct()
//******************************************
function data_reconstruct(raw_data_list)
{
    var organize_data_dict = {};  /* Put/Call Ratio dict */
    var rank = 1;
    var buy_type = 1;
    var stock_list = [];

    for (var i=2 ; i<raw_data_list[0].length; i ++)
    {
        var dataObj = {};
        try {
               
            dataObj.stockId = raw_data_list[0][i];    /* Stock ID */
            dataObj.stockName = raw_data_list[1][i];  /* Stock cname  */
            dataObj.PRE = raw_data_list[2][i];      /* PRE 本益比 */
            dataObj.YR = raw_data_list[3][i];     /* Yield rate 殖利率 */
            dataObj.PBR = raw_data_list[4][i];   /* PBR(Price-Book Ratio) 股價淨值比 */
                       
            stock_list.push(dataObj);  /* Stock ID Key */                
            

        }catch(err){
            console.log("ERROR get raw data fail!" + err)
        } /* try-catch */
                 
    } /* for */
    
    organize_data_dict.stock_list = stock_list;
        
    return organize_data_dict;
} /* function - stock_data_reconstruct */

//******************************************
// getDatafromWeb()
//******************************************
function getDatafromWeb(options, callback)
{   
    request( options, function (error, response, body) {

        if (!error && response.statusCode == 200) {
            
            try {
               let buffer = new Buffer(body);
               let str = iconv.decode(buffer, 'utf8');           

                var stockRealTimeObj = JSON.parse(body);                
             
                //console.dir(stockRealTimeObj);
                var result = {};
                result.highPrice = stockRealTimeObj.msgArray[0].h;
                result.lowPrice = stockRealTimeObj.msgArray[0].l;
                result.currentPrice = stockRealTimeObj.msgArray[0].z;  
                result.tv = stockRealTimeObj.msgArray[0].v;   /* Trading Volumn */
                result.stockId = stockRealTimeObj.msgArray[0].c;    
                let ms_tlong = stockRealTimeObj.msgArray[0].tlong;        
                result.datetime = new moment(parseInt(ms_tlong)).format('YYYY-MM-DD HH:mm-ss');  
            } catch(err){
                console.log('ERROR - stockRealTimePrice getDatafromWeb()' + err);
                console.dir(options);
                return callback('ERROR - stockRealTimePrice getDatafromWeb()' + err);                
            }
        }
            
        return callback(null, result);
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
                //console.dir(cookie);
            }
            return callback_getcookie(null, cookie);
    });
}

//******************************************
// readStockPriceFromWeb
//******************************************
exports.readStockPriceFromWeb = function(stockid, callback_readPrice)
{
    console.log("readStockPriceFromWeb() StockId:" + stockid);
    let options_default = {
        url : '',
        method: "GET",     
        //headers: {'Cookie' : 'JSESSIONID=3278E47F1E44C7E414FD8FBAC2F6E7E9; _ga=GA1.3.360613230.1488807194; __utma=193825960.360613230.1488807194.1490979469.1491336371.21; __utmz=193825960.1490631663.15.7.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=872CA1FAAF045D62AB589040C5913BD1'}                     
        headers:{}
    };

    let xtime = new moment().format('x'); /* Unix ms timestamp */    
    //let xtime = new moment('2017-04-17 09:30:00', 'YYYY-MM-DD HH:mm:ss').format('x'); /* Unix ms timestamp */    
    let stockId = stockid;
    let url = 'http://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_' + stockId + '.tw&json=1&delay=0&_=' + xtime;
    //var cookie_temp = 'JSESSIONID=3278E47F1E44C7E414FD8FBAC2F6E7E9; _ga=GA1.3.360613230.1488807194; __utma=193825960.360613230.1488807194.1490979469.1491336371.21; __utmz=193825960.1490631663.15.7.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); JSESSIONID=872CA1FAAF045D62AB589040C5913BD1'; 
    let cookie_temp = '%COOKIE_STR%; _ga=GA1.3.360613230.1488807194; __utma=193825960.360613230.1488807194.1490979469.1491336371.21; __utmz=193825960.1490631663.15.7.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); %COOKIE_STR%'; 
    //console.log(xtime);
    //console.log(url); 

    function exec(callback_exe)
    {                          
         let cookie = wait.for(getCookie); 
         options_default.url = url;          
         //options_default.headers.Cookie = replaceall(cookie_temp, '%COOKIE_STR%',cookie);   
         options_default.headers.Cookie = cookie_temp.replace(/%COOKIE_STR%/g, cookie);     
         try {
             let data = wait.for(getDatafromWeb, options_default);          
             callback_exe(null, data);        
         }catch(err){
             /* Do something for getDatafromWeb() error */
         }
         
    } /* readStockPriceFromWeb() */

    wait.launchFiber(exec, callback_readPrice);
};

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
    //let xtime = new moment('2017-04-17 09:30:00', 'YYYY-MM-DD HH:mm:ss').format('x'); /* Unix ms timestamp, for testing */  
    let cookie_temp = '%COOKIE_STR%; _ga=GA1.3.360613230.1488807194; __utma=193825960.360613230.1488807194.1490979469.1491336371.21; __utmz=193825960.1490631663.15.7.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); %COOKIE_STR%'; 
    

    function exec(callback_exe)
    {                          
         let cookie = wait.for(getCookie);                    
         //options_default.headers.Cookie = replaceall(cookie_temp, '%COOKIE_STR%',cookie);   
         options_default.headers.Cookie = cookie_temp.replace(/%COOKIE_STR%/g, cookie);   
         let result = {};

         for (let stockId of stockid_list)
         { 
            console.log("Get RTP:" + stockId);
            let url = 'http://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_' + stockId + '.tw&json=1&delay=0&_=' + xtime;     
            options_default.url = url; 
            try {
                 let data = wait.for(getDatafromWeb, options_default);       
                 //console.dir(data);               
                 result[stockId] = data;                                         
            }catch(err){
                  result[stockId] = undefined;                  
            }
            wait.for(utility.sleepForMs, 25); /* mis.twse.com.tw limitation. Should add delay. */ 
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

//******************************************
// _f_check_realtime_TV_GSP()
//******************************************
function _f_check_realtime_TV_GSP()
{
  let result = {};  
  result.priceRiseOver5 = {};
  result.priceFallOver5 = {};
  result.RTPAndTvRise= {};

  while (stockInfoCrawler.gStockDailyInfo == undefined)
  {
      console.log("Wait stockInfoCrawler.gStockDailyInfo...");
      wait.for(utility.sleepForMs, 1000);
  }

  while (stockInfoCrawler.gStockDailyInfo['9958'] == undefined)
  {
      console.log("Wait stockInfoCrawler.gStockDailyInfo['9958']...");
      wait.for(utility.sleepForMs, 1000);
  }

  for (let stockId of gStockAllObj.stockIdList)
  {       
     try {
          let times = 1;
          /* Transfer datetime: 2017-05-02 09:22-44, remove '-44' */
          let re = /\-[0-9]*$/g;
          let temp_datetime = gStockRealTimePrice[stockId].datetime;
          temp_datetime = temp_datetime.replace(re, '');
          
          if(_f_isDuringSpecialTime(temp_datetime, '09:05', '09:15'))
          {
              /* 09:10 check, TV is over 1/10 TVMA30 */ 
              times = 10;
          }
          else if(_f_isDuringSpecialTime(temp_datetime, '09:25', '19:35'))          
          {
              /* 09:30 check, TV  is over 1/3 TVMA03. */
              times = 3.3333;
          }
          else if(!_f_isDuringOpeningtime())
          {
              /* Close market, TV  is over 2 times TVMA03. */
              times = 0.5
          } 
          
          /* check Realtime TV */
          if((parseInt(gStockRealTimePrice[stockId].tv)*times) > (parseInt(stockInfoCrawler.gStockDailyInfo[stockId].result_TV.RTVMA_03)))
          {
             if (parseInt(gStockRealTimePrice[stockId].tv) > 1000)
             { 
                let stockObj = {};
                stockObj.Info = stockInfoCrawler.gStockDailyInfo[stockId];
                stockObj.RtInfo = gStockRealTimePrice[stockId];             
                result.RTPAndTvRise[stockId] = stockObj;
                //console.log("[RTP TV bigger than MA3]:" + stockId);
                //console.log("[TV]:" + gStockRealTimePrice[stockId].tv);
                //console.log("[TVMA03]:" + stockInfoCrawler.gStockDailyInfo[stockId].result_TV.RTVMA_03);
             }
          }            
          
          /* Price Rise over 5% */
          if(parseFloat(stockInfoCrawler.gStockDailyInfo[stockId].result_StockInfo.GSP) > 5)
          {
              console.log("[GSP UP 5%][StockId]:" + stockId);
              console.log("[GSP]:" + stockInfoCrawler.gStockDailyInfo[stockId].result_StockInfo.GSP);
              console.log("[TV]:" + stockInfoCrawler.gStockDailyInfo[stockId].result_StockInfo.TV/1000);
              let stockObj = {};
              stockObj.Info = stockInfoCrawler.gStockDailyInfo[stockId];
              stockObj.RtInfo = gStockRealTimePrice[stockId];             
              result.priceRiseOver5[stockId] = stockObj;
          }  
          
          /* Price fall over 5% */
          if(parseFloat(stockInfoCrawler.gStockDailyInfo[stockId].result_StockInfo.GSP) < -5)
          {
              console.log("[GSP DOWN 5% StockId]:" + stockId);
              console.log("[GSP]:" + stockInfoCrawler.gStockDailyInfo[stockId].result_StockInfo.GSP);
              console.log("[TV]:" + stockInfoCrawler.gStockDailyInfo[stockId].result_StockInfo.TV/1000);
              let stockObj = {};
              stockObj.Info = stockInfoCrawler.gStockDailyInfo[stockId];
              stockObj.RtInfo = gStockRealTimePrice[stockId];             
              result.priceFallOver5[stockId] = stockObj;
          }  

      } catch(err){
          console.log("ERROR - Compare TVMA Error! (" + stockId + ')' + err);
      } /* try-catch */           
  } /* for */
  //console.dir(result);
  return result;
}

//******************************************
// updateRealTimeStockPrice()
//******************************************
exports.updateRealTimeStockPrice = function()
{
    utility.timestamp('updateRealTimeStockPrice()+++');
    if (gStockAllObj == undefined) 
    {    
        return;
    }

    if (gStockRealTimePrice == undefined) 
    {    
        return;
    }

    if(_f_isDuringOpeningtime())
    { 
        /* get real time price */  
        getRealTimeStockPrice(gStockAllObj.stockIdList, function(err, result){
            gStockRealTimePrice = result;
            exports.gStockRealTimePrice = gStockRealTimePrice;
            //console.dir(gStockRealTimePrice);
            
            /* Do someting, check TV MA */
            gStockRealTimeTVGSPCheckResult = _f_check_realtime_TV_GSP();
            exports.gStockRealTimeTVGSPCheckResult = gStockRealTimeTVGSPCheckResult;

            utility.timestamp('updateRealTimeStockPrice() Done!');
        });        
    }
}; 

function _f_init_scheduler()
{
    let rule = new schedule.RecurrenceRule();
　　let times = [];
    
    /* Every 10 minute to update stock price. */
　　for(let i=1; i<60; i=i+3){
　　　　times.push(i);
　　}
　　rule.minute = times;    
    rule.hour = [9, 10, 11, 12, 13];  
    rule.dayOfWeek = [1, 2, 3, 4, 5]; /* Monday to Friday */
    let j = schedule.scheduleJob(rule, function(){
        console.log('scheduleJob: updateTwStockTwsePRE()');
        exports.updateRealTimeStockPrice();
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
        gStockAllObj = _f_initStockIdList();
        exports.gStockAllObj= gStockAllObj
        //gStockAllObj.stockIdList = ['2498', '2454', '1101']; /* For Test only */
        getRealTimeStockPrice(gStockAllObj.stockIdList, function(err, result){            
            gStockRealTimePrice = result;
            exports.gStockRealTimePrice = gStockRealTimePrice;
            //console.dir(gStockRealTimePrice);
            /* Do someting, check TV MA */
            gStockRealTimeTVGSPCheckResult =  _f_check_realtime_TV_GSP();
            exports.gStockRealTimeTVGSPCheckResult = gStockRealTimeTVGSPCheckResult;
            _f_init_scheduler();
        });
        return callback(null);
    }
    wait.launchFiber(exec, function(){});
};


