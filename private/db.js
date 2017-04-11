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


var TWSE = mongoose.model('TWSE', stockSchema);
var FG = mongoose.model('FG', stockSchema);
var FUT = mongoose.model('FUT', stockSchema);
var BROKER = mongoose.model('BROKER', stockSchema);

var STOCK_DAILY_A02 = mongoose.model('stockDaily_A02', stockSchema2);
var STOCK_DAILY_A01 = mongoose.model('stockDaily_A01', stockSchema2);
var STOCK_MONITOR = mongoose.model('stockMonitor', stockMonitorSchema);


exports.stockDailyA02_Find = function(date, callback)
{   
     STOCK_DAILY_A02.find({date :date}).lean().exec(function (err, dataObj) {
        if (dataObj.length){
            console.log('STOCK_DAILY_A02.find successful!');
            return callback(null, dataObj);
        }else{
            console.log("ERROR - stockDailyA02_Find fail! " + err);
            return callback('Not data');
        }
    });
};

exports.stockDailyA01_Find = function(date, callback)
{   
     STOCK_DAILY_A01.find({date :date}).lean().exec(function (err, dataObj) {
        if (dataObj.length){
            console.log('STOCK_DAILY_A01.find successful!');
            return callback(null, dataObj);
        }else{
            console.log("ERROR - stockDailyA01_Find fail! " + err);
            return callback('Not data');
        }
    });
};


exports.stockMonitorListFind = function(name, callback)
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


exports.stockMonitorUpdate = function(dataObj, callback)
{
     STOCK_MONITOR.find({name : dataObj.name}, function (err, docs) {
            
        if (docs.length){          
            console.log('STOCK_MONITOR.find successful!');
                
            docs[0].monitorList.push(dataObj.monitorList[0]);
            docs[0].save(function(err){
                console.log("STOCK_MONITOR save:" + err);
                return callback(null, err);
            });
            
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

exports.stockMonitorRemove = function(name, stockId, callback)
{
     STOCK_MONITOR.find({name : name}, function (err, docs) {
            
        if (docs.length){          
            console.log('STOCK_MONITOR.find successful!');
                 
            /* Remove stockId in monitorlist */
            //docs[0].monitorList. items.splice(items.indexOf('c'), 1);
            for (var i=0 ; i< docs[0].monitorList.length ; i++)
            {
                var monitorObj = JSON.parse(docs[0].monitorList[i]);
                if (monitorObj.stockId == stockId)
                {
                    docs[0].monitorList.splice(i, 1);                    
                }

            }
            //docs[0].monitorList.push(dataObj.monitorList[0]);
            docs[0].save(function(err){
                console.log("STOCK_MONITOR save:" + err);
                return callback(null, err);
            });
            
        }
    });   
};