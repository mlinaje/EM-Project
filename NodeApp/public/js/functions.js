function displayNodes(operation) {
	var interval;
	if (operation == "start"){
		$(function(){
			$('#dynamictable').append('<table id="myTable"></table>');
			var table = $('#dynamictable').children();
			interval = setInterval(function() {
				  $.ajax({
					url: 'http://10.10.1.1:8080/nodes',
					type: 'GET',
					success : function(data) {
						var res = data;
						var nodos = res.nodes;
						var stg = res.stgNodes;
						var tot = res.totNodes;
						var head = "<tr><th>nodo</th><th>mem("+res.weigths.weightMem+")</th><th>proc("+res.weigths.weigthProc+")</th><th>batt("+res.weigths.weigthBatt+")</th><th>Lat("+res.weigths.weigthLat+")</th><th>Power("+res.weigths.weigthPower+")</th><th>RAM("+res.weigths.weigthRAM+")</th></tr>"
						document.getElementById("myTable").remove();
						$('#dynamictable').append('<table id="myTable"></table>');
						var table = $('#dynamictable').children();
						table.append(head);
						for (var i=0; i<nodos.length; i++){
							var node = nodos[i];
							if(tot.indexOf(node.nodo) != -1){
								if(stg.indexOf(node.nodo) != -1){
										var line = "<tr style='color: green'><td>"+node.nodo+"</td><td>"+node.data[0].val+" ("+node.data[0].unit+")</td><td>"+node.data[1].val+" ("+node.data[1].unit+")</td><td>"+node.data[2].val+" ("+node.data[2].unit+")</td><td>"+node.data[5].val+" ("+node.data[5].unit+")</td><td>"+node.data[3].val+" ("+node.data[3].unit+")</td><td>"+node.data[4].val+" ("+node.data[4].unit+")</td></tr>"
								}else{
									var line = "<tr style='color: red'><td>"+node.nodo+"</td><td>"+node.data[0].val+" ("+node.data[0].unit+")</td><td>"+node.data[1].val+" ("+node.data[1].unit+")</td><td>"+node.data[2].val+" ("+node.data[2].unit+")</td><td>"+node.data[5].val+" ("+node.data[5].unit+")</td><td>"+node.data[3].val+" ("+node.data[3].unit+")</td><td>"+node.data[4].val+" ("+node.data[4].unit+")</td></tr>"
								}
								table.append(line);
							}
						}      	
					}
				});
			},500); 
		});
	}else{
		clearInterval(interval);
		document.getElementById("myTable").remove();
	}
}
function realTime(node,param) {
	var url_req = 'http://10.10.1.1:8080/realtimereq/'+node;
	var url_main = 'http://10.10.1.1:8080/realtime/'+node +'/'+ param;
	var flag;
	$(function(){
		$.ajax({
			url: url_req ,
			type: 'GET',
			success : function(data) {

				flag = data.res;
			}
		});
	});
	
	if(flag = "ok"){	
		var interval = setInterval(function() {
			$(function(){
			  $.ajax({
				url: url_main,
				type: 'GET',
				success : function(data) {
					if (data.error != undefined){
						console.log("error");
					}else{
						var chartProperties = {
							"caption": "Node 1 CPU usage",
							"xAxisName": "timestamp",
							"yAxisName": "CPU usage"
						  };

						  var categoriesArray = [{
							  "category" : data["categories"]
						  }];
						  var lineChart = new FusionCharts({
							type: 'msline',
							renderAt: 'chart-location',
							width: '1000',
							height: '600',
							dataFormat: 'json',
							dataSource: {
							  chart: chartProperties,
							  categories : categoriesArray,
							  dataset : data["dataset"]
							}
						  });
						  lineChart.render();
					}
			  }
			  });
			});
		}, 3000);
	}else{
		
	}
}

function specificQuery(node,param, max, min) {

	var url_main = 'http://10.10.1.1:8080/specific/'+node +'/'+ param +'/'+max +'/'+min;
	
	$(function(){
	  $.ajax({
		url: url_main,
		type: 'GET',
		success : function(data) {
			if (data.error != undefined){
				console.log("error");
			}else{
				var chartProperties = {
					"caption": "Node 1 CPU usage",
					"xAxisName": "timestamp",
					"yAxisName": "CPU usage"
				  };

				  var categoriesArray = [{
					  "category" : data["categories"]
				  }];
				  var lineChart = new FusionCharts({
					type: 'msline',
					renderAt: 'chart-location',
					width: '1000',
					height: '600',
					dataFormat: 'json',
					dataSource: {
					  chart: chartProperties,
					  categories : categoriesArray,
					  dataset : data["dataset"]
					}
				  });
				  lineChart.render();
			}
	  }
	  });
	});	
}
	
$(document).ready(function(){
    $("#show").click(function(){
        displayNodes("start");
		$("#show").hide();
		$("#hide").show();
    });
	$("#hide").click(function(){
        displayNodes("stop");
		$("#show").show();
		$("#hide").hide();
    });
	$("#realtime").click(function(){
		$("#nodeSel").show();
		$("#paramSel").show();
		$("#accept").show();		
    });
	$("#accept").click(function(){
		var node = document.getElementById("nodeSel").value;
		var param = document.getElementById("paramSel").value;
		realTime(node,param);
    });
	
	$("#specific").click(function(){
		$("#filter").show();
    });
	
	$("#accept_q").click(function(){
		var node = document.getElementById("nodeSel_q").value;
		var param = document.getElementById("paramSel_q").value;
		var start = Date.parse(document.getElementById("start").value);
		var end = Date.parse(document.getElementById("end").value);
		specificQuery(node,param, start-7200000, end-7200000);
    });
});

