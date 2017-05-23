﻿
"use strict"
var request = require('request');
//var fs = require('fs');
var fs = require("fs-extra");
var moment = require('moment');
var wait = require('wait.for');
var cheerio = require('cheerio');
var cheerioTableparser = require('cheerio-tableparser');
var merge = require('merge');
var fs = require("fs-extra");
var db = require("./db.js");
var utility = require("./utility.js");

//******************************************
// Setting
//******************************************

var STOCK_DOWN_MIN_PRICE = 30; /* Skip when staock price less than 30 in drop case */
var ENABLE_A01 = false;
var ENABLE_A02 = false;
var ENABLE_A03 = true;
var ENABLE_A04 = true;
var ENABLE_A05 = true;

//******************************************
// Global Variable
//******************************************

var gStockDailyInfo = {}; /* For store all stock information, TV, MA... */
exports.gStockDailyInfo;

var gStockDailyAnalyzeResult = {};
exports.gStockDailyAnalyzeResult; /* For store Analyze Result Stock ID */

var gAllStocksObj;  /* From PRE data, stock name, PRE.... */

//******************************************
// _f_stock_data_reconstruct()
//******************************************
function _f_stock_data_reconstruct(raw_data_list)
{
    let stock_data_dict = {};

    for (let i=0 ; i < raw_data_list.length ; i ++)
    {       
       let stock_data = {};


       try {
            stock_data.date = raw_data_list[i][0];
            stock_data.TV = parseInt(raw_data_list[i][1].replace(/,/g, '')); /* Trading Volume 成交張數 */
            //stock_data.TO =  parseInt(row_data_list[2].replace(/,/g, '')); /* TurnOver in value 成交量 */
            stock_data.OP = raw_data_list[i][3]; /* Open Price 開盤價 */
            stock_data.DH = raw_data_list[i][4]; /* Day High 最高價 */
            stock_data.DL = raw_data_list[i][5]; /* Day Low 最低價 */
            stock_data.CP = parseFloat(raw_data_list[i][6].replace(/,/g, '')); /* Closing Price 收盤價*/
            stock_data.GS = parseFloat(raw_data_list[i][7].replace(/,/g, '')); /* Gross Spread:漲跌價差 */
            stock_data.GSP =  (stock_data.GS/(stock_data.CP-stock_data.GS)*100).toFixed(1); /* Gross Spread percentage */
            //stock_data.NT = rraw_data_list[i][8]; /* Number of Transactions 成交筆數 */
       }catch(err){
            console.log("ERROR get raw data fail!" + err)
       } /* try-catch */
     
       stock_data_dict[stock_data.date] = stock_data;  /* DATE Key */
       //console.dir(stock_data);
    } /* for i */

    return stock_data_dict;

} /* function - _f_stock_data_reconstruct */

//******************************************
// _f_getStockMonthData()
//******************************************
function _f_readLastSyncTimeLog(stockId)
{
    let lastSyncTime_dir = './db/dail_stock_info/' + stockId + '/lastSyncTime.log';
        
    try {      
      var content = fs.readFileSync(lastSyncTime_dir);      
      var result = JSON.parse(content.toString());      
    }catch(err){
      console.log('INFO - lastSyncTime.log not exist:' + lastSyncTime_dir);
    }
    return result;
}

function _f_writeLastSyncTimeLog(stockId)
{    
    let lastSyncTimeObj = {};
    lastSyncTimeObj.time = moment().format('YYYY-MM-DD HH:mm:ss');  

    let lastSyncTime_dir = './db/dail_stock_info/' + stockId;
    fs.ensureDirSync(lastSyncTime_dir);
    let lastSyncTime_file = lastSyncTime_dir + '/lastSyncTime.log';

    fs.writeFileSync(lastSyncTime_file, JSON.stringify(lastSyncTimeObj));
    console.log('Write lastSyncTime.log:' + lastSyncTime_file);

    return 0;
}

function _f_isDuringOpeningtime()
{
    let today = moment().format('YYYY-MM-DD');
    let sart_time = today +' 09:00';
    let end_time = today +' 14:00';     
    return moment().isBetween(sart_time, end_time);
}

