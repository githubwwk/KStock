"use strict"
var moment = require('moment');
var stockRTPirce = require('./twStockRealTimePrice.js');
var twStockTwsePRE = require('./twStockTwsePRE.js');
var utility = require('./utility.js');
var db = require('./db.js');
var schedule = require('node-schedule');

//**************************************************
// Variable
//**************************************************

//**************************************************
// Function
//**************************************************

function updateTwStockTwsePRE()
{    
    var dateStr = moment().format('YYYY-MM-DD');    
    utility.timestamp('updateTwStockTwsePRE()+++');
    twStockTwsePRE.getTwsePRE(dateStr, function(err, result){
    	 if(err != null){
    	 	  console.log("ERROR - getTwsePRE fail." + err);
    	 	  return;
    	 } 
       console.log("updateTwStockTwsePRE()");
       //console.dir(result);
       let resultDbObj = {};
       resultDbObj.date = result.date;
       resultDbObj.data = JSON.stringify(result.stock_list);
       db.twseStockPRE_Update(result.date, resultDbObj);
       utility.timestamp('updateTwStockTwsePRE()---');
    });
        
}



exports.init = function()
{        
    updateTwStockTwsePRE();

    //stockRTPirce.updateRealTimeStockPrice(); 

/*
    var rule = new schedule.RecurrenceRule();
    var hours = [9, 10, 11, 12, 1, 2];
    var minutes = [1, 10, 20, 30, 40, 50, 60];
    rule.hour = hours;
　　rule.minute  = minutes;

    //var j = schedule.scheduleJob('30 * * * * *', function(){
    var j = schedule.scheduleJob(rule, function(){
        console.log('scheduleJob: readStockPrice()');
        getRealtimeAllStockPric(function(err, result){        
                exports.gStockRealTimePrice = result;
                console.dir(result);              
                utility.timestamp('getRealtimeStockPric()---');
        });
    });
  */  
}