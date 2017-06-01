"use strict"
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
//var os = require('os');
var route = require('./private/route.js');
var schedulerTask = require('./private/schedulerTask.js');
var stockRTPirce = require('./private/twStockRealTimePrice.js');
var stockInfoCrawler = require('./private/twStockDailyInfoCrawler.js');

//*************************************************** 
//  App.js - Code
//***************************************************

var app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

/*************************************************/
app.get('/', route.default);

/* Analysis date */
app.get('/show_stock_analysis_date_list', route.showStockAnalysisDateList);

/* Real time analyze */
app.get('/show_stock_realtime', route.showStockRealTimeAnalysisResult);
/* Stock Dispersion */
app.get('/show_stock_dispersion', route.showStockDispersion);
app.get('/lookup_stock_dispersion', route.lookupStockDispersion);

/* For monitor */
app.get('/show_stock_monitor', route.showStockMonitor);
app.post('/remove_stock_monitor', route.removeStockMonitor);
app.post('/add_stock_monitor', route.addStockMonitor);

/* Transaction Record */
app.get('/show_all_transaction_list', route.showAllTransactionRecord);
app.get('/show_transaction_detial', route.showTransaction);
app.get('/edit_transaction_detial', route.editTransaction);
app.post('/update_transaction_detial', route.updateTransaction);

/* Other */
app.get('/show_fg8index_check', route.showFG8IndexCheck);
/************************************************/

app.set('views', path.join(__dirname, 'views'));
app.set('private', path.join(__dirname, 'private'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

app.listen(80);

/******************/

schedulerTask.init();
stockRTPirce.init();
stockInfoCrawler.init();
/******************/

//console.log(os.platform());
console.log("Server Start...");

//*************************************************** 
//***************************************************