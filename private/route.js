"use strict";

var wait = require('wait.for');
var moment = require('moment');
var fs = require('fs');
var db = require('./db.js');
var utility = require('./utility.js');
var twStockRTP = require('./twStockRealTimePrice.js');
var twStockDailyInfo = require('./twStockDailyInfoCrawler.js');
var twStockDispersion = require('./twStockDispersion.js');
var twStockTradingRecord = require('./twStockTrdingRecord.js');
var wait = require('wait.for');
//=====================================
// API
//=====================================

console.logCopy = console.log.bind(console);

console.log = function(data)
{
    var currentDate = '[' + moment().format('HH:mm:ss') + '] ';
    this.logCopy(currentDate, data);
};

//=====================================
// Export API
//=====================================
exports.default = function(req, res){

   //console.log("route.current()+");
   
   var dateStr = '';

   if (req.query.date == '' || req.query.date == undefined){
       dateStr = '2017-04-05';
   }else{
       dateStr = req.query.date;
   }

   var result = {};        
   res.sendFile('./public/index.html' , { root : __dirname + '\\..'});
	                   
};

//**********************************************************
//  Gen GS/GSP/CP rtp stock object for user UI.
//**********************************************************
function _f_genStockRTPAllObj(stockId)
{
    let srtpObj;
    /* Generate Today GS an GSP */                        
    try {
         srtpObj = twStockRTP.getStockRealTimePrice(stockId);
         let stockDailyInfo = twStockDailyInfo.getStockPriceArray(stockId);                            
         let currentGS;
         let currentGSP;
         let currentCP;

         let stockinfo_date = utility.twDateToDcDate_ex(stockDailyInfo.result_StockInfo.date, '/', '-');
         let srtp_date = moment(srtpObj.datetime).format("YYYY-MM-DD");
         if (moment(stockinfo_date).isSame(srtp_date))
         {     
             currentGS = stockDailyInfo.result_StockInfo.GS;
             currentGSP = stockDailyInfo.result_StockInfo.GSP;
             currentCP = stockDailyInfo.result_StockInfo.CP;

             if (srtpObj.GS == null) {
                 srtpObj.GS = currentGS;
             }
             if (srtpObj.GSP == null) { 
                 srtpObj.GSP = currentGSP;
             }
             srtpObj.currentPrice = currentCP;
         }else{
             if (srtpObj.gGS != undefined){
                currentGS = srtpObj.gGS;    
             }else{
                currentGS = srtpObj.currentPrice - stockDailyInfo.result_StockInfo.CP;
             }

             if (srtpObj.gGSP != undefined)
             {
                currentGSP = srtpObj.gGSP;
             }else {
                currentGSP = ((currentGS/stockDailyInfo.result_StockInfo.CP)*100).toFixed(1);
             }
                                
             srtpObj.GS = currentGS;
             srtpObj.GSP = currentGSP;
         } /* if-else */

         if ((srtpObj.GS == null) ||
             (srtpObj.GSP == null) ||
             (srtpObj.currentPrice == null))
         {
             console.log("ERROR - Invalid GS/GSP/CP value");
             console.dir(srtpObj);                              
             srtpObj.GS = 'NA';
             srtpObj.GSP = 'NA';
         } /* if */
    } catch(err){
         console.log("WARNING - gStockRealTimePrice uninit!" + err); 
         let stockDailyInfo = twStockDailyInfo.getStockPriceArray(stockId);    
         srtpObj = {};                       
         if (stockDailyInfo != undefined){      
             if (stockDailyInfo.result_StockInfo == undefined){
                 console.log("ERROR - _f_genStockRTPAllObj() stockDailyInfo.result_StockInfo is undefined. " + stockId);
                 srtpObj.currentPrice = 'ERR';
                 srtpObj.GS = 'ERR';
                 srtpObj.GSP = 'ERR';                 
             }else {
                srtpObj.currentPrice = stockDailyInfo.result_StockInfo.CP;
                srtpObj.GS = stockDailyInfo.result_StockInfo.GS;    
                srtpObj.GSP = stockDailyInfo.result_StockInfo.GSP;                                    
             }
         }else{
            srtpObj.currentPrice = 'ERR';
            srtpObj.GS = 'ERR';
            srtpObj.GSP = 'ERR';
         }
    } /* try-catch */ 
    return srtpObj;
}

