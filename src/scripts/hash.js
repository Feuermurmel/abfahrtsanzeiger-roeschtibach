hash = (function () {
	'use strict';
	
	var m = { }
	
	function computeCurrentValue() {
		var parts = window.location.hash.split('#');
		
		parts = parts[parts.length - 1].split('&');
		
		var res = { };
		
		parts.forEach(function (x) {
			var key = x.split('=', 1)[0];
			
			res[key] = x.substring(key.length + 1);
		});
		
		return res;
	}
	
	var currentValue = computeCurrentValue();
	var updateHandlers = [];
	
	$(window).bind('hashchange', function () {
		currentValue = computeCurrentValue();
		
		updateHandlers.forEach(function (handler) {
			handler(currentValue);
		})
	});
	
	m.addUpdateHandler = function (handler) {
		updateHandlers.push(handler);
	}
	
	m.getCurrentValue = function () {
		return currentValue;
	}
	
	return m;
})();
