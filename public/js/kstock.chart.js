
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
		            dataView : {show: true, readOnly: false},
		            magicType : {show: false, type: ['line']},
		            restore : {show: false},
		            saveAsImage : {show: false}
		        }
		    },
		    calculable : false,
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

function show_stockprice_chart(stock_price_obj, show_div_name)
{
    debugger;

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
		        data:['Stock Price Chart']
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
		            name:'價格',
		            type:'line',		           
		            data:[] /* Value */
		        },  
				{
		            name:'MA60',
		            type:'line',		           
		            data:[] /* Value */
		        },  
		    ]
		};
		
        /* Set value to chart data */		
		let yAxis_max = '0';
		let yAxis_min = '0';		
		
		let shift_MA60 = stock_price_obj.MA1_list.length - stock_price_obj.MA60_list.length;	
		for(let i=0 ; i<stock_price_obj.MA1_list.length ; i++)
	    { 
			item = stock_price_obj.MA1_list[i];			
	        //console.log("Time:" + item.Time + " Humi:" + item.Humi + " Temp:" + item.Temp );
	        option.xAxis[0].data.push(i);			
	        option.series[0].data.push(item);	
			if (i >= shift_MA60) {		
				item_MA60 = stock_price_obj.MA60_list[i-shift_MA60];
				option.series[1].data.push(item_MA60);
			}else{
				option.series[1].data.push(undefined);
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
        option.yAxis[0].max = (parseInt(yAxis_max) + 1).toString();
		option.yAxis[0].min = (parseInt(yAxis_min) - 1).toString();
		console.log("yAxis_max:" + yAxis_max);
		console.log("yAxis_min" + yAxis_min);

        myChart.setOption(option);  	
}