//**********************************************************
//  For Analysis
//**********************************************************
exports.showStockAnalysisDateList = function(req, res)
{
   function exec(callback_exec)
   {
        var dbStockdailFind_fn;
        var description = '';
        let analyze_category = '';
        let render_file = '';
        switch(req.query.type)
        {
                case 'A01':                    
                    analyze_category = 'stockDaily_A01';
                    render_file = 'stockInfoAnalyzeResult';
                    description = '[漲]:過所有均線，量過5日均量1.5倍 ';
                break;
                case 'A02':                    
                    analyze_category = 'stockDaily_A02';
                    render_file = 'stockInfoAnalyzeResult';
                    description = '[漲]:突破MA60 [跌]:跌破MA60(價格>30)';
                break;
                case 'A03':                    
                    analyze_category = 'stockDaily_A03';
                    render_file = 'stockInfoAnalyzeResult';
                    description = '[跌]:破MA5,MA10,MA20均線，量過5日1.5倍(價格>30)';
                break;   
                case 'A04':                    
                    analyze_category = 'stockDaily_A04';
                    render_file = 'stockInfoAnalyzeResult';
                    description = '2日內MA5穿過MA20';
                break;                      
                case 'A05':                    
                    analyze_category = 'stockDaily_A05';
                    render_file = 'stockInfoAnalyzeResult';
                    description = '均線糾結(帶量突跌破)';
                break;   
                case 'A06':                    
                    analyze_category = 'stockDaily_A06';
                    render_file = 'stockInfoAnalyzeResult';
                    description = '今天為60日內最低成交量';
                break;   
                case 'A07':                    
                    analyze_category = 'stockDaily_A07';
                    render_file = 'stockInfoAnalyzeResult';
                    description = '今天為60日內最高成交量';
                break;            
                case 'A08':                    
                    analyze_category = 'stockDaily_A08';
                    render_file = 'stockInfoAnalyzeResult';
                    description = '60日突破新高、跌破新低';
                break;        
                case 'A09':                    
                    analyze_category = 'stockDaily_A09';
                    render_file = 'stockInfoAnalyzeResult';
                    description = '穿過MA60&MA100';
                break;                                                                                           
                default:
                    console.log("ERROR - Invalid Type:" + req.query.type);
                    res.send(503);
                    return;                
        }
       
        let montiorNameList = wait.for(db.stockMonitor_GetMonitorNameList);

        db.stockDailyAnalyzeResult_Find(analyze_category, '', function(err, analysisResultDataObj){  

            if (err != null)
            {
                console.log("ERROR - db.stockDailyAXX_Find()" + err);
                res.status(503).send("ERROR - db.stockDailyAXX_Find()" + err);
            }else {     
                /* get all stockId of dataObj */        
                let srtpAllObj = {};

                /* Extract realtime stock price for this category */    
                let analysisResultDataObj_to_user = [];  
                for(let i=0 ; i<analysisResultDataObj.length ; i++)
                {
                    /* Only procide 10 days data to user. */
                    if((analysisResultDataObj.length - i) < 10){
                       analysisResultDataObj_to_user.push(analysisResultDataObj[i]);     
                    }
                }

                for(let stockDailyResultObj of analysisResultDataObj_to_user)
                {
                    for(let stockObj of JSON.parse(stockDailyResultObj.data))
                    {
                        let stockId;

                        if (stockObj.stockId !== undefined) {                                                        
                            stockId = stockObj.stockId;                            
                        }  

                        /* Generate GS, GSP and CP */
                        srtpAllObj[stockId] = _f_genStockRTPAllObj(stockId);
                    
                    } /* for */
                } /* for */    
                
                res.render( render_file, {
                    title : 'KStock Server',
                    analyze_category : analyze_category,
                    description : description,
                    monitor_list : montiorNameList,
                    srtpAllObj : srtpAllObj,
                    analysisResultDataObj : analysisResultDataObj_to_user 
                });	
            } /* if-else */
        });	
   }/* exec */    

   wait.launchFiber(exec, function(){
       console.log("INFO - showStockAnalysisDateList() Done");
   }); 
};


//**********************************************************
//  For Monitor List
//**********************************************************

exports.addStockMonitor = function(req, res) {
    //console.dir(req.body);   
    function exec(callback_exec)
    { 
        var stockMonitorObj = {};   

        stockMonitorObj.name = req.body.monitor_name;    
        stockMonitorObj.monitorList = [];
        //console.log(typeof(req.body.stockInfo));

        var stocksInfoObj = JSON.stringify(req.body.stockInfo);
        //console.log(stocksInfoObj);
        stockMonitorObj.monitorList.push(stocksInfoObj);

        db.stockMonitor_Update(stockMonitorObj, function(err, result){
            if (err == null)
            {            
                db.stockMonitor_GetMonitorNameList(function(err, result){
                    let montiorNameList = result;
                    res.end(JSON.stringify(montiorNameList));    
                    callback_exec(null);
                });
            } 
            else
            {
                console.log("ERROR - stockMonitor_Update()" + err);
                res.status(500).json({ error: err })
            }                    
        });          
    } /* exec */
   wait.launchFiber(exec, function(err, result){
       console.log("INFO - addStockMonitor() Done");
   });     
};