function _f_isAfterClosingtime()
{
    let today = moment().format('YYYY-MM-DD');    
    let end_time = today +' 14:00';     
    return moment().isAfter(end_time);
}

function _f_getStockMonthData(stockId, year, month)
{
    /* try open on local DB */
    let db_dir = './db/dail_stock_info/';
    let stock_db_file  = db_dir + stockId + '/' + year + '_' + month + '.db';
    let current_month = moment().month() + 1;
    let temp_data_dict;
    
    if (current_month == month)
    {
        let lastSyncTimeObj = _f_readLastSyncTimeLog(stockId);  
        if(lastSyncTimeObj == undefined)
        {
            /* First sync. */     
            temp_data_dict = wait.for(_f_getStockDatafromWeb, stockId, year, month);        
            _f_writeDataDbFile(db_dir, stockId, year, month, temp_data_dict); 
            _f_writeLastSyncTimeLog(stockId);  
        }else{            
           let lastOpenDate = utility.lastOpenDateOfWeek();            
           let last_open_end_time = lastOpenDate +' 14:00';  

           if(moment(lastSyncTimeObj.time).isBefore(last_open_end_time))
           {
                temp_data_dict = wait.for(_f_getStockDatafromWeb, stockId, year, month);        
                _f_writeDataDbFile(db_dir, stockId, year, month, temp_data_dict); 
                _f_writeLastSyncTimeLog(stockId);  
           }else{
                try{
                    temp_data_dict = _f_readDataDbFile(stock_db_file);    
                }catch(err){
                    temp_data_dict = wait.for(_f_getStockDatafromWeb, stockId, year, month);        
                    _f_writeDataDbFile(db_dir, stockId, year, month, temp_data_dict);                 
                    _f_writeLastSyncTimeLog(stockId);  
                }                 
           }    
        }

    }else{
        /* Not this month, could try to read data from file. */
        try{
            temp_data_dict = _f_readDataDbFile(stock_db_file);    
        }catch(err){
            temp_data_dict = wait.for(_f_getStockDatafromWeb, stockId, year, month);        
            _f_writeDataDbFile(db_dir, stockId, year, month, temp_data_dict);                 
        }        
    }
    
    return temp_data_dict;
}

//******************************************
// _f_getStockDatafromWeb()
//******************************************
function _f_getStockDatafromWeb(stockId, year, month, callback_web)
{
    console.log("Get Data from Web:" + stockId + ' month:' + month);
    let dateStr = moment([parseInt(year), parseInt(month)-1, 1]).format("YYYYMMDD");
    let URL = 'http://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=' + dateStr +'&stockNo=' + stockId + '&_=';

    let cookie = '';
    let stock_data_dict = {};
    request( URL, function (error, response, body) {          
            if (!error && response.statusCode == 200) {
                let stockObj = JSON.parse(body); 
                //console.dir(cookie);
                stock_data_dict = _f_stock_data_reconstruct(stockObj.data); ///< data is a list.
                return callback_web(null, stock_data_dict);
            }else{
                try {
                    console.log("ERROR - _f_getStockDatafromWeb() statusCode:" + response.statusCode);    
                    return callback_web(response.statusCode, error);
                }catch(err){
                    return callback_web(-1, error);
                }
            }
             
    });
}

//******************************************
// stockAnalyze()
//******************************************

var TV_TIMES_CONDITION = 1.5;

/* 帶量超過5日均量1.5倍 */
function stockAnalyze_01(stock_id, data_dict)
{
    let result = {};
    
    return result;
} /* stockAnalyze_01 */

function _f_genPriceAndTVSerialData(date_list, data_dict)
{
    let result = {};
    let Date_SerialData = [];
    let TV_SerialData = [];
    let CP_SerialData = [];
    for(let i=0; i<date_list.length ; i++)
    {        
        Date_SerialData.push(date_list[i]);
        CP_SerialData.push(data_dict[date_list[i]].CP);
        TV_SerialData.push(data_dict[date_list[i]].TV);
    }
    
    result.Date_SD = Date_SerialData;
    result.CP_SD = CP_SerialData;
    result.TV_SD = TV_SerialData;
    return result;


}

