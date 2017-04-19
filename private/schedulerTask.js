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
exports.gStockRealTimePrice ;

//**************************************************
// Function
//**************************************************

function updateTwStockTwsePRE()
{    
    var dateStr = moment().format('YYYY-MM-DD');    
    utility.timestamp('updateTwStockTwsePRE()+++');
    twStockTwsePRE.getTwsePRE(dateStr, function(err, result){
        console.log("updateTwStockTwsePRE()");
        //console.dir(result);
        let resultDbObj = {};
        resultDbObj.date = result.date;
        resultDbObj.data = JSON.stringify(result.stock_list);
        db.twseStockPRE_Update(result.date, resultDbObj);
        utility.timestamp('updateTwStockTwsePRE()---');
    });
        
}

function getRealtimeAllStockPric(callback)
{
     
     db.twseStockPRE_Find('2017-04-14', function(err, result){
         let stock_list = JSON.parse(result[0].data);
         let stockid_list = [];
         for(let stock of stock_list)
         {
             stockid_list.push(stock.stockId);
         }

         //stockid_list = ['2498', '2454', '1101']; /* For Test only */

         stockRTPirce.readAllStockPrice(stockid_list, callback);         
     });          
}

exports.init = function()
{        
    updateTwStockTwsePRE();
/*    
    utility.timestamp('getRealtimeStockPric()+++');
    getRealtimeAllStockPric(function(err, result){        
              exports.gStockRealTimePrice = result;
              console.dir(result);              
              utility.timestamp('getRealtimeStockPric()---');
    });
*/
    /*
    var j = schedule.scheduleJob('30 * * * * *', function(){
        console.log('scheduleJob: updateTwStockTwsePRE()');
        updateTwStockTwsePRE();
    });
    */

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
    
}