var fs = require('fs');
var wait=require('wait.for');
var iconv = require('iconv-lite');
var BufferHelper = require('bufferhelper');
var moment = require('moment');
var db = require('./db.js');

var __dirname = './database/';

/*
fs.realpath(__dirname, function(err, path) {
    if (err) {
        //console.log(err);
     return;
    }
    //console.log('Path is : ' + path);
});
*/
function parseFile(file_dir, callback)
{
	//console.log("parseFile()+++"); 
	fs.readFile(file_dir, function (err,data) {
		  if (err) {
		    return callback(err);
		  }
		  console.log(data);
		  return callback(data);
	});
}

function isDir(path, isDirCallback)
{
	return isDirCallback;
}

function parseTWSEdb(raw_data)
{
    //console.log("parseTWSEdb()+");
    var db_json = {};
    
    try {
	    db_json.type = 'TWSE';
	    db_json.date = moment(raw_data[0], 'YY/MM/DD').format('YYYY-MM-DD');
	    db_json.index = raw_data[1].replace(',', ''); 
	    db_json.UpDownType = raw_data[2].replace(/\(|\)/g, '');
	    db_json.points = raw_data[3];
	    db_json.UpNum = raw_data[4];
	    db_json.DownNum = raw_data[5];
    }catch(err){
  	    console.log("[ERROR]" + ' type:' + 'TWSE');
	    console.log("raw data 0:" + raw_data[0]);
	    console.log("raw data 1:" + raw_data[1]);
	    console.log("raw data 2:" + raw_data[2]);	 
	    db_json = undefined;  
    }
    //console.log(db_json);
    return db_json;
}

function parseFGMAJORdb(raw_data)
{
    //console.log("parseFGMAJORdb()+");
    var db_json = {};
    
    db_json.type = 'FG_MAJOR';
    db_json.date = moment(raw_data[0], 'YY/MM/DD').format('YYYY-MM-DD');
    db_json.TSE_Buy = raw_data[1].replace('億',''); 
    db_json.OTC_Buy = raw_data[2].replace('億','');     

    //console.log(db_json);

    return db_json;

}

function parseFUTdb(raw_data)
{
    //console.log("parseFUTdb()+");
    var db_json = {};    

    db_json.type = 'FUT';
    db_json.date = moment(raw_data[0], 'YY/MM/DD').format('YYYY-MM-DD');
    db_json.buy_trading = raw_data[1]; 
    db_json.sell_trading = raw_data[2];    
    db_json.trading_diff = raw_data[3];    
    db_json.buy_open = raw_data[4]; 
    db_json.sell_open = raw_data[5];    
    db_json.open_diff = raw_data[6];
    db_json.contract = raw_data[7];
    db_json.futIndex = raw_data[8];
    var temp_points = raw_data[9].replace(/\(D\)|\(U\)/g, '');
    db_json.futPoints = temp_points;
    db_json.UpDownType = (raw_data[9].indexOf('(D)') > -1)?'D':'U';
    var temp_percentage = raw_data[10].replace(/\(D\)|\(U\)|\s/g, '');
    db_json.percentage = temp_percentage;

    //console.log(db_json);

    return db_json;
}

function parseKimoFGdb(type, raw_data, date)
{
	//console.log("parseKimoFGdb()+ TYPE:" + type);   
	//console.log('raw data len:' + raw_data.length);
    var db_json = {};
    
    db_json.type = type;
    db_json.date = moment(date,'YYYYMMDD').format('YYYY-MM-DD');
    db_json.stock_list = [];

    var loop_num = 7;
    if (type.indexOf('OTC') > -1){
    	loop_num = 6;	
    }

    for (var i=0 ; i<raw_data.length ; i=i+loop_num )
    {
    	var stock = {};
        //console.log(raw_data[i+0]);
	   try {
	        stock.rank = raw_data[i+0];        
	        stock.id = raw_data[i+1].substring(0, 4);
	        stock.name = raw_data[i+1].substring(4);
	        stock.price = raw_data[i+2];
	        stock.UpDownType = (raw_data[i+3].indexOf('(D)') > -1)?'D':'U';
	        var temp_points = raw_data[i+3].replace(/\(D\)|\(U\)/g, '');
	        stock.points = temp_points;
	        stock.trading_stock =  raw_data[i+4].replace(',', '');
	        stock.hold_stock =  raw_data[i+5].replace(',', '');     

	        if (type.indexOf('OTC') == -1)
	        {
	            stock.hold_percentage =  raw_data[i+6];
	        }

	        //console.log(stock);
	        db_json.stock_list.push(stock);
	    }catch(err)
	    {
	       console.log("[ERROR] i:" + i + ' date:' + date + ' type:' + type);
	       console.log("raw data 0:" + raw_data[i+0]);
	       console.log("raw data 1:" + raw_data[i+1]);
	       console.log("raw data 2:" + raw_data[i+2]);	
	       db_json = undefined;       
	    }
    }

    return db_json;
}

