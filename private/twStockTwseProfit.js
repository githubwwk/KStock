"use strict"
var request = require('request');
var moment = require('moment');
var wait = require('wait.for');
var iconv = require('iconv-lite');
var utility = require('./utility.js');

//******************************************
// Global Variable
//******************************************
var gtwStockTwseProfitReady = false; 
var gtwStockTwseProfitObjDict = {}; 
//******************************************
// getDatafromWeb()
//******************************************
function getDatafromWeb_TSE(callback)
{
   let URL = ('http://www.twse.com.tw/exchangeReport/BWIBBU_d?response=json&date=@date@&selectType=ALL&_=1501298083035').replace('@date@', '');
   let form_body = {};    
   let options = {
                    url : URL,
                    method: "GET",
                    form : form_body,
                    encoding: null,
                    headers: {'Content-Type' : 'application/x-www-form-urlencoded'}              
                   };    

    request( options, function (error, response, body) {      
    
        if (!error && response.statusCode == 200) {

            let buffer = new Buffer(body);
            let str = iconv.decode(buffer, 'utf8');  

            let stock_pre_obj = JSON.parse(str);
            
            stock_pre_obj

            return callback(null, stock_pre_obj);
        }
    
        console.log("END");
        callback(-1);
    });
}

function getDatafromWeb_OTC(callback)
{
   let URL = ('http://www.tpex.org.tw/web/stock/aftertrading/peratio_analysis/pera_result.php?l=zh-tw&d=&c=&_=1501330104265').replace('@date@', '');
   let form_body = {};    
   let options = {
                    url : URL,
                    method: "GET",
                    form : form_body,
                    encoding: null,
                    headers: {'Content-Type' : 'application/x-www-form-urlencoded'}              
                   };    

    request( options, function (error, response, body) {      
    
        if (!error && response.statusCode == 200) {

            let buffer = new Buffer(body);
            let str = iconv.decode(buffer, 'utf8');  

            let stock_pre_obj = JSON.parse(str);
            
            stock_pre_obj

            return callback(null, stock_pre_obj);
        }
    
        console.log("END");
        callback(-1);
    });
}

function initStockProfitObj_TSE(raw_data)
{
    let twStockTwseProfitObjDict_temp = {};

    if (raw_data.data == undefined){
        throw 'Invalid Raw Data.';
    }

    for (let dataObj of raw_data.data)
    {        
        let stockProfitObj = {};

        /* Price-to-Earning Ratio (PER): 本益比 */
        /* Yield rate: 殖利率 */
        /* Price-Book Ratio: 股價淨值比 */
        stockProfitObj.stockId = dataObj[0].replace(/\s/g,'');
        stockProfitObj.YR = dataObj[2];
        stockProfitObj.PER = dataObj[4];        
        stockProfitObj.PBR = dataObj[5]; 
        twStockTwseProfitObjDict_temp[stockProfitObj.stockId] = stockProfitObj;
    }

    return twStockTwseProfitObjDict_temp;
}

function initStockProfitObj_TSE(raw_data)
{    
    if (raw_data.data == undefined){
        throw 'Invalid Raw Data.';
    }

    for (let dataObj of raw_data.data)
    {        
        let stockProfitObj = {};

        /* Price-to-Earning Ratio (PER): 本益比 */
        /* Yield rate: 殖利率 */
        /* Price-Book Ratio: 股價淨值比 */
        stockProfitObj.stockId = dataObj[0].replace(/\s/g,'');
        stockProfitObj.YR = dataObj[2];
        stockProfitObj.PER = dataObj[4];        
        stockProfitObj.PBR = dataObj[5]; 
       
        gtwStockTwseProfitObjDict[stockProfitObj.stockId] = stockProfitObj;
    }

    return true;
}

function initStockProfitObj_OTC(raw_data)
{    
    if (raw_data.aaData == undefined){
        throw 'Invalid Raw Data.';
    }

    for (let dataObj of raw_data.aaData)
    {        
        let stockProfitObj = {};

        /* Price-to-Earning Ratio (PER): 本益比 */
        /* Yield rate: 殖利率 */
        /* Price-Book Ratio: 股價淨值比 */
        /* stock dividend: 股利 */
        stockProfitObj.stockId = dataObj[0].replace(/\s/g,'');        
        stockProfitObj.PER = dataObj[2];        
        stockProfitObj.DIVD = dataObj[3]; 
        stockProfitObj.PBR = dataObj[5]; 
        stockProfitObj.YR = dataObj[4];
       
        gtwStockTwseProfitObjDict[stockProfitObj.stockId] = stockProfitObj;
    }

    return true;
}

exports.getStockProfit = function(stockId)
{
    if (gtwStockTwseProfitReady == false) {
        return null;
    }

    return gtwStockTwseProfitObjDict[stockId];
}


//******************************************
// main()
//******************************************

exports.init = function()
{   
   /* dateStr empty is to get latest data. */

   /* if date is empty, it will get latest data. */
   //let URL = 'http://www.twse.com.tw/exchangeReport/BWIBBU_d?response=json&date=20170728&selectType=ALL&_=1501298083035';

    function exec(callback)
    {    
  	   try {  
            let raw_tse_data = wait.for(getDatafromWeb_TSE);         		        
            let raw_otc_data = wait.for(getDatafromWeb_OTC);      
            initStockProfitObj_TSE(raw_tse_data);
            initStockProfitObj_OTC(raw_otc_data);

            gtwStockTwseProfitReady = true; 
            console.log("INFO - twStockProfit is Ready.");             
            return callback(null);
       }catch(err){
            gtwStockTwseProfitReady = false;
          	return callback(err);
       }   
    } /* exec */

    wait.launchFiber(exec, function(){});

} /* exports.getTwsePRE() */

//exports.init('');