"use strict"
var moment = require('moment');
var wait = require('wait.for');
var cheerio = require('cheerio');
var utility = require('./utility.js');
var iconv = require('iconv-lite');
const querystring = require('querystring'); 
var request = require('request');  
var fs = require("fs-extra");

function _f_stock_data_reconstruct(raw_data_list)
{
    let stock_data_dict = {};

    if(raw_data_list == undefined){
        return null;
    }

    for (let i=0 ; i < raw_data_list.length ; i ++)
    {
       let stock_data = {};

       try {
            stock_data.date = raw_data_list[i][0];
            stock_data.TV = parseInt(raw_data_list[i][1].replace(/,/g, '')); /* Trading Volume 成交張數 */            
            stock_data.OP = raw_data_list[i][3]; /* Open Price 開盤價 */
            stock_data.DH = raw_data_list[i][4]; /* Day High 最高價 */
            stock_data.DL = raw_data_list[i][5]; /* Day Low 最低價 */
            stock_data.CP = parseFloat(raw_data_list[i][6].replace(/,/g, '')); /* Closing Price 收盤價*/
            stock_data.GS = parseFloat(raw_data_list[i][7].replace(/,/g, '')); /* Gross Spread:漲跌價差 */
            stock_data.GSP =  (stock_data.GS/(stock_data.CP-stock_data.GS)*100).toFixed(1); /* Gross Spread percentage */            
       }catch(err){
            console.log("ERROR get raw data fail!" + err)
       } /* try-catch */

       stock_data_dict[stock_data.date] = stock_data;  /* DATE Key */
       //console.dir(stock_data);
    } /* for i */

    return stock_data_dict;

} /* function - _f_stock_data_reconstruct */

exports.getOtcStockInfoFromWeb = _f_getOtcStockInfoFromWeb;
function _f_getOtcStockInfoFromWeb(stockId, year, month, callback)
{
    // http://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43_result.php?l=zh-tw&d=106/06&stkno=6220&_=1497176776220
    let dateStr = moment([parseInt(year), parseInt(month)-1, 1]).format("YYYY/MM/DD");
    dateStr = utility.dcDateToTwDate_ex(dateStr, '/' , '/');
    //let dateStr = year + '/' + month;
    let URL = 'http://www.tpex.org.tw/web/stock/aftertrading/daily_trading_info/st43_result.php?l=zh-tw&d=' + dateStr + '&stkno=' + stockId +'&_=1497176776220';
    
    let stock_data_dict = {};
    request(URL, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    let tempObj = JSON.parse(body);         

                    stock_data_dict = _f_stock_data_reconstruct(tempObj.aaData);

                    return callback(null, stock_data_dict);
                }else{
                    try {
                        console.log("ERROR - _f_getDatafromWeb() statusCode:" + response.statusCode);
                        return callback(response.statusCode, error);
                    }catch(err){
                        return callback(-1, error);
                    }
                }
    });          
}

function _f_getOtcStockIdfromWeb(date, callback)
{
    let result;
        
    // example: "http://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php?l=zh-tw&d=106/06/09&sect=EW&_=1497146624268"
    let URL = 'http://www.tpex.org.tw/web/stock/aftertrading/otc_quotes_no1430/stk_wn1430_result.php?l=zh-tw&d=' + date + '&sect=EW&_=1497146624268';

    var options = {
       url:  URL,
       timeout: 5000
    }

    request.setTimeout(5000, function(){
        console.log("TIMEOUT!!");
    });
    let otcStockIdList = [];
    request(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    let tempObj = JSON.parse(body);         
                    for (let i=0 ; i<tempObj.aaData.length ; i++)
                    {
                        let stockId = tempObj.aaData[i][0];
                        let stockName = tempObj.aaData[i][1].replace(/\s/g, "") ; 
                        //console.log("ID:" + tempObj.aaData[i][0]);
                        //console.log("Name:" + tempObj.aaData[i][1]);
                        let otcStockInfoObj = {};
                        otcStockInfoObj.stockId = stockId;
                        otcStockInfoObj.stockName = stockName;      
                        otcStockIdList.push(otcStockInfoObj);                  
                    }           
                    return callback(null, otcStockIdList);
                }else{
                    try {
                        console.log("ERROR - _f_getDatafromWeb() statusCode:" + response.statusCode);
                        return a(response.statusCode, error);
                    }catch(err){
                        return a(-1, error);
                    }
                }
    });        
}

exports.getOtcStockList = function()
{        
    let db_dir = './db/otc_stock_info';    

    /* if db folder is not exist, create new folder. */
    if (!fs.existsSync(db_dir)) {
       if (fs.existsSync('../db/otc_stock_info')) {
          /* For twStockRealtimePrice.js UT */
          db_dir = '../db/otc_stock_info';
      }else{ 
          fs.mkdirSync(db_dir);
      }
    }
    let otcStockIdDbFile = 'otcStockId.db';
    let otcStockIdDbFile_path = db_dir + '/' + otcStockIdDbFile;
    let otcStockIdObj;
    try {
        otcStockIdObj = utility.readDataDbFile(otcStockIdDbFile_path)
    }catch(err){
        let date = '106/06/09';
        otcStockIdObj = wait.for(_f_getOtcStockIdfromWeb, date);
        utility.writeDbFile(otcStockIdDbFile, 'otc_stock_info',  otcStockIdObj);
    }
    return otcStockIdObj;
}
