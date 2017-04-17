"use strict"
var request = require('request');
var fs = require('fs');
var moment = require('moment');
var wait = require('wait.for');
var cheerio = require('cheerio');
var cheerioTableparser = require('cheerio-tableparser');
var iconv = require('iconv-lite');
var utility = require('./utility.js');

function parseWebInfoDate(raw_line)
{
    let temp_list = raw_line.split('日');    
    let tw_date = temp_list[0].replace(/年|月|日/g, '-');    
    let dc_date = utility.twDateToDcDate(tw_date);
    return dc_date;
}

function data_reconstruct(raw_data_list)
{
    var organize_data_dict = {};  /* Put/Call Ratio dict */
    var rank = 1;
    var buy_type = 1;
    var stock_list = [];
    
    let data_date = parseWebInfoDate(raw_data_list[0][0]);

    for (var i=2 ; i<raw_data_list[0].length; i ++)
    {
        var dataObj = {};
        try {
               
            dataObj.stockId = raw_data_list[0][i];    /* Stock ID */
            dataObj.stockName = raw_data_list[1][i];  /* Stock cname  */
            dataObj.YR  = raw_data_list[2][i];        /* Yield rate 殖利率 */
            dataObj.PRE = raw_data_list[4][i];        /* PRE 本益比 */
            dataObj.PBR  = raw_data_list[5][i];       /* PBR(Price-Book Ratio) 股價淨值比 */
                       
            stock_list.push(dataObj);  /* Stock ID Key */                
            

        }catch(err){
            console.log("ERROR get raw data fail!" + err)
        } /* try-catch */
                 
    } /* for */
    organize_data_dict.date = data_date;
    organize_data_dict.stock_list = stock_list;
        
    return organize_data_dict;
} /* function - stock_data_reconstruct */


function writeDataDbFile(data_list, callback)
{
	  var db_dir = './db/';
    if (!fs.existsSync(db_dir)) {
    	fs.mkdirSync(db_dir);
    }
    		
	 	let dbfile = db_dir + 'TwPRE_' + moment(data_list.date).format('YYYYMMDD') + '.db';
	 	fs.writeFile(dbfile, JSON.stringify(data_list));
	 	console.log('Write File DB:' + dbfile);
	 	return callback(null);	
}

function getDatafromWeb(options, callback)
{
    request( options, function (error, response, body) {      
    
        if (!error && response.statusCode == 200) {

            let buffer = new Buffer(body);
            let str = iconv.decode(buffer, 'utf8');  

            var table_html = str.match(/\<table.*\<\/table\>/g);
             //console.log(table_html[0]);
            try {

                /* Get table html */
                utility.timestamp('A');
                var $ = cheerio.load(table_html[0], {decodeEntities: false});
                utility.timestamp('A-');
                //console.log(table_html[0]);
                utility.timestamp('B');
                cheerioTableparser($);
                utility.timestamp('B-');
                utility.timestamp('C');
                var data = $('table').parsetable(true, true, true);
                utility.timestamp('C-');
                //delete data[0];
                //console.dir(table_html[0]);
                var organize_data_dict = data_reconstruct(data);                
                //console.dir(organize_data_dict);
                //console.dir(array);
            } catch  (err) {
                console.log("ERROR - Get HTML table error!" + err);
            }
        }
    
        console.log("END");
        callback(null, organize_data_dict);
    });
}

//******************************************
// Utility
//******************************************
function getTwDate(dateStr)
{
    let tempDateStr = moment(dateStr).format('YYYY-MM-DD');
    let twDateStr = utility.dcDateToTwDate(tempDateStr);
    
    twDateStr = twDateStr.replace(/-/g, '/');
/*
    var year = dateObj.year() - 1911;
    var month = dateObj.month() + 1;
    var date = dateObj.date();
    
    function addZero(str,length){               
        return new Array(length - str.length + 1).join("0") + str;              
    }

    month = addZero(month.toString(), 2);

    var twDateStr = year + "/" + month + "/" + date;
*/    
    return twDateStr;
}

//******************************************
// main()
//******************************************

exports.getTwsePRE = function(dateStr, callback_filber)
{
    if (dateStr == '' || dateStr == undefined)
    {
        dataStr = '2017-04-14'; /* Just for Test */
    }

   let tw_date = getTwDate(dateStr);
   console.log('TW Date:' + tw_date);
   let form_body = {  'input_date': tw_date,
                      'select2' : 'ALL',
                      'order' : 'STKNO',
                      'login_btn' : '(unable to decode value)'
                    };


    let options_default = {
                    url : 'http://www.twse.com.tw/ch/trading/exchange/BWIBBU/BWIBBU_d.php',
                    method: "POST",
                    form : form_body,
                    encoding: null,
                    headers: {'Content-Type' : 'application/x-www-form-urlencoded'}              
                   };    

    function exec(callback)
    {         
         var data_list = wait.for(getDatafromWeb, options_default);
         //var result = wait.for(writeDataDbFile, data_list);
         
         return callback(null, data_list);
    }

    wait.launchFiber(exec, callback_filber);
} /* exports.getTwsePRE() */