function main()
{
	 function exe(db_dir ,callback)
	 {	 	    
	 	    /* list all DB file */
	 	    console.log('data_base DIR:' + db_dir);
	 	    var db_dir_list = wait.for(fs.readdir, db_dir);	 	    
	 	    for (dir of db_dir_list)
	 	    {	 	    	 
	 	         console.log("[dir]: " + dir);	/* Folder name is date YYYYMMDD */
	 	         var data_date = dir;
	 	         var dir_path = db_dir + '/' + dir;
	 	    	 var stats = wait.for(fs.stat, dir_path)
	 	    	 
                 function parseDB(file_name, filepath)
                 {
                    console.log(' [File]:' + file_name);
                    /* parse file */	
			 	    var result = wait.for(fs.readFile, filepath);			 	       		 	       			 	       			 	    
                    var temp;

                    if ((file_name.indexOf('TWSE') > -1) || (file_name.indexOf('FUT') > -1))
                    {
                        temp  = result.toString();  /* process big5 '+' and '-'*/
                    }else {
					    temp = iconv.decode(result, 'Big5');
                    }                                                                    
                    
			 	    temp = temp.replace(/▼|▽|－/g,'(D)');
			 	    temp = temp.replace(/▲|△|＋/g,'(U)');			 	       			 				 	      
                      		 	    
			 	    //var regx = /\;|億/;			 	     
			 	    var regx = /\;/;			 	     
			 	    var temp_list = temp.split(regx);
			 	    temp_list = temp_list.filter(function(n){ return n != ''});
			 	    //console.log(temp_list);                 
			 	    /* parse db raw data */   		 	   
			 	    var db_date = file_name.match(/\d+/g)[0];			 	    

                    var db_json;
                    var db_type;
                    if (file_name.indexOf('TWSE') > -1) 
                    {
                    	db_type = 'TWSE'; 
                    	db_json = parseTWSEdb(temp_list);	
                    	//console.dir(db_json);

                    } else if (file_name.indexOf('FG_MAJOR') > -1)
                    {
                    	db_type = 'FG_MAJOR';
                        db_json = parseFGMAJORdb(temp_list);	 
                    } else if (file_name.indexOf('FUT') > -1)
                    {
                    	db_type = 'FUT'; 
                        db_json = parseFUTdb(temp_list);	 
                    } else if (file_name.indexOf('TSE_FGS') > -1) 
                    {
                    	db_type = 'TSE_FGS'; 
                        db_json = parseKimoFGdb('TSE_FGS', temp_list, db_date);

                    } else if (file_name.indexOf('TSE_FGB') > -1) 
                    {
                    	db_type = 'TSE_FGB';
                        db_json = parseKimoFGdb('TSE_FGB', temp_list, db_date); 

                    } else if (file_name.indexOf('OTC_FGS') > -1) 
                    {
                    	db_type = 'OTC_FGS';
                        db_json = parseKimoFGdb('OTC_FGS', temp_list, db_date);

                    } else if (file_name.indexOf('OTC_FGB') > -1)
                    {
                    	db_type = 'OTC_FGB'; 
                        db_json = parseKimoFGdb('OTC_FGB', temp_list, db_date);
                    }else{
                    	console.log("ERROR!!!!" + file_name)
                    }

                    /* SAVE to DB */	
                   // if ((db_type === 'TWSE') ||
                   //     (db_type === 'FG_MAJOR') ||
                   //     (db_type === 'FUT'))                        
                    { 
	                    var dbDataObj = {};
	                    dbDataObj.date = moment(data_date, 'YYYYMMDD');
	                    dbDataObj.data = JSON.stringify(db_json);
	                    db.dbSave(db_type, dbDataObj);                    
                    }

                    if ((db_type === 'OTC_FGB') ||
                        (db_type === 'OTC_FGS') ||
                        (db_type === 'TSE_FGB') ||
                        (db_type === 'TSE_FGS'))  
                    {

                        for (stock of db_json.stock_list)
                        {
                            var stockid = stock.id;                            

                            stock.type = db_type;

							var dbDataObj = {};
                    		dbDataObj.date = moment(db_json.date, 'YYYYMMDD');
                    		dbDataObj.data = JSON.stringify(stock);                    		
		                    db.dbSave(stockid, dbDataObj);     

                        }
                        //console.dir(db_json);
                    }

			 	    return db_json;
                 } /* function - parseDB */
                 
                 var db_json;   
	 	    	 if (stats.isDirectory())
	 	    	 {			 	    	 
			 	    	 var folder_name = __dirname + '/' + dir;	 	    		 	    	 
			 	    	 var db_file_list = wait.for(fs.readdir, folder_name);	 	    				 	    	
			 	    	 
			 	    	 for (file_name of db_file_list)
			 	    	 { 	 	    	 
			 	    	 	var file_path = folder_name + '/' + file_name;	
			 	    	 	db_json = parseDB(file_name, file_path);
			 	    	 }
			 	}else {
			 	   /* file */
			 	   var file_path = dir_path; 
			 	   var file_name = dir;
			 	   db_json = parseDB(file_name, file_path);
			 	} /* if-else */
	 	    } /* for */   	 	    	 	    	 	    
	        console.log("Done");	    
	 	 	return callback();
	 }
	 
	 wait.launchFiber(exe, __dirname, function(){}); 
	 console.log("Done");
}

main(); 
console.log("Exit")
return;
