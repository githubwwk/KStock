/* Copyright (c) 2017 konrad.wei@gmail.com */

"use strict"
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/kStock');

var Schema = mongoose.Schema;

var stockSchema = new Schema({
  date: Date,
  data: String,  
});

var stockSchema2 = new Schema({
  date: String,
  data: String  
});

var stockMonitorSchema = new Schema({
  name: String,  
  monitorList: [String]
});

var stockTransactionSchema = new Schema({    
  transaction: String
});

var TWSE = mongoose.model('TWSE', stockSchema);
var FG = mongoose.model('FG', stockSchema);
var FUT = mongoose.model('FUT', stockSchema);
var BROKER = mongoose.model('BROKER', stockSchema);

var STOCK_DAILY_A02 = mongoose.model('stockDaily_A02', stockSchema2);
var STOCK_DAILY_A01 = mongoose.model('stockDaily_A01', stockSchema2);
var STOCK_MONITOR = mongoose.model('stockMonitor', stockMonitorSchema);
var STOCK_PRE = mongoose.model('stock_pre', stockSchema2);
var STOCK_TRANSACTION = mongoose.model('stock_Transaction', stockTransactionSchema);

//**********************************************************
//  For Analysis 01
//**********************************************************

exports.stockDailyA02_Find = function(date, callback)
{   
     var filter = {};
     if ((date != undefined) && (date != '')) {
         filter.date = date;
     }

     STOCK_DAILY_A02.find(filter).lean().exec(function (err, dataObj) {
        if (dataObj.length){
            console.log('STOCK_DAILY_A02.find successful!');
            return callback(null, dataObj);
        }else{
            console.log("ERROR - stockDailyA02_Find fail! " + err);
            return callback('Not data');
        }
    });
};

//**********************************************************
//  For Analysis 02
//**********************************************************

exports.stockDailyA01_Find = function(date, callback)
{    
     var filter = {};
     if ((date != undefined) && (date != '')) {
         filter.date = date;
     }

     STOCK_DAILY_A01.find(filter).lean().exec(function (err, dataObj) {
        if (dataObj.length){
            console.log('STOCK_DAILY_A01.find successful!');
            return callback(null, dataObj);
        }else{
            console.log("ERROR - stockDailyA01_Find fail! " + err);
            return callback('Not data');
        }
    });
};

//**********************************************************
//  For Monitor List
//**********************************************************

exports.stockMonitorList_Find = function(name, callback)
{   
     STOCK_MONITOR.find({name : name}).lean().exec(function (err, dataObj) {
        if (dataObj.length){
            console.log('STOCK_MONITOR.find successful!');
            return callback(null, dataObj);
        }else{
            return callback(err);
        }
    });
};

exports.stockMonitor_FindAll = function (callback)
{    
    STOCK_MONITOR.find().lean().exec(function (err, dataObj){
        if (dataObj.length){
            console.log('STOCK_MONITOR.find successful!');
            return callback(null, dataObj);
        }else{
            return callback(err);
        }
      });   
};

exports.stockMonitor_Update = function(dataObj, callback)
{
     STOCK_MONITOR.find({name : dataObj.name}, function (err, docs) {
            
        if (docs.length){          
            console.log('STOCK_MONITOR.find successful!');

            /* TODO: remove duplicate item */
            if (docs[0].monitorList.indexOf(dataObj.monitorList[0]) == -1)
            {  
                docs[0].monitorList.push(dataObj.monitorList[0]);
                docs[0].save(function(err){
                    console.log("STOCK_MONITOR save:" + err);
                    return callback(null, err);
                });
            }else{
                console.log("Duplicate Item:" + dataObj.monitorList[0]);
                return callback(null, err);
            }
            
        }else{
            /* New */            
            var stockMonitor = new STOCK_MONITOR(dataObj);
            stockMonitor.save(function(err){
                  console.log('STOCK_MONITOR Created Done');  
                  console.log("ERROR - " + err);         
                  return callback(null, err)
            });                          
        } /* if-else */
    });    
};

exports.stockMonitor_Remove = function(name, stockId, callback)
{
     STOCK_MONITOR.find({name : name}, function (err, docs) {
            
        if (docs.length){          
            console.log('STOCK_MONITOR.find successful!');
                 
            /* Remove stockId in monitorlist */
            //docs[0].monitorList. items.splice(items.indexOf('c'), 1);
            for (var i=0 ; i< docs[0].monitorList.length ; i++)
            {
                var monitorObj = JSON.parse(docs[0].monitorList[i]);
                try {
                    if (monitorObj.stockId == stockId)
                    {
                        docs[0].monitorList.splice(i, 1);                    
                    }
                } catch(err){
                  /* handle null object */
                   docs[0].monitorList.splice(i, 1); 
                }    

            }
            //docs[0].monitorList.push(dataObj.monitorList[0]);
            docs[0].save(function(err, result){
                console.log("STOCK_MONITOR save:" + err);
                return callback(err, result);
            });
            
        }
    });   
};

exports.stockMonitor_GetMonitorNameList = function (callback)
{
    var keys = [];
    STOCK_MONITOR.find().lean().exec(function (err, dataObj){
       dataObj.forEach(function(doc){
           keys.push(doc.name);           
        });
        return callback(null, keys);
      });   
};