exports.showStockMonitor = function(req, res)
{ 
   var result = {};
   
   console.log("req.query.current Done");
   
   function exec(callback)
   {
       let monitor_list_all; 
       try {
           monitor_list_all = wait.for(db.stockMonitor_FindAll);  
       }catch(err){
           console.log("ERROR - db.stockMonitor_FindAll() Fail!" + err); 
           return callback(err);
       }

       /* get all stockId of dataObj */        
       let srtpAllObj = {};
       for(let monitorObj of monitor_list_all)
       {
          for(let monitor of monitorObj.monitorList)
          {                                
               let temp = JSON.parse(monitor);                
               let stockId = temp.stockId;
               /* Generate GS, GSP and CP */
               srtpAllObj[stockId] = _f_genStockRTPAllObj(stockId);;
          } /* for */
       }/* for */                         

       res.render( 'stockMonitorList', {
                   monitor_list_all : monitor_list_all,
                   srtpAllObj : srtpAllObj,
                   title : 'KStock Server'
                  });	                 
       return callback(null);        
   } /* function - exec */
   wait.launchFiber(exec, function(err, result){}); 
};

exports.removeStockMonitor = function(req, res)
{
  var monitor_list_name = '';
  var reqObj = req.body;
  console.dir(reqObj);
  if (reqObj.name == '' || reqObj.name == undefined){
       monitor_list_name = 'Konrad Test';
   }else{
       monitor_list_name = reqObj.name;
   }

    db.stockMonitor_Remove(monitor_list_name, reqObj.stockId, function(err, result){              
        db.stockMonitor_FindAll(function(err, dataObj){  
             res.end(JSON.stringify(dataObj));                  
        });          
    });
};

//**********************************************************
//  For Foreign 8 Index
//**********************************************************

exports.showFG8IndexCheck = function(req, res)
{
    res.render( 'FG8IndexCheck', {});	
}

//**********************************************************
//  For RealTime Price 
//**********************************************************
exports.showStockRealTimeAnalysisResult = function(req, res)
{
   function exec(callback_exec)
   {        
        let description = 'Real Time Analysis Result';               
        let monitor_name_list = wait.for(db.stockMonitor_GetMonitorNameList);
        let srtpAllObj = {};
        let RTAnalyzeResult = {};

        if (twStockRTP.gStockRealTimeAnalyzeResult != undefined)
        {
            srtpAllObj = twStockRTP.gStockRealTimeAnalyzeResult.srtpAllObj;    
            RTAnalyzeResult = twStockRTP.gStockRealTimeAnalyzeResult.analyzeResult;           
            
            res.render( 'stockRealtimeAnalyzeResult', {
                        title : 'KStock Server',
                        description : description,         
                        srtpAllObj : srtpAllObj,                               
                        RTAnalyzeResult : RTAnalyzeResult,
                        monitor_name_list : monitor_name_list,                    
                      });	           
        }else{
            let err = "ERROR - db.showStockRealTime() twStockRTP.gStockRealTimeAnalyzeResult is undefined!";
            console.log(err);
            res.status(503).send(err);
        }	
   }/* exec */    

   wait.launchFiber(exec, function(){
       console.log("INFO - showStockAnalysisDateList() Done");
   }); 
};

//**********************************************************
//  For Stock Dispersion
//**********************************************************
exports.showStockDispersion = function(req, res)
{
    console.log("showStockDispersion()+++");
    let stockId = req.stockId;

    if (stockId == '' || stockId == undefined)
    {
       //stockId = '2454';
       let result = {};
       res.render( 'stockDispersion', {
                stock_dispersion: result
       });	    
       return;
    }            
};

exports.lookupStockDispersion = function(req, res)
{
    let stockId = req.query.stockId;
    twStockDispersion.getStockDispersion(stockId, function(err, result) {
            let stock_dispersion = result;
            res.end(JSON.stringify(stock_dispersion)); 
    });   
};

//**********************************************************
//  For Transaction Record 
//**********************************************************
exports.showAllTransactionRecord = function(req, res)
{
    let result;
    function exec(callback_exec)
    {
        let dataObj = req.body.transaction;

        try {         
            let result = wait.for(db.stockTransaction_FindAll);
            res.render( 'stockAllTradingRecord', {
                        title : 'Stock Transaction',
                        transaction_list : result,                                 
                       });	             
        } catch(err) {
           res.status(503).send(err);        
        }                   
    }
    wait.launchFiber(exec, function(){});
};

exports.showTransaction = function(req, res)
{

};

exports.editTransaction = function(req, res)
{
    let reasonObj = twStockTradingRecord.getReasonOfTradingList();
    try {                 
         res.render( 'stockNewTradingRecord', {
                     title : 'Stock Transaction',
                     reasonObj : reasonObj,                                 
                   });	             
    } catch(err) {
         res.status(503).send(err);        
    }          
};

exports.updateTransaction = function(req, res)
{

};

//**********************************************************
//  For Stock Price 
//**********************************************************
exports.getStockPrice = function(req, res)
{
    let stockId = req.query.stockId;
    let stockDailyInfoObj = twStockDailyInfo.getStockPriceArray(stockId);
    let stockRtpObj = twStockRTP.getStockRealTimePrice(stockId);
    let result = {};
    result.MA1_list = stockDailyInfoObj.result_MA.MA1_list;
    result.MA60_list = stockDailyInfoObj.result_MA.MA60_list;
    result.stockRtpObj = stockRtpObj
    res.end(JSON.stringify(result));     
};