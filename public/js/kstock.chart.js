
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