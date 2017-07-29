
function show_dispersion_chart(stock_dispersion, show_div_name)
{
    debugger;
	if (Object.keys(stock_dispersion).length == 0)
	{
		return;		
	}

    var chart = document.getElementById(show_div_name);
    if (chart == null){
        let err = "ERROR! getElementById() Null:" + show_div_name;
        alert("ERROR! getElementById()" + show_div_name);
        throw err;
    } 
    var myChart = echarts.init(chart);
  
	option = {
   	         tooltip : {
		        trigger: 'axis'
		     },
		     legend: {
		        data:['持股超過1000張股東']
		     },
		     toolbox: {
		        show : true,
		        feature : {
		            mark : {show: false},
		            dataView : {show: false, readOnly: false},
		            magicType : {show: false, type: ['line']},
		            restore : {show: false},
		            saveAsImage : {show: false}
		        }
		    },
		    calculable : false,
			animation : false,
		    xAxis : [
		        {
		            type : 'category',
		            boundaryGap : false,
		            data : []  /* X-axis tag */
		        }
		    ],
		    yAxis : [
		        {
		            type : 'value',		
		            max : '0',            
                    min : '0',		            
		        }
		    ],
		    series : [
		        {
		            name:'持股',
		            type:'line',		           
		            data:[] /* Value */
		        },  
		    ]
		};
		
        /* Set value to chart data */		
		let yAxis_max = '0';
		let yAxis_min = '100';		
		stock_dispersion.sort(function(a, b){
			return a.date - b.date;
		});		
	    for (item of stock_dispersion)
	    {
	        //console.log("Time:" + item.Time + " Humi:" + item.Humi + " Temp:" + item.Temp );
	        option.xAxis[0].data.push(item.date);
	        option.series[0].data.push(item.data);			
			if (parseFloat(item.data) < parseFloat(yAxis_min))
			{
				yAxis_min = item.data;
			}
			if (parseFloat(item.data) > parseFloat(yAxis_max))
			{
				yAxis_max = item.data;
			}			
	    }        
        option.yAxis[0].max = (parseInt(yAxis_max) + 1).toString();
		option.yAxis[0].min = (parseInt(yAxis_min) - 1).toString();
		console.log("yAxis_max:" + yAxis_max);
		console.log("yAxis_min" + yAxis_min);

        myChart.setOption(option);  	
}

function showStockPriceChart(title_element, show_div_name, modal_elment, stock_info_result_obj)
{
	let stock_price_obj = init_stock_price_chart_title(title_element, stock_info_result_obj);
	init_stock_price_chart_content(stock_price_obj, show_div_name);
	 $(modal_elment).modal('show'); 
}

function init_stock_price_chart_title(title_element, stock_info_result_obj)
{
	let result = stock_info_result_obj;
    let stock_price_obj = {};          
    stock_price_obj.MA1_list = result.MA1_list;
    stock_price_obj.MA60_list = result.MA60_list;
    stock_price_obj.tv_list = result.tv_list;
    let stockRtpObj = result.stockRtpObj;          
    let stockProfit = result.stockProfit; 
          
    /* Add price information */
    let price_info_html = '價格:' + stockRtpObj.currentPrice + 
                          '  漲跌:' + stockRtpObj.GS + ' (' + stockRtpObj.GSP +'%)';
    if(String(stockRtpObj.GS).indexOf('-') > -1)
    {              
        price_info_html = '<h4><font color="green">' + price_info_html + '</font></4>';
    }else{
        price_info_html = '<h4><font color="red">' + price_info_html + '</font></h4>';
    }                                
    $(title_element).append(price_info_html); 
          
    /* Add profit information */
    /* PER: 本益比 */
    /* Yield rate: 殖利率 */
    /* Price-Book Ratio: 股價淨值比 */          
    let profit_info_html = '';                       
    try {
         profit_info_html = '本益比:' + stockProfit.PER + ' 殖利率:' + stockProfit.YR + ' 股價淨值比:' + stockProfit.PBR;                       
    } catch(err){
         profit_info_html = '本益比: N/A' + ' 殖利率: N/A' + ' 股價淨值比: N/A';                        
    }
    $(title_element).append(profit_info_html);   

    try {            
         /* Add to head */ 
		 stock_price_obj.MA1_list.unshift(parseFloat(stockRtpObj.currentPrice).toFixed(2));          
		 show_stock_price_value_chart(stock_price_obj, show_div_name);
	}catch(err){}
	
	return stock_price_obj;
}

function init_stock_price_chart_content(stock_price_obj, show_div_name)
{
   show_stock_price_value_chart(stock_price_obj, show_div_name);
}