//**********************************************************
//  For twStockTwsePRE.js
//**********************************************************
exports.twseStockPRE_Update = function(date, saveDataObj){
    STOCK_PRE.find({date : date}, function (err, dataObj){
        if (dataObj.length) {
            console.log('twseStockPRE_Update already Exist:'+ date);
        } else {
            var newStockObj = STOCK_PRE(saveDataObj);
            newStockObj.save(function(err){
                console.log('twseStockPRE_Update Created Done'); 
            });
        } /* if-else */
    });
};

exports.twseStockPRE_Find = function(date, callback)
{   
     STOCK_PRE.find({date : date}).lean().exec(function (err, dataObj) {
        if (dataObj.length){
            console.log('twseStockPRE_Find successful!');
            return callback(null, dataObj);
        }else{
            return callback(err);
        }
    });
};


//**********************************************************
//  For TwStockInfoWriteDb.js
//**********************************************************
exports.stockDailyA02_IsExist = function(checkDate, saveDataObj)
{
   console.log("stockDailyA02_IsExist() Date:" + checkDate);
   STOCK_DAILY_A02_INFO.find({date : checkDate}, function (err, dataObj) {
        if (dataObj.length){
            console.log('stockDailyA02_IsExist already Exist:'+ checkDate);
        }else{
            var newStockDailyInfo = STOCK_DAILY_A02_INFO(saveDataObj);
            newStockDailyInfo.save(function(err){
                console.log('STOCK_DAILY_A02_INFO Created Done'); 
            });
        }
    });
};

//**********************************************************
// stockDailyA01_IsExist()
//**********************************************************
exports.stockDailyA01_IsExist = function(checkDate, saveDataObj)
{
   console.log("stockDailyA01_IsExist() Date:" + checkDate);
   STOCK_DAILY_A01_INFO.find({date : checkDate}, function (err, dataObj) {
        if (dataObj.length){
            console.log('stockDailyA01_IsExist() already Exist:' + checkDate);
        }else{
            var newStockDailyInfo = STOCK_DAILY_A01_INFO(saveDataObj);
            newStockDailyInfo.save(function(err){
                console.log('STOCK_DAILY_A01_INFO Created Done'); 
            });
        }
    });
};

//**********************************************************
// stockDailyAnalyzeResult_IsExist()
//**********************************************************
exports.stockDailyAnalyzeResult_IsExist = function(category, checkDate, saveDataObj, callback)
{
   let STOCK_DAILY_ANALYZE_RESULT = mongoose.model(category, stockSchema2); 

   console.log("STOCK_DAILY_ANALYZE_RESULT() [Category]:" + category + " [Date]:" + checkDate);
   STOCK_DAILY_ANALYZE_RESULT.find({date : checkDate}, function (err, dataObj) {
        if (dataObj.length){
            console.log('STOCK_DAILY_ANALYZE_RESULT already Exist:' + category + ' ' + checkDate);
            callback(null);
        }else{
            let newStockDailyInfo = STOCK_DAILY_ANALYZE_RESULT(saveDataObj);
            newStockDailyInfo.save(function(err){
                console.log('STOCK_DAILY_ANALYZE_RESULT Created Done [Category]::' + category); 
                callback(err);
            });
        }
        
    });
};

//**********************************************************
// stockDailyAnalyzeResult_Find()
//**********************************************************
exports.stockDailyAnalyzeResult_Find = function(category, date, callback)
{   
     let STOCK_DAILY_ANALYZE_RESULT = mongoose.model(category, stockSchema2); 

     var filter = {};
     if ((date != undefined) && (date != '')) {
         filter.date = date;
     }

     STOCK_DAILY_ANALYZE_RESULT.find(filter).lean().exec(function (err, dataObj) {
        if (dataObj.length){
            console.log(STOCK_DAILY_ANALYZE_RESULT + '.find successful!');
            return callback(null, dataObj);
        }else{
            console.log("ERROR - " + STOCK_DAILY_ANALYZE_RESULT + " fail! " + err);
            return callback('Not data');
        }
    });
};

//**********************************************************
// Stock Transaction
//**********************************************************
exports.stockTransaction_FindAll = function (callback)
{    
    STOCK_TRANSACTION.find().lean().exec(function (err, dataObj){
        if (dataObj.length){
            console.log('STOCK_TRANSACTION.find successful!');
            return callback(null, dataObj);
        }else{
            return callback(err);
        }
      });   
};

exports.stockTransaction_Update = function(dataObj, callback)
{
     STOCK_TRANSACTION.find({_id : ObjectID(dataObj._id)}, function (err, docs) {
            
        if (docs.length){          
            console.log('STOCK_TRANSACTION.find successful!');

            docs[0].transaction = dataObj.transaction;
            docs[0].save(function(err){
                console.log("STOCK_TRANSACTION save:" + err);
                return callback(null, err);
            });            
            
        }else{
            /* New */            
            var stockTransaction = new STOCK_TRANSACTION(dataObj);
            stockTransaction.save(function(err){
                  console.log('STOCK_TRANSACTION Created Done');  
                  console.log("ERROR - " + err);         
                  return callback(null, err)
            });                          
        } /* if-else */
    });    
};

exports.stockTransaction_Remove = function(dataObj, callback)
{
     STOCK_TRANSACTION.remove({_id: ObjectID(dataObj._id)}, function(err, result) {
            if (err) {
                console.log(err);
                return callback(err);
            }
            console.log(result);
            return callback(null);
     });
};