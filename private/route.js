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
       db.stockDailyFind(dateStr, function(err, dataObj){        
            res.render( 'stockInfoCrawerDaily', {
	            result : dataObj 
            });	
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


