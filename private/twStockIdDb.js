/* Copyright (c) 2017 konrad.wei@gmail.com */

"use strict"
var request = require('request');
var fs = require("fs-extra");
var moment = require('moment');
var wait = require('wait.for');
var cheerio = require('cheerio');
var cheerioTableparser = require('cheerio-tableparser');
var merge = require('merge');
var fs = require("fs-extra");
var db = require("./db.js");
var utility = require("./utility.js");
var otcStockDailyInfoCrawler = require("./twOTCStockDailyInfoCrawler.js");

//******************************************
// variable
//******************************************

let single_debug = false;
var gTwStockidObj = undefined;
//******************************************
// Funcionts
//******************************************
exports.getStockIdDB = function()
{    
    return gTwStockidObj;
} 

/* market: tsc, otc*/
function _f_readStockIdDb(stockIdDbFile)
{        
    let db_dir = './db/stock_id';    

    //let stockIdDbFile = 'otcStockId.db';
    let stockIdDbFile_path = db_dir + '/' + stockIdDbFile;
    let stockIdObj;
    try {
        stockIdObj = utility.readDataDbFile(stockIdDbFile_path)
    }catch(err){
        console.log("ERROR - twStockIdDB _f_readStockListFromDb() Error!");
        
    }
    return stockIdObj;
}

function _f_initStockIdList()
{    
    gTwStockidObj = {};
    /* Init TSE */
    gTwStockidObj.stockIdList = _f_readStockIdDb('tseStockId.db');
    gTwStockidObj.stockObjDict = _f_readStockIdDb('tseStockIdDict.db');
    /* Init OTC */
    gTwStockidObj.otcStockIdList = _f_readStockIdDb('otcStockId.db');    
    gTwStockidObj.otcStockObjDict = _f_readStockIdDb('otcStockIdDict.db');    

    console.log("INFO - TSE Stock ID Len:" + gTwStockidObj.stockIdList.length);
    console.log("INFO - OTC Stock ID Len:" + gTwStockidObj.otcStockIdList.length);
    console.log("INFO - TSE Stock ID DICT Len:" + Object.keys(gTwStockidObj.stockObjDict).length);
    console.log("INFO - OTC Stock ID DICT Len:" + Object.keys(gTwStockidObj.otcStockObjDict).length);
} /* _f_initStockIdList */

exports.init = function()
{
    _f_initStockIdList();
}