"use strict";

var wait = require('wait.for');
var moment = require('moment');
var fs = require('fs');
var db = require('./db.js');
var twStockRTP = require('./twStockRealTimePrice.js');
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

   console.log("route.current()+");
   
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
                default:
                    console.log("ERROR - Invalid Type:" + req.query.type);
                    res.send(503);
                break;
        }
       
        let montiorNameList = wait.for(db.stockMonitor_GetMonitorNameList);

        db.stockDailyAnalyzeResult_Find(analyze_category, '', function(err, dataObj){  
            if (err != null)
            {
                console.log("ERROR - db.stockDailyA01_Find()" + err);
                res.send(503);
            }else {     
                //console.dir(dataObj);
                res.render( render_file, {
                    title : 'KStock Server',
                    description : description,
                    monitor_list : montiorNameList,
                    srtpAllObj : twStockRTP.gStockRealTimePrice,
                    result : dataObj 
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
            if (err != null)
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
        res.render( 'stockMonitorList', {
	                 result : dataObj,
                     srtpAllObj : twStockRTP.gStockRealTimePrice,
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
exports.showStockRealTime = function(req, res)
{
   function exec(callback_exec)
   {
        var dbStockdailFind_fn;
        var description = '';

        switch(req.query.type)
        {
                case 'A01':
                    dbStockdailFind_fn = db.stockDailyA01_Find;
                    description = '[漲]:過所有均線，量過5日均量1.5倍 [跌]:破MA5,MA10,MA20均線，量過5日1.5倍(價格>30)';
                break;
                case 'A02':
                    dbStockdailFind_fn = db.stockDailyA02_Find;
                    description = '[漲]:突破MA60 [跌]:跌破MA60(價格>30)';
                break;
                default:
                    console.log("ERROR - Invalid Type:" + req.query.type);
                    res.sendStatus(503);
                break;
        }
       
        let montiorNameList = wait.for(db.stockMonitor_GetMonitorNameList);
        
        description = 'Real Time Stock Status';
        if (twStockRTP.gStockRealTimeTVGSPCheckResult != undefined)
        {
                res.render( 'stockInfoRealTime', {
                    title : 'KStock Server',
                    description : description,                                        
                    result : twStockRTP.gStockRealTimeTVGSPCheckResult 
                });	           
        }else{
            console.log("ERROR - db.showStockRealTime() twStockRTP.gStockRealTimeTVGSPCheckResult is undefined!");
            res.send(503);
        }	
   }/* exec */    

   wait.launchFiber(exec, function(){
       console.log("INFO - showStockAnalysisDateList() Done");
   }); 
};