function _f_genMATV(date_list, data_dict)
{
    let result = {};

    if(date_list.lenght < 60)
    {
        return undefined;
    }

    try {
         let temp_TVMA10 = 0;
         let temp_TVMA05 = 0;
         let temp_TVMA03 = 0;

         let temp_RTVMA10 = 0;  /* For realtime check TV, include last date. */
         let temp_RTVMA05 = 0;  /* For realtime check TV, include last date. */
         let temp_RTVMA03 = 0;  /* For realtime check TV, include last date. */        

         for (let i=0; i<=10 ; i++)
         {
              if(i<10)
              {
                   temp_TVMA10 += data_dict[date_list[i+1]].TV;
                   temp_RTVMA10 += data_dict[date_list[i]].TV;
              }
              if(i<5)
              {
                   temp_TVMA05 += data_dict[date_list[i+1]].TV;                    
                   temp_RTVMA05 += data_dict[date_list[i]].TV;
              }
              if(i<3)
              {
                   temp_TVMA03 += data_dict[date_list[i+1]].TV;                    
                   temp_RTVMA03 += data_dict[date_list[i]].TV;
              }
         }
         var TVMA_10 = Math.round((temp_TVMA10)/10000);
         var TVMA_05 = Math.round((temp_TVMA05)/5000);
         var TVMA_03 = Math.round((temp_TVMA03)/3000);

         var RTVMA_10 = Math.round((temp_RTVMA10)/10000);
         var RTVMA_05 = Math.round((temp_RTVMA05)/5000);
         var RTVMA_03 = Math.round((temp_RTVMA03)/3000);

         //var TV_times = (data_dict[date_list[i]].TV / TVMA_05).toFixed(1);
         
         //result.TV_times = TV_times;
         result.TVMA_10 = TVMA_10;         
         result.TVMA_05 = TVMA_05;
         result.TVMA_03 = TVMA_03;
         result.RTVMA_10 = RTVMA_10;         
         result.RTVMA_05 = RTVMA_05;
         result.RTVMA_03 = RTVMA_03;

         result.TV = Math.round(data_dict[date_list[1]].TV/1000); /* Yesterday TV */        
         result.RTV = Math.round(data_dict[date_list[0]].TV/1000); /* last (Today, after close market) TV */        

    } catch(err){
          console.log("ERROR - _f_genMATV()" + err);
          result = undefined;
    }
   return result;

}

/* 現貨價穿過MA60 */
function stockAnalyze_02(date_list, data_dict, result_MA)
{
   let result = {};
   let date_key = date_list[0];
   let temp_CP = data_dict[date_key].CP;
   let temp_GS = data_dict[date_key].GS;

   if ((temp_CP > result_MA.MA60) && ((temp_CP - temp_GS) < result_MA.MA60)) 
   {
        console.log("[Key Date][N->P]:" + key);
        console.log("[CP]" + data_dict[key].CP);
        console.log("[GS]" + data_dict[key].GS);
        console.log("[GSP]" + data_dict[key].GSP + '%');
        console.log(result_MA);
        //data_dict[key].TV_times = check_TV_times(0, data_dict, key_list);

        result.keyMoment = true;
        data_dict[key].type = 'N->P';
        keyDate = key;
   }
   else if((temp_CP < result_MA.MA60) && ((temp_CP - temp_GS) > result_MA.MA60))  
   { /* DOWN */
        console.log("[Key Date][P->N]:" + key);
        console.log("[CP]" + data_dict[key].CP);
        console.log("[GS]" + data_dict[key].GS);
        console.log("[GSP]" + data_dict[key].GSP + '%');
        console.log(result_MA);
        //data_dict[key].TV_times = check_TV_times(0, data_dict, key_list);
        result.keyMoment = true;
        data_dict[key].type = 'P->N';
        keyDate = key;
    }/* if-else */
        
    //result.stockDailyInfo = data_dict[keyDate];    

    return result;
}/* function stockAnalyze_02() */

