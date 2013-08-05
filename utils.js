(function(){
	'use strict';
	//range, utility function
	//source: http://stackoverflow.com/questions/8273047/javascript-function-similar-to-python-range
	function range(start, stop, step){
		if (typeof stop === 'undefined'){
			stop = start;
			start = 0;
		}
		if (typeof step === 'undefined'){
			step = 1;
		}
		if ((step>0 && start>=stop) || (step<0 && start<=stop)){
			return [];
		}
		var result = [];
		for (var i=start; step>0 ? i<stop : i>stop; i+=step){
			result.push(i);
		}
		return result;
	}
	
	exports.range = range;
})();