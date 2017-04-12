var express = require('express');
var path = require('path');
var os = require('os');
var route = require('./private/route.js');
var db = require('./private/db.js');
var bodyParser = require('body-parser');

var app = express();
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

app.get('/', route.default);
app.get('/stock_a01', route.stockA01);
app.get('/stock_a02', route.stockA02);
app.get('/show_stock_analysis_date_list', route.showStockAnalysisDateList);
app.get('/show_stock_monitor', route.showStockMonitor);
app.post('/remove_stock_monitor', route.removeStockMonitor);
app.post('/add_stock_monitor', route.addStockMonitor);



app.set('views', path.join(__dirname, 'views'));
app.set('private', path.join(__dirname, 'private'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

/******************/
//db.init();
/******************/

app.listen(3000);

//console.log(os.platform());
console.log("Server Start...");