function stockAnalyze_03(stockInfoObj)
{
    let stockId = stockInfoObj.stockId;
    let result_MA = stockInfoObj.result_MA;
    let result_TV = stockInfoObj.result_TV;
    if ((result_MA.diff < 10) && (result_TV.RTV > (result_TV.RTVMA_03*1.3)) && (parseInt(result_TV.RTV) > 500))
    {                     
        console.log("[MA diff<0.5%]:"  + stockId + ' [diff]:' + result_MA.diff.toFixed(2) + ' [TV]:' + result_TV.RTV);        
        if (gStockDailyAnalyzeResult['stockDaily_A03'] == undefined)
        {
            gStockDailyAnalyzeResult['stockDaily_A03'] = [];
        }                       
        gStockDailyAnalyzeResult['stockDaily_A03'].push(gStockDailyInfo[stockId]);
    } /* if */

} /* stockAnalyze_03() */

function stockAnalyze_04(stockInfoObj)
{
    /********************/ 
    /* MA5 through MA20 */
    /********************/
    let result_type = 'stockDaily_A04';
    let stockId = stockInfoObj.stockId;
    let result_MA = stockInfoObj.result_MA;
    let result_TV = stockInfoObj.result_TV;
    
    if (gStockDailyAnalyzeResult[result_type] == undefined)
    {
       gStockDailyAnalyzeResult[result_type] = [];
    }                       

    let MA_list_len = result_MA.MA60_list.length;
    let diff_list = [];
    
    /* Every MA5 - MA20 to get diff value */
    for (let i=0 ; i<MA_list_len ; i++)
    {
        let diff = result_MA.MA5_list[i] - result_MA.MA20_list[i];
        diff_list.push(diff);
    }
    
    /* Check diff serial data, if sign change, it means MA5 through MA20 */
    //for (let i=0 ; i < MA_list_len-1 ; i++)
    for (let i=0 ; i < 1 ; i++) /* 5 days */
    {
        let a;
        let b;
        a = (diff_list[i] > 0)?true:false;
        b = (diff_list[i+1] > 0)?true:false;
        
        /*  */
        if ((a ^ b) && (result_TV.RTVMA_03 > 500))
        {        
            gStockDailyAnalyzeResult[result_type].push(gStockDailyInfo[stockId]);
            break;
        }
    } /* for */       
}

function stockAnalyze_05(stockInfoObj)
{
    let result_type = 'stockDaily_A05';
    let stockId = stockInfoObj.stockId;
    let result_MA = stockInfoObj.result_MA;
    let result_TV = stockInfoObj.result_TV;
    
    if (result_TV.RTVMA_03 < 1000){
        return;
    }

    if (gStockDailyAnalyzeResult[result_type] == undefined)
    {
       gStockDailyAnalyzeResult[result_type] = [];
    }                       

    let MA_list_len = result_MA.MA60_list.length;        
    console.log("MA list Len:" + MA_list_len);
    console.log("RTCMA_03:" + result_TV.RTVMA_03);

    /* MA60 diff value */
    let diff_list = [];
    for (let i=1 ; i<MA_list_len ; i++)
    {
        //let diff = result_MA.MA60_list[i] -  result_MA.MA60_list[i+1];
        let diff = parseFloat(result_MA.MA60_list[i]) +  parseFloat(result_MA.MA60_list[i-1]);
        diff = diff.toFixed(2);
        diff_list.push(parseFloat(diff));
        /*
        if (i > 0)                    
        {
            let a;
            let b;
            a = (diff_list[i] >= 0)?true:false;
            b = (diff_list[i-1] >= 0)?true:false;            
            if ((a ^ b) && (result_TV.RTVMA_03 > 1000))
            {
                //console.dir(diff_list);
                //gStockDailyAnalyzeResult[result_type].push(gStockDailyInfo[stockId]);   
                //break;
            }
        }
        */
    }        

    console.log("CP:" + stockInfoObj.result_StockInfo.CP);
    let diff_temp = ((stockInfoObj.result_StockInfo.CP - (parseFloat(diff_list[0])/2))/stockInfoObj.result_StockInfo.CP)*100;
    if ((diff_temp < 1) && (diff_temp > -1))
    {
                //console.dir(diff_list);
                gStockDailyAnalyzeResult[result_type].push(gStockDailyInfo[stockId]);   
                //break;
    }
    return;

    let diff_MA_list = [];
    let diff_MA_temp_list = [];
    for (let i=0; i<diff_list.length-5 ; i++)
    {
        /*
        diff_MA_list[i] = diff_list[i] + 
                          diff_list[i + 1] +  
                          diff_list[i + 2] ;
                          //diff_list[i + 3] + 
                          //diff_list[i + 4];  
        let temp = (diff_MA_list[i]/result_MA.MA60_list[i])*1000;        
        diff_MA_temp_list.push(temp);             
        if (temp < -10){
            gStockDailyAnalyzeResult[result_type].push(gStockDailyInfo[stockId]);
            break;
        }             
        */

            let a;
            let b;
            a = (diff_list[i] >= 0)?true:false;
            b = (diff_list[i-1] >= 0)?true:false;            
            if ((a ^ b) && (result_TV.RTVMA_03 > 1000))
            {
                //console.dir(diff_list);
                gStockDailyAnalyzeResult[result_type].push(gStockDailyInfo[stockId]);   
                //break;
            }

    }

    console.log("GG");     
}
//******************************************
// readDataDbFile()
//******************************************
function _f_readDataDbFile(file_name)
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
// _f_writeDataDbFile()
//******************************************
function _f_writeDataDbFile(db_dir, stockId, year, month, dataObj)
{    
    if (!fs.existsSync(db_dir)) {
      fs.mkdirSync(db_dir);
    }

    let stock_db_dir = db_dir + stockId;
    if (!fs.existsSync(stock_db_dir)) {
      fs.mkdirSync(stock_db_dir);
    }

    var dbfile = stock_db_dir + '/'  + year + '_' + month + '.db';
    fs.writeFileSync(dbfile, JSON.stringify(dataObj));
    console.log('Write File DB:' + dbfile);

    return 0;
}

