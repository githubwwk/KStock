
"use strict"
var request = require('request');
var htmlparser = require('htmlparser2');
var fs = require('fs');
var moment = require('moment');
var wait = require('wait.for');
var cheerio = require('cheerio');
var cheerioTableparser = require('cheerio-tableparser');
var merge = require('merge');
var Semaphore = require("node-semaphore");

var pool = Semaphore(1);

var STOCK_DOWN_MIN_PRICE = 30; /* Skip when staock price less than 30 in drop case */

var ENABLE_A01 = true;
var ENABLE_A02 = true;


//******************************************
// stock_data_reconstruct()
//******************************************
function stock_data_reconstruct(raw_data_list)
{
    let stock_data_dict = {};

    for (let i=2 ; i < raw_data_list[0].length ; i ++)
    {
       let row_data_list = [];
       let stock_data = {};

       for (let j=0; j<raw_data_list.length ; j++)
       {
           //console.log(i + '-' + j + ' '+ raw_data_list[j][i]);
           row_data_list.push(raw_data_list[j][i]);
       }
       //console.dir(row_data_list);

       try {
            stock_data.date = row_data_list[0];
            stock_data.TV = parseInt(row_data_list[1].replace(/,/g, '')); /* Trading Volume 成交張數 */
            stock_data.TO =  parseInt(row_data_list[2].replace(/,/g, '')); /* TurnOver in value 成交量 */
            stock_data.OP = row_data_list[3]; /* Open Price 開盤價 */
            stock_data.DH = row_data_list[4]; /* Day High 最高價 */
            stock_data.DL = row_data_list[5]; /* Day Low 最低價 */
            stock_data.CP = parseFloat(row_data_list[6].replace(/,/g, '')); /* Closing Price 收盤價*/
            stock_data.GS = parseFloat(row_data_list[7].replace(/,/g, '')); /* Gross Spread:漲跌價差 */
            stock_data.GSP =  (stock_data.GS/(stock_data.CP-stock_data.GS)*100).toFixed(1); /* Gross Spread percentage */
            stock_data.NT = row_data_list[8]; /* Number of Transactions 成交筆數 */
       }catch(err){
            console.log("ERROR get raw data fail!" + err)
       } /* try-catch */

       row_data_list = [];
       stock_data_dict[stock_data.date] = stock_data;  /* DATE Key */
       //console.dir(stock_data);
    } /* for i */

    return stock_data_dict;

} /* function - stock_data_reconstruct */

//******************************************
// getStockData()
//******************************************
function getStockData(stockId, year, month)
{
    /* try open on local DB */
    let db_dir = './db/';
    let stock_db_file  = db_dir + stockId + '/' + year + '_' + month + '.db';
    let current_month = moment().month() + 1;

    try{
        let temp_data_dict = readDataDbFile(stock_db_file);
        return temp_data_dict;
    }catch(err){
        console.log("Get Data from Web:" + stockId);
        let temp_data_dict = wait.for(getStockDatafromWeb, stockId, year, month);
        /* Write to local db */
        if ((month != current_month) && (Object.keys(temp_data_dict).length > 0))
        {
            /* Only backup this month before data */
            writeDataDbFile(stockId, year, month, temp_data_dict);
        }
        return temp_data_dict;
    }
}

//******************************************
// getStockDatafromWeb()
//******************************************
function getStockDatafromWeb(stockId, year, month, callback_web)
{
    let body = {'download': '',
                'query_year': '0', /* 2017, set by main */
                'query_month' : '0', /* 2, set by main */
                'CO_ID': '0',  /* 2454, set by main */
                'query-button' : '%E6%9F%A5%E8%A9%A2'};

    let options = {
        url : 'http://www.twse.com.tw/ch/trading/exchange/STOCK_DAY/STOCK_DAYMAIN.php',
        method: "POST",
        form : body,
        headers: {'Content-Type' : 'application/x-www-form-urlencoded'}
    };

   options.form.CO_ID = stockId;
   options.form.query_year = year;
   options.form.query_month = month;

   let stock_data_dict = {};
   request( options, function (error, response, body) {

        if (!error && response.statusCode == 200) {
            //console.log(body)
            let table_html = body.match(/\<table.*\<\/table\>/g);

            try {
                let $ = cheerio.load(table_html[0]);
                cheerioTableparser($);
                let data = $("table").parsetable(false, false, true);
                stock_data_dict = stock_data_reconstruct(data);
            } catch  (err) {
                console.log("ERROR - Get HTML table error!" + err);
            }
        }else{
            console.log("ERROR - getDatafromWeb() response!!!" + response);
            console.dir(options);
            return callback_web('getDatafromWeb - Invalid response, please retrys');
        }


        if (Object.keys(stock_data_dict).length == 0)
        {
            console.log("ERROR - getDatafromWeb() body!!!" + body);
            console.log("ERROR - getDatafromWeb() response!!!" + response);
            console.dir(options);
        }
        return callback_web(null, stock_data_dict);
    });
}

