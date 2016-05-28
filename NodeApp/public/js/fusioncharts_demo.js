$(function(){
$('#dynamictable').append('<table id="myTable"></table>');
var table = $('#dynamictable').children();
var interval = setInterval(function() {
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
