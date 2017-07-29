/* Copyright (c) 2017 konrad.wei@gmail.com */

"use strict"
var request = require('request');
var fs = require('fs');
var moment = require('moment');
var wait = require('wait.for');
var cheerio = require('cheerio');
var cheerioTableparser = require('cheerio-tableparser');
var merge = require('merge');
var utility = require("./utility.js");

//******************************************
// global variable
//******************************************

var g_tw_pcr_date_list = [];
var g_tw_pcr_dict;

//******************************************
// function
//******************************************

function data_reconstruct(raw_data_list)
{
    var pcr_data_dict = {};  /* Put/Call Ratio dict */

    for (var i=1 ; i<raw_data_list[0].length; i ++)
    {
        var dataObj = {};
        try {
            dataObj.date = raw_data_list[0][i];  /* Date */
            dataObj.POTV = raw_data_list[1][i];  /* Put option Trading Volume  */
            dataObj.COTV = raw_data_list[2][i];  /* Call option Trading Volume */
            dataObj.PCTVR = raw_data_list[3][i]; /* Put/Call Trading Volume Ratio */
            dataObj.POV = raw_data_list[4][i];   /* Put Open Volume */
            dataObj.COV = raw_data_list[5][i];   /* Call Open Volume */
            dataObj.PCR = raw_data_list[6][i];   /* Put/Call Ratio */

        }catch(err){
            console.log("ERROR get raw data fail!" + err)
        } /* try-catch */

        pcr_data_dict[dataObj.date] = dataObj;  /* DATE Key */
    } /* for */

    console.dir(pcr_data_dict);
    return pcr_data_dict;

} /* function - stock_data_reconstruct */


function getDatafromWeb(start_date, end_date, callback)
{

    let body = {  'download': '',
                'datestart': '',  /* Set on main() */
                'dateend' : '',  /* Set on main() */
            };

    let options = {
        url : 'http://www.taifex.com.tw/chinese/3/PCRatio.asp',
        method: "POST",
        form : body,
        headers: {'Content-Type' : 'application/x-www-form-urlencoded'}

    };

    body.datestart = start_date;
    body.dateend = end_date;
    request( options, function (error, response, body) {

        if (!error && response.statusCode == 200) {
            //console.log(body)
            //var table_html = body.match(/\<table.*\<\/table\>/g);

            try {

                /* Get table html */
                var $ = cheerio.load(body, {decodeEntities: false});
                var table_html = $('table.table_a').parent().html();
                /* get table object */
                var $ = cheerio.load(table_html, {decodeEntities: false});
                cheerioTableparser($);
                var data = $('table').parsetable(false, false, true);
                var pcr_data_dict = data_reconstruct(data);
                //console.dir(data);
                //console.dir(array);
            } catch  (err) {
                console.log("ERROR - Get HTML table error!" + err);
            }/* try -catch */
        } /* if */
        
        console.log("END");
        callback(null, pcr_data_dict);
    });
} /* getDatafromWeb */

function create_db_folder(db_folder)
{
    if (!fs.existsSync(db_folder)) {
          /* For twStockRealtimePrice.js UT */          
          fs.mkdirSync(db_folder);
    }
    return true;
}

function genCheckDbList(start_year, start_month, end_year, end_month)
{
    function addZero(str,length){               
        return new Array(length - str.length + 1).join("0") + str;              
    }
 
    let check_db_list = [];

    if(start_year == end_year){
        /* gen between start and end */
        for (let i=start_month ; i<=end_month ; i++)
        {
            let chk_str = start_year.toString() + addZero(i.toString(),2);
            check_db_list.push(chk_str);
        }
    }else {

        /* gen end year */
        for (let i=1; i<=end_month ; i++)
        {
            let chk_str = end_year.toString() + addZero(i.toString(),2);
            check_db_list.push(chk_str);
        }

        /* gen start year */
        for (let i=start_month; i<=12 ; i++)
        {
            let chk_str = start_year.toString() + addZero(i.toString(),2);
            check_db_list.push(chk_str);
        }

        /* gen between start and end */
        for (let y=(start_year+1) ; y<=(end_year-1) ; y++)
        {
            for(let m=1; m<=12 ; m++){
                let chk_str = y.toString() + addZero(m.toString(),2);
                check_db_list.push(chk_str);                
            }
        }
    }
    check_db_list.sort();
    return check_db_list;
}

//******************************************
// main()
//******************************************

function loadTwPutCallRatio(s_year, s_month, e_year, e_month)
{
    function exec(callback_fiber)
    {
         //let start_year = 2002;
         let start_year = s_year;
         let start_month = s_month; /* 1-12 */
         let end_year = e_year;
         let end_month = e_month; /* 1-12 */

         let check_db_list = genCheckDbList(start_year, start_month, end_year, end_month);

         let current_year = moment().year();

         for(let check_db of check_db_list)
         {
            function addZero(str,length){               
                return new Array(length - str.length + 1).join("0") + str;              
            }

                let check_key = check_db;
                let get_from_web_flag = false;

                /* Current month data always get from web */
                if(moment().format("YYYYMM") == check_db){
                    get_from_web_flag = true;
                }

                let db_folder = 'twse_put_call_ratio';
                let file_name = '/pcr_' + check_key + '.db';
                let db_file = './db/' + db_folder + '/' + file_name;
                create_db_folder(db_folder);

                let data_dict;
                if(fs.existsSync(db_file) && (get_from_web_flag == false)){
                    /* Load from local file DB */
                    data_dict = utility.readDataDbFile(db_file);                    
                }else{
                    /* Load from web */
                    let year = check_db.substring(0,4);
                    let month = check_db.substring(4,6);
                    let start_date = year + '/' + month + '/' + '01';
                    let day = 31; 
                    let end_date = year + '/' + month + '/' + day.toString();

                    while(!moment(end_date, "YYYY/MM/DD").isValid()){
                        day -= 1;
                        end_date = year + '/' + month + '/' + day.toString();
                    }
                    data_dict = wait.for(getDatafromWeb, start_date, end_date);                     
                    utility.writeDbFile(file_name, db_folder, data_dict);   
                } /* if-else */         
                g_tw_pcr_date_list = g_tw_pcr_date_list.concat(Object.keys(data_dict));
                g_tw_pcr_dict = merge(g_tw_pcr_dict, data_dict);      
        }         
        g_tw_pcr_date_list.sort(function(a, b){
            return moment(a, "YYYY/MM/DD") - moment(b, "YYYY/MM/DD");
        });
        callback_fiber(null);
    }

    wait.launchFiber(exec, function(){});
}

loadTwPutCallRatio(2017, 1, 2017, 6);
