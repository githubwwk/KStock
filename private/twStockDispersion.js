"use strict"
var moment = require('moment');
var wait = require('wait.for');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
const querystring = require('querystring');   
const https = require('https');

function _f_genTDCCRequestHeader(stockId, dateStr)
{
    //console.log("DEBUG - _f_genTDCCRequestHeader() " + dateStr);
    var form_body = { 'SCA_DATE': dateStr,
                    'SqlMethod' : 'StockNo',
                    'StockNo' : stockId,
                    'StockName' : '',
                    //'sub' : 'ACdB8DF'
                    };

    var postData = querystring.stringify(form_body) + '&sub=%ACd%B8%DF'; /* BIG5 "%ACd%B8%DF => 查詢"*/

    var options = {
        hostname : 'www.tdcc.com.tw', 
        path: '/smWeb/QryStock.jsp',
        method: "POST",           
        headers: {
                  'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                  'Content-Length': Buffer.byteLength(postData),
                  'Content-Type':'application/x-www-form-urlencoded',
                  'Cookie':'JSESSIONID=0000rMN_6sUGAYpN8YuoPVcUNNY:19tmdfpi3; _gat=1; _ga=GA1.3.526792085.1488808524; _gid=GA1.3.984653124.1494424839'
                }                
        };

    let result = {};
    result.option = options;
    result.postData = postData
    return result;
}

function _f_getDateOptionsfromWeb(request_header, callback)
{
   let data_options = [];
   var req = https.request(request_header.option, (res) => {
        //console.log('statusCode:', res.statusCode);
        //console.log('headers:', res.headers);

        res.on('data', (d) => {
            let buffer = new Buffer(d);
            let str = iconv.decode(buffer, 'big5');   
            var $ = cheerio.load(str, {decodeEntities: false});

            /* get Data Option */
            let option_list = $("option"); 
            for (var i = 0; i < option_list.length; i++){
                var option = option_list[i];
                // now have option.text, option.value
                data_options.push(option.children[0].data);
            }                
            return callback(null, data_options);
        });
    });

    req.setTimeout(2000, function(){
        this.abort();
    }.bind(req));

    req.on('error', (err) => {
        console.error(err);
        return callback(err)
    });

    req.write(request_header.postData);
    req.end();    
}

function sleepForMs (ms,sleepCallback) {
  setTimeout(function() {
    return sleepCallback();
  }, ms);
}


function getDatafromWeb(request_header, dateStr, callback)
{
   let data_options = [];
   var req = https.request(request_header.option, (res) => {
        //console.log('statusCode:', res.statusCode);
        //console.log('headers:', res.headers);

        res.on('data', (d) => {
            let buffer = new Buffer(d);
            let str = iconv.decode(buffer, 'big5');
            let start_posi = str.indexOf('<td align="center">15</td>');
            let end_posi = str.indexOf('</tr>', start_posi);
            let table_html = str.substring(start_posi, end_posi);
            table_html = table_html.trim();
            var $ = cheerio.load(table_html, {decodeEntities: false});

            /* get Data Option */
            let table_list = $("td"); 
            for (var i = 0; i < table_list.length; i++){
                var table = table_list[i];
                data_options.push(table.children[0].data);
            }                
            let result = {};
            result.date = dateStr;
            result.data = data_options;
            return callback(null, result);
        });
    });

    req.setTimeout(5000, function(){
        this.abort();
    }.bind(req));

    req.on('error', (err) => {        
        console.error(err);
        return callback(err)
    });

    req.write(request_header.postData);
    req.end();    
}

//******************************************
// Utility
//******************************************


//******************************************
// main()
//******************************************

exports.getStockDispersion = function(stockId, callback)
{   
    function exec(callback_exec)
    {    
        var date_options;
        var data_list = [];
         while(true)
         {
            try {    
                let request_header = _f_genTDCCRequestHeader('2454','');
                date_options = wait.for(_f_getDateOptionsfromWeb, request_header);  
                //console.dir(date_options);                
                break;
            } catch(err){
                console.log("ERROR - _f_genTDCCRequestHeader() " + err);
            }
            wait.for(sleepForMs, 50);
         }         

         var counter = [];         
         for (let dateStr of date_options)
         {            
            let request_header = _f_genTDCCRequestHeader(stockId, dateStr);             
            //while(true) 
            {
                try {                    
                    getDatafromWeb(request_header, dateStr, function(err, result){
                        if (err != null)
                        {         
                            console.log("ERROR - getDatafromWeb() Error:" + err);                   
                            let temp = {};
                            temp.date = 'NA';
                            temp.data = 'NA';
                            data_list.push(temp);                              
                        }
                        if (result != undefined)
                        {
                            let temp = {};
                            temp.date = result.date;
                            temp.data = result.data[4];
                            data_list.push(temp);                              
                        }
                    });                    
                    //break;
                }catch(err){
                    console.log("ERROR - _f_genTDCCRequestHeader() " + err); 
                    let temp = {};
                    temp.date = 'NA';
                    temp.data = 'NA';
                    data_list.push(temp);                       
                } /* try-catch */
            }/* while */       
            wait.for(sleepForMs, 50);                
         }/* for */         

         let cnt = 0;
         while(true)
         {
            console.log("DEBUG - [Data Len]:" + data_list.length + "  " + date_options.length);
            wait.for(sleepForMs, 1000);
            if (data_list.length == date_options.length)
            {
                break;
            }
            if (cnt++ > 100){
                console.log(ERROR - Timeout);
            }
         }

         data_list.sort(function(a, b){
             return a.date > b.date;
         });

         return callback_exec(null, data_list);
    }

    wait.launchFiber(exec, callback);
};

/*
exports.getStockDispersion('5269', function(err, result)
{
    console.log("DEBUG - Get Result:");
    console.dir(result);
});
*/