//******************************************
// calMA()
//******************************************
function calMA(stock_id, posi, date_key_list, data_dict)
{

    let result = {};
    let price_MA60 = 0;
    let price_MA20 = 0;
    let price_MA10 = 0;
    let price_MA5 = 0;
    let check_days = 60

    if (date_key_list.length < (check_days-1))
    {
           /* W/o valid data over 60 */
           console.log("ERROR calMA() - StockId:" + stock_id);
           console.log("ERROR calMA() - date_key_list.length:" + date_key_list.length);
           return undefined;
    }

    for(let i=0 ; i<check_days ; i++)
    {
        try {
            let price = data_dict[date_key_list[posi+i]].CP;
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
            console.log("ERROR calMA() - StockObj:" + date_key_list[posi+i]);
            console.log("ERROR calMA() - Dict Length:" + date_key_list.length);
            //return result;
        }/* try-catch */
    } /* for */

    result.MA60 = (price_MA60/60).toFixed(2);
    result.MA20 = (price_MA20/20).toFixed(2);
    result.MA10 = (price_MA10/10).toFixed(2);
    result.MA5 = (price_MA5/5).toFixed(2);
    return result;
} /* calMA */

//******************************************
// stockAnalyze()
//******************************************

var TV_TIMES_CONDITION = 1.5;

/* 帶量超過5日均量1.5倍 */
function stockAnalyze_01(stock_id, data_dict, only_check_today)
{

    var key_list = Object.keys(data_dict);
    key_list.sort();
    key_list.reverse(); /* recently to far date */
    let i=0;
    let keyMoment = false;
    let keyDate = '';

    for (let key of key_list)
    {        
        try {             
             let TV_times_result = check_TV_times(i, data_dict, key_list);
             if (parseFloat(TV_times_result.TV_times) > TV_TIMES_CONDITION)
             {
                 let result_MA = calMA(stock_id, i, key_list, data_dict);
                 if (result_MA == undefined){
                     console.log("ERROR - ");
                     return null;
                 }
                 
                 /* UP */
                 if ((data_dict[key_list[i]].CP > result_MA.MA5) &&
                    (result_MA.MA5 > result_MA.MA10 ) &&
                    (result_MA.MA10 > result_MA.MA20 ))
                 {
                     console.log(key);
                     console.log(data_dict[key].CP);
                     console.log(data_dict[key].GS);
                     console.log(data_dict[key].GSP + '%');                     
                     console.log(result_MA);
                     data_dict[key].TV_times = TV_times_result;
                     data_dict[key].MA = result_MA;
                     keyMoment = true;
                     keyDate = key;
                 }
                 else if((data_dict[key_list[i]].CP < result_MA.MA5) &&
                         (result_MA.MA5 < result_MA.MA10 ) &&
                         (result_MA.MA10 < result_MA.MA20 ) && 
                         data_dict[key_list[i]].CP > STOCK_DOWN_MIN_PRICE) /* DOWN, price over 30 */
                 {
                     console.log(key);
                     console.log(data_dict[key].CP);
                     console.log(data_dict[key].GS);
                     console.log(data_dict[key].GSP + '%');                     
                     console.log(result_MA);
                     data_dict[key].TV_times = TV_times_result;
                     data_dict[key].MA = result_MA;
                     keyMoment = true;
                     keyDate = key;                 
                 }

             }/* if */
        } catch(err) {
            console.log("ERROR - " + err);
        }            

        if (only_check_today == true)
        {
            break;
        }

        i++;
        if (i > 60)
        {
            /* Just analyze one quarter (60 Days) */
            break;
        }/* if */
    }/* for */

    let result = {};
    result.stockDailyInfo = data_dict[keyDate];
    result.keyMoment = keyMoment;    
    
    return result;
}

function check_TV_times(i, data_dict, key_list)
{
    try {
         var TVMA_05 = Math.round((data_dict[key_list[i+1]].TV +
                                   data_dict[key_list[i+2]].TV +
                                   data_dict[key_list[i+3]].TV +
                                   data_dict[key_list[i+4]].TV +
                                   data_dict[key_list[i+5]].TV)/5);

         var TV_times = (data_dict[key_list[i]].TV / TVMA_05).toFixed(1);
         var result = {};
         result.TV_times = TV_times;
         result.TVMA_05 = TVMA_05;
         result.TV = data_dict[key_list[i]].TV;
         return result;
    } catch(err){
          return {};
    }
    return {};

}