function show_stock_price_value_chart(stock_price_obj, show_div_name)
{    
    stock_price_obj.MA1_list.reverse();
    stock_price_obj.MA60_list.reverse();
	stock_price_obj.tv_list.reverse();
		  	
    var chart = document.getElementById(show_div_name);
    if (chart == null){
        let err = "ERROR! getElementById() Null:" + show_div_name;
        alert("ERROR! getElementById()" + show_div_name);
        throw err;
    } 
    var myChart = echarts.init(chart);
  
	option = {
   	         tooltip : {
		        trigger: 'axis'
		     },
		     legend: {
		        data:['Price', 'MA60', 'Value']
		     },
		     toolbox: {
		        show : false,
		        feature : {
		            mark : {show: false},
		            dataView : {show: false, readOnly: false},
		            magicType : {show: false, type: ['line']},
		            restore : {show: false},
		            saveAsImage : {show: false}
		        }
		    },
		    calculable : false,
			animation : false,
		    xAxis : [
		        {
		            type : 'category',
		            boundaryGap : false,
		            data : []  /* X-axis tag */
		        }
		    ],
		    yAxis : [
		        
	            {
					type : 'value',
					name : 'Value',					
		            max : '0',            
                    min : '0',		            
				},
                {
					type : 'value',		
					name : 'Price',			
		            max : '0',            
                    min : '0',		            
				},												
		    ],
		    series : [
		        {
		            name:'Price',
					type:'line',
                    yAxisIndex: 1,										           
		            data:[] /* Value */
		        },  
				{
		            name:'MA60',
					type:'line',
					yAxisIndex: 1,					           
		            data:[] /* Value */
				},  
                {
		            name:'Value',
					type:'bar',
					yAxisIndex: 0,					           
		            data:[] /* Value */
		        },  						
		    ]
		};
		
        /* Set value to chart data */		
		let yAxis_max = '0';
		let yAxis_min = '0';		
		debugger;
		let shift_MA60 = stock_price_obj.MA1_list.length - stock_price_obj.MA60_list.length;	
		let shift_tv_list_len = stock_price_obj.MA1_list.length - stock_price_obj.tv_list.length;
		for(let i=0 ; i<stock_price_obj.MA1_list.length ; i++)
	    { 
			item = stock_price_obj.MA1_list[i];			
	        //console.log("Time:" + item.Time + " Humi:" + item.Humi + " Temp:" + item.Temp );
	        option.xAxis[0].data.push(i);			
			option.series[0].data.push(item);	
			
			/* MA60 */
			if (i >= shift_MA60) {		
				item_MA60 = stock_price_obj.MA60_list[i-shift_MA60];				
				option.series[1].data.push(item_MA60);			
			}else{
				option.series[1].data.push(undefined);
				
			}
			
			/* TV */
			if( i >= shift_tv_list_len)
			{
				item_tv = stock_price_obj.tv_list[i-shift_tv_list_len];
                option.series[2].data.push(item_tv);
			}else{
                option.series[2].data.push(undefined);
			}

			if (yAxis_max == 0){
				yAxis_max = item;
				yAxis_min = item;
			}
			if (parseFloat(item) < parseFloat(yAxis_min))
			{
				yAxis_min = item;
			}
			if (parseFloat(item) > parseFloat(yAxis_max))
			{
				yAxis_max = item;
			}			
		}        
		let price_max_temp = parseInt(yAxis_max) + 1;
		let price_min_temp = parseInt(yAxis_min) - 1;
		let margin = (price_max_temp - price_min_temp) * 0.1;
		
		let margin_max = Math.round((price_max_temp + margin*1) + 1);
		let margin_min = Math.round(((price_min_temp - margin*3) > 0)? (price_min_temp - margin*3):0);

        option.yAxis[1].max = margin_max;
		option.yAxis[1].min = margin_min;
		console.log("yAxis_max:" + margin_max);
		console.log("yAxis_min" + margin_min);

		let yAxis_1_temp = Math.max.apply(null, stock_price_obj.tv_list) * 3;
        let yAxis_max_temp = 0;
		if (yAxis_1_temp > 100000){
           yAxis_max_temp = Math.round(yAxis_1_temp / 100000) * 100000;
		}else if(yAxis_1_temp > 10000){
           yAxis_max_temp = Math.round(yAxis_1_temp / 10000) * 10000;
		}else if(yAxis_1_temp > 1000){
           yAxis_max_temp = Math.round(yAxis_1_temp / 1000) * 1000;  
		}else if(yAxis_1_temp > 100){ 
           yAxis_max_temp = Math.round(yAxis_1_temp / 100) * 100;
		}else if(yAxis_1_temp > 10){
           yAxis_max_temp = Math.round(yAxis_1_temp / 10) * 10;
		}		
		option.yAxis[0].max = yAxis_max_temp;
        option.yAxis[0].min = 0;
        myChart.setOption(option);  	
}