function writeCheckResultFile(typeName, stockObj)
{
    let db_dir = './result/' + typeName + '/';
    if (!fs.existsSync(db_dir)) {
      fs.mkdirSync(db_dir);
    }

    let stock_result_dir = stockObj.stockDailyInfo.date.replace(/\//g, '-');
    let daily_dir = db_dir + stock_result_dir + '/';
    if (!fs.existsSync(daily_dir)) {
      fs.mkdirSync(daily_dir);
    }

  let dbfile = daily_dir  + '' + stockObj.stockInfo.stockId + '.db';
  fs.writeFileSync(dbfile, JSON.stringify(stockObj));
  console.log('Write File DB:' + dbfile);

    return true;
}

//******************************************
// _f_stockDailyChecker()
//******************************************
function _f_getRecentSixMonthData(stockId)
{
    let MONTH = moment().month() + 1;
    let YEAR = moment().year();

    //*********************************
    // Get 6 month stock data
    //*********************************
    let data_dict = {};    
    for(let i=0 ; i<6 ; i++ )
    {
        let data_month_int = parseInt(MONTH) - i;
        let data_year_int = parseInt(YEAR);

        if (data_month_int <= 0){
            data_month_int = data_month_int + 12;
            data_year_int = data_year_int - 1;
        }

        let query_year = data_year_int.toString();
        let query_month = data_month_int.toString();        

        let temp_data_dict;

        try{
            temp_data_dict = _f_getStockMonthData(stockId, query_year, query_month); 
            data_dict = merge(data_dict, temp_data_dict); /* Merge Data Dict */
        } catch(err){
            console.log(err);
        } /* try-catch */        
    }

    return   data_dict;  
}

function _f_genDateList(data_dict)
{
    let date_list = Object.keys(data_dict);
    if(date_list.indexOf("查無資料！") > -1)
    {
       date_list.splice( date_list.indexOf("查無資料！"), 1 );
    }
    date_list.sort();
    date_list.reverse(); /* recently to far date */
    return date_list;
}

function _f_genMA(date_list, data_dict)
{
    let posi = 0;
    let result = {};
    let price_MA60 = 0;
    let price_MA20 = 0;
    let price_MA10 = 0;
    let price_MA5 = 0;
    let check_days = 60;
    let MA_LIST_LEN = 30;

    if (date_list.length < (check_days + MA_LIST_LEN))
    {
           /* W/o valid data over 60 */           
           console.log("ERROR calMA() - date_list.length:" + date_list.length);
           return null;
    }

    for(let i=0 ; i<check_days ; i++)
    {
        try {
            let price = data_dict[date_list[posi+i]].CP;
            price_MA60 += price;

            if (i < 20) {
                price_MA20 += price;
            }
            if (i < 10) {
                price_MA10 += price;
            }
            if (i < 5) {
                price_MA5 += price;
            }
        } catch (err) {
            console.log("ERROR calMA() - Error:" + err);
            console.log("ERROR calMA() - posi:" + posi + ' i:' + i);
            console.log("ERROR calMA() - StockObj:" + date_list[posi+i]);
            console.log("ERROR calMA() - Dict Length:" + date_list.length);
            //return result;
        }/* try-catch */
    } /* for */

    let MA60 = price_MA60/60;
    let MA20 = price_MA20/20;
    let MA10 = price_MA10/10;
    let MA5 = price_MA5/5;

    result.MA60_list = [];
    result.MA20_list = [];
    result.MA10_list = [];
    result.MA5_list = [];

    result.MA60_list.push(MA60.toFixed(4));
    result.MA20_list.push(MA20.toFixed(4));
    result.MA10_list.push(MA10.toFixed(4));
    result.MA5_list.push(MA5.toFixed(4));

    let temp_price_MA60 = MA60; 
    let temp_price_MA20 = MA20; 
    let temp_price_MA10 = MA10; 
    let temp_price_MA5 = MA5; 
    /* Calculate 5 pieces MA data */
    for (let i=0 ; i<MA_LIST_LEN ; i++)
    {
        temp_price_MA60 = (temp_price_MA60*60 - data_dict[date_list[i]].CP +  data_dict[date_list[60+i]].CP)/60;     
        temp_price_MA20 = (temp_price_MA20*20 - data_dict[date_list[i]].CP +  data_dict[date_list[20+i]].CP)/20;     
        temp_price_MA10 = (temp_price_MA10*10 - data_dict[date_list[i]].CP +  data_dict[date_list[10+i]].CP)/10;
        temp_price_MA5 = (temp_price_MA5*5 - data_dict[date_list[i]].CP +  data_dict[date_list[5+i]].CP)/5;

        result.MA60_list.push(temp_price_MA60.toFixed(4));
        result.MA20_list.push(temp_price_MA20.toFixed(4));
        result.MA10_list.push(temp_price_MA10.toFixed(4));
        result.MA5_list.push(temp_price_MA5.toFixed(4));        
   }


    result.MA60 = MA60.toFixed(4);
    result.MA20 = MA20.toFixed(4);
    result.MA10 = MA10.toFixed(4);
    result.MA5 = MA5.toFixed(4);    

    let temp_MA_list = [];
    temp_MA_list.push(MA60);
    temp_MA_list.push(MA20);
    temp_MA_list.push(MA10);
    temp_MA_list.push(MA5);
    //temp_MA_list.sort();
    temp_MA_list.sort(function(a, b) {
         return a - b;
    });
    let diff = ((temp_MA_list[3] - temp_MA_list[0])/temp_MA_list[0])*1000;
    result.diff = Math.abs(diff);
    //console.log("MS Result:");
    //console.dir(result);
    return result;    
}

function _f_stockDailyChecker(stockId)
{
    let daily_check_result = {};
    let data_dict = _f_getRecentSixMonthData(stockId);
    
    let date_list = _f_genDateList(data_dict);
    
    if(date_list.length < 90)
    {   
        /* calculate MA60 and gen 30 element to MA60_list */
        /* Cannot calculate MA60, so skip. */ 
        return;
    }
    console.log("DEBUG - [StockId]:" + stockId + " [Len of data_dic]:" + date_list.length);
 
    gStockDailyInfo[stockId] = {};
    let result_MA = _f_genMA(date_list, data_dict);
    let result_TV = _f_genMATV(date_list, data_dict);
    let result_CPTVserial = _f_genPriceAndTVSerialData(date_list, data_dict);
    let result_StockInfo = data_dict[date_list[0]];        
    
    gStockDailyInfo[stockId].ver = 'v2.0';   /* From 2017.5.8 Konrad change format, so ejs has to check version for parsing. */
    gStockDailyInfo[stockId].stockId = stockId;
    gStockDailyInfo[stockId].stockInfo = gAllStocksObj.stockObjDict[stockId];    
    gStockDailyInfo[stockId].result_MA = result_MA;
    gStockDailyInfo[stockId].result_TV = result_TV;
    //gStockDailyInfo[stockId].result_CPTVserial = result_CPTVserial;
    gStockDailyInfo[stockId].result_StockInfo = result_StockInfo;

    if (ENABLE_A02)
    {
      let result_check = stockAnalyze_02(date_list, data_dict, result_MA);

      if (result_check.keyMoment == true)
      {
        //result_check.stockInfo = stockInfo;
        console.dir(result_check);
        writeCheckResultFile('A02', result_check);
      }
    }

    if (ENABLE_A01)
    {
      let result_check = stockAnalyze_01(stockId, data_dict, true);

      if (result_check.keyMoment == true)
      {
          //result_check.stockInfo = stockInfo;
          console.dir(result_check);
          writeCheckResultFile('A01', result_check);
      }
    }/* if */

    /* A03 */
    if (ENABLE_A03) 
    {
        stockAnalyze_03(gStockDailyInfo[stockId]);        
    }/* if */ 

    if (ENABLE_A04) 
    {
        stockAnalyze_04(gStockDailyInfo[stockId]);        
    }/* if */ 

    if (ENABLE_A05) 
    {
        stockAnalyze_05(gStockDailyInfo[stockId]);        
    }/* if */    
}/* stockDailyChecker() - END */


function _f_initStockIdList()
{
    let result = wait.for(db.twseStockPRE_Find, '2017-04-14');
    let stock_list = JSON.parse(result[0].data);
    let stockid_list = [];
    let stockObjDict = {};
    for(let stock of stock_list)
    {
        stockid_list.push(stock.stockId);
        stockObjDict[stock.stockId] = stock;
    } /* for */

    let retObj = {};
    retObj.stockIdList = stockid_list;
    retObj.stockObjDict = stockObjDict;
    return retObj;

} /* _f_initStockIdList */


function _f_writeAnalyzeResultToDb(analyzeResultDict)
{
    for (let typename in gStockDailyAnalyzeResult)  
    {
        let wrtObj = {};
        let stockId;
        let date;
        if (analyzeResultDict[typename].length == 0)
        {
            continue;
        }else{
            stockId = analyzeResultDict[typename][0].stockId;
            let stockInfo = gStockDailyInfo[stockId];
            date = stockInfo.result_StockInfo.date;   
        }       
        date = utility.twDateToDcDate(date);
        wrtObj.date = date;

        wrtObj.data = JSON.stringify(analyzeResultDict[typename]);
        db.stockDailyAnalyzeResult_IsExist(typename, date, wrtObj, function(err, result){
            if (err != null)
            {
                console.log("ERROR - _f_writeAnalyzeResultToDb()" + err);
            }
        });
    }
}

//******************************************
//  Init()
//******************************************
exports.init = function()
{    
    function exec(callback_fiber)
    {
         gAllStocksObj = _f_initStockIdList();
         let stockid_list = gAllStocksObj.stockIdList;

         //let stockId = '3665';
         for (let i=0 ; i< stockid_list.length ; i++)
         {              
             let stockId = stockid_list[i];
             _f_stockDailyChecker(stockId);
         }
         exports.gStockDailyInfo = gStockDailyInfo;  
         //console.dir(gStockDailyInfo);
         exports.gStockDailyAnalyzeResult = gStockDailyAnalyzeResult;
         
         /* Write result to DB */
         _f_writeAnalyzeResultToDb(gStockDailyAnalyzeResult);

         return callback_fiber(null);
    } /*for */
    
    wait.launchFiber(exec, function(){});
}; 


