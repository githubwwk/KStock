"use strict";

var moment = require('moment'),
        fs = require('fs'),   
        db = require('./db.js');

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
       console.log("req.query.current Done");
       db.stockDailyA02_Find(dateStr, function(err, dataObj){        
            res.render( 'stockInfoCrawerDaily', {
	            result : dataObj 
            });	
       });	                   
};

exports.showStockAnalysisDateList = function(req, res){
   
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
            res.send(503);
        break;
   }
  
   dbStockdailFind_fn('', function(err, dataObj){  
       if (err != null)
       {
           console.log("ERROR - db.stockDailyA01_Find()" + err);
           res.send(503);
       }else {     
           res.render( 'stockInfoCrawerDaily', {
               title : 'KStock Server',
               description : description,
               result : dataObj 
           });	
      } /* if-else */
   });	
};



exports.stockA01 = function(req, res){

   console.log("route.current()+");
   
   var dateStr = '';

   if (req.query.date == '' || req.query.date == undefined){
       dateStr = '2017-04-05';
   }else{
       dateStr = req.query.date;
   }

   var result = {};
   console.log("req.query.current Done");
   db.stockDailyA01_Find(dateStr, function(err, dataObj){  
       if (err != null)
       {
           console.log("ERROR - db.stockDailyA01_Find()" + err);
           res.send(503);
       }else {     
           res.render( 'stockInfoCrawerDaily', {
               title : 'KStock Server',
               description : '[漲]:過所有均線，量過5日均量1.5倍 [跌]:破所有均線，量過5日1.5倍(價格>30)',
               result : dataObj 
           });	
      } /* if-else */
   });	                   
};

exports.stockA02 = function(req, res){

   console.log("route.current()+");
   
   var dateStr = '';

   if (req.query.date == '' || req.query.date == undefined){
       dateStr = '2017-04-05';
   }else{
       dateStr = req.query.date;
   }

   var result = {};
   console.log("req.query.current Done");
   db.stockDailyA02_Find(dateStr, function(err, dataObj){        
       if (err != null)
       {
           console.log("ERROR - db.stockDailyA02_Find()" + err);
           res.send(503);
       }else {
           res.render( 'stockInfoCrawerDaily', {
               title : 'KStock Server',
               description : '[漲]:突破MA60 [跌]:跌破MA60(價格>30)',
               result : dataObj 
            });	
        } /* if-else */
   });	                   
};

exports.addStockMonitor = function(req, res) {
    console.dir(req.body);

    var stockMonitorObj = {};   

    stockMonitorObj.name = 'Konrad Test';    
    stockMonitorObj.monitorList = [];
    console.log(typeof(req.body));

    var stocksInfoObj = JSON.stringify(req.body);
    console.log(stocksInfoObj);
    stockMonitorObj.monitorList.push(stocksInfoObj);


    db.stockMonitorUpdate(stockMonitorObj, function(err, result){
        console.log(err);
        res.end(JSON.stringify('{msg: "Success"}'));    
    });          
};

exports.showStockMonitor = function(req, res)
{
  var monitor_list_name = '';

  if (req.query.name == '' || req.query.name == undefined){
       monitor_list_name = 'Konrad Test';
   }else{
       monitor_list_name = req.query.name;
   }

   var result = {};
   console.log("req.query.current Done");
   db.stockMonitorListFind(monitor_list_name, function(err, dataObj){                
        res.render( 'stockMonitorList', {
	                 result : dataObj});	                 
   });
};

exports.removeStockMonitor = function(req, res)
{
  var monitor_list_name = '';
  var reqObj = req.body;
  console.dir(reqObj);
  if (req.query.name == '' || req.query.name == undefined){
       monitor_list_name = 'Konrad Test';
   }else{
       monitor_list_name = req.query.name;
   }

    db.stockMonitorRemove(monitor_list_name, reqObj.stockId, function(err, result){
        console.log(err);
        res.end(JSON.stringify('{msg: "Success"}'));    
    });
};


