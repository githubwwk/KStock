"use strict";

var wait = require('wait.for');
var moment = require('moment');
var fs = require('fs');
var db = require('./db.js');
var utility = require('./utility.js');
var twStockRTP = require('./twStockRealTimePrice.js');
var twStockDailyInfo = require('./twStockDailyInfoCrawler.js');
var twStockDispersion = require('./twStockDispersion.js');
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
   res.sendfile('./public/index.html');	
	                   
};

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
                    render_file = 'stockInfoCrawerDaily';
                    description = '[漲]:過所有均線，量過5日均量1.5倍 [跌]:破MA5,MA10,MA20均線，量過5日1.5倍(價格>30)';
                break;
                case 'A02':                    
                    analyze_category = 'stockDaily_A02';
                    render_file = 'stockInfoCrawerDaily';
                    description = '[漲]:突破MA60 [跌]:跌破MA60(價格>30)';
                break;
                case 'A03':                    
                    analyze_category = 'stockDaily_A03';
                    render_file = 'stockInfoAnalyzeResult';
                    description = '均線糾結 MA60/MA20/MA10/MA5 Bias<1%';
                break;   
                case 'A04':                    
                    analyze_category = 'stockDaily_A04';
                    render_file = 'stockInfoAnalyzeResult';
                    description = '2日內MA5穿過MA20';
                break;                      
                case 'A05':                    
                    analyze_category = 'stockDaily_A05';
                    render_file = 'stockInfoAnalyzeResult';
                    description = 'Test';
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
                for(let stockDailyResultObj of analysisResultDataObj)
                {
                    for(let stockObj of JSON.parse(stockDailyResultObj.data))
                    {
                        let stockId;
                        if (stockObj.stockId !== undefined) {                            
                            /* v2.0 format */
                            stockId = stockObj.stockId;                            
                        }else{
                            /* v1.0 format */
                            stockId = stockObj.stockInfo.stockId;                                
                        }/* if-else */   

                        /* Generate Today GS an GSP */
                        try {
                            srtpAllObj[stockId] = twStockRTP.gStockRealTimePrice[stockId];
                            let stockDailyInfo = twStockDailyInfo.gStockDailyInfo[stockId];                            
                            let currentGP = srtpAllObj[stockId].currentPrice - stockDailyInfo.result_StockInfo.CP;
                            
                            let stockinfo_date = utility.twDateToDcDate_ex(stockDailyInfo.result_StockInfo.date, '/', '-');
                            let srtp_date = moment(srtpAllObj[stockId].datetime).format("YYYY-MM-DD");
                            if (moment(stockinfo_date).isSame(srtp_date)){
                                srtpAllObj[stockId].GS = stockDailyInfo.result_StockInfo.GS;    
                                srtpAllObj[stockId].GSP = stockDailyInfo.result_StockInfo.GSP;
                            }else {
                                srtpAllObj[stockId].GS = currentGP.toFixed(2);
                                srtpAllObj[stockId].GSP = ((currentGP/stockDailyInfo.result_StockInfo.CP)*100).toFixed(1);
                            }
                        } catch(err){
                                console.log("WARNING - gStockRealTimePrice uninit!" + err); 
                        } /* try-catch */ 
                    } /* for */
                } /* for */    

                //console.dir(dataObj);
                res.render( render_file, {
                    title : 'KStock Server',
                    description : description,
                    monitor_list : montiorNameList,
                    srtpAllObj : srtpAllObj,
                    analysisResultDataObj : analysisResultDataObj 
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
   
   db.stockMonitor_FindAll(function(err, dataObj){  

        /* get all stockId of dataObj */        
        let srtpAllObj = {};
        for(let monitorObj of dataObj)
        {
            for(let monitor of monitorObj.monitorList)
            {                                
                let temp = JSON.parse(monitor);                
                try {
                    let stockId = temp.stockId;
                    srtpAllObj[stockId] = twStockRTP.gStockRealTimePrice[stockId];
                    let stockDailyInfo = twStockDailyInfo.gStockDailyInfo[stockId];                            
                    let currentGP = srtpAllObj[stockId].currentPrice - stockDailyInfo.result_StockInfo.CP;
                            
                    let stockinfo_date = utility.twDateToDcDate_ex(stockDailyInfo.result_StockInfo.date, '/', '-');
                    let srtp_date = moment(srtpAllObj[stockId].datetime).format("YYYY-MM-DD");
                    if (moment(stockinfo_date).isSame(srtp_date)){
                        srtpAllObj[stockId].GS = stockDailyInfo.result_StockInfo.GS;    
                        srtpAllObj[stockId].GSP = stockDailyInfo.result_StockInfo.GSP;
                    }else {
                        srtpAllObj[stockId].GS = currentGP.toFixed(2);
                        srtpAllObj[stockId].GSP = ((currentGP/stockDailyInfo.result_StockInfo.CP)*100).toFixed(1);
                    }
                } catch(err){
                    console.log("WARNING - gStockRealTimePrice uninit!" + err); 
                } /* try-catch */                 
            } /* for */
        }/* for */                         

        res.render( 'stockMonitorList', {
	                 result : dataObj,
                     srtpAllObj : srtpAllObj,
                     title : 'KStock Server'
                    });	                 
   });
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
        let montiorNameList = wait.for(db.stockMonitor_GetMonitorNameList);
        let srtpAllObj = {};

        if (twStockRTP.gStockRealTimeAnalyzeResult != undefined)
        {
                res.render( 'stockRealtimeAnalyzeResult', {
                    title : 'KStock Server',
                    description : description,                                        
                    RTAnalyzeResult : twStockRTP.gStockRealTimeAnalyzeResult,
                    monitor_list : montiorNameList,                    
                });	           
        }else{
            console.log("ERROR - db.showStockRealTime() twStockRTP.gStockRealTimeAnalyzeResult is undefined!");
            res.send(503);
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
    
}