/* 現貨價穿過MA60 */
function stockAnalyze_02(stock_id, data_dict, only_check_today)
{

    let key_list = Object.keys(data_dict);
    if(key_list.indexOf("查無資料！") > -1)
    {
       key_list.splice( key_list.indexOf("查無資料！"), 1 );
    }
    key_list.sort();
    key_list.reverse(); /* recently to far date */
    let i=0;
    let stage = 0;  /* 0=init value -1=smaller 1=bigger */
    let keyMoment = false;
    let keyDate = '';

    for (let key of key_list)
    {
        console.log("DEBUG - stockAnalyze_02() id:" + stock_id);
        let result_MA = calMA(stock_id, i, key_list, data_dict);
        if (result_MA == undefined){
            /* Invalid data, don't need to analyze */
            console.log("ERROR - result is undefined! stockId:" + stock_id);
            console.log("ERROR - key_list len:" + key_list.length);
            console.dir(result_MA);
            console.dir(data_dict);
            console.dir(key_list);
            keyMoment = false;
            break;
        }

        data_dict[key].MA = result_MA;
        var temp_CP = data_dict[key].CP;
        var temp_GS =  data_dict[key].GS;
        if ((temp_CP > result_MA.MA60) && ((temp_CP - temp_GS) < result_MA.MA60)) {
             console.log("[Key Date][N->P]:" + key);
             console.log("[CP]" + data_dict[key].CP);
             console.log("[GS]" + data_dict[key].GS);
             console.log("[GSP]" + data_dict[key].GSP + '%');
             console.log(result_MA);
             data_dict[key].TV_times = check_TV_times(i, data_dict, key_list);
             //console.log("[TO Times]:" + result_times.TO_times);
             keyMoment = true;
             data_dict[key].type = 'N->P';
             keyDate = key;
        }
        else if((temp_CP < result_MA.MA60) && ((temp_CP - temp_GS) > result_MA.MA60) && (temp_CP > STOCK_DOWN_MIN_PRICE))  { /* DOWN, price over 30 */
             console.log("[Key Date][P->N]:" + key);
             console.log("[CP]" + data_dict[key].CP);
             console.log("[GS]" + data_dict[key].GS);
             console.log("[GSP]" + data_dict[key].GSP + '%');
             console.log(result_MA);
             data_dict[key].TV_times = check_TV_times(i, data_dict, key_list);
             //console.log("[TO Times]:" + result_times.TO_times);
             keyMoment = true;
             data_dict[key].type = 'P->N';
             keyDate = key;
        }/* if-else */

        if (only_check_today == true)
        {
            data_dict[key].MA = result_MA;
            break;
        }

        i++;
        if (i > 60)
        {
            /* Just analyze  one quarter (60 Days) MA60 */
            break;
        }/* if */
    } /* for */

    let result = {};
    result.stockDailyInfo = data_dict[keyDate];
    result.keyMoment = keyMoment;

    return result;
}

//******************************************
// readDataDbFile()
//******************************************
function readDataDbFile(file_name)
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
function writeDataDbFile(stockId, year, month, dataObj)
{
  let db_dir = './db/';
    if (!fs.existsSync(db_dir)) {
      fs.mkdirSync(db_dir);
    }

    let stock_db_dir = db_dir + stockId + '/';
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
// stockDailyChecker()
//******************************************
function stockDailyChecker(stockInfo)
{
    let MONTH = moment().month() + 1;
    let YEAR = moment().year();
    let stockId = stockInfo.stockId;


    let data_dict = {};
    /* Get 6 month */
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
            temp_data_dict = getStockData(stockId, query_year, query_month);
            data_dict = merge(data_dict, temp_data_dict); /* Merge Data Dict */
        } catch(err){
            console.log(err);
        } /* try-catch */        
    }

    if (ENABLE_A02)
    {
      let result_check = stockAnalyze_02(stockId, data_dict, true);

      if (result_check.keyMoment == true)
      {
        result_check.stockInfo = stockInfo;
        console.dir(result_check);
        writeCheckResultFile('A02', result_check);
      }
    }

    if (ENABLE_A01)
    {
      let result_check = stockAnalyze_01(stockId, data_dict, true);

      if (result_check.keyMoment == true)
      {
          result_check.stockInfo = stockInfo;
          console.dir(result_check);
          writeCheckResultFile('A01', result_check);
      }
    }
}/* stockDailyChecker() - END */

//******************************************
// main()
//******************************************

function main()
{

    var stocks = readDataDbFile('./cfg/TwStockList_20170328.db');
    //var stocks = readDataDbFile('./cfg/TwStockList_test.db');

    //function exec(stockInfo, callback_fiber)
    function exec(callback_fiber)
    {

         //let stockId = '3665';

         for (let i=0 ; i< stocks['stock_list'].length ; i++)
         {
              let stockInfo = stocks['stock_list'][i];
              console.log("[StockId]:" + stockInfo.stockId);
              let stockId = stocks['stock_list'][i].stockId;
             stockDailyChecker(stockInfo);
         }

         return callback_fiber(null);
    }

    //for (let i=0 ; i< stocks['stock_list'].length ; i++)
    //{
    //    let stockInfo = stocks['stock_list'][i];
    //    let stockId = stocks['stock_list'][i].stockId;
        //wait.launchFiber(exec, stockInfo, function(){});
        wait.launchFiber(exec, function(){});

   // }
}

main();
