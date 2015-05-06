hash = (function () {
	'use strict';
	
	function getCurrentValue() {
		var parts = window.location.hash.split('#');
		
		parts = parts[parts.length - 1].split('&');
		
		var res = { };
		
		parts.forEach(function (x) {
			var key = x.split('=', 1)[0];
			
			res[key] = x.substring(key.length + 1);
		});
		
		return res;
	}
	
	function addUpdateHandler(handler) {
		$(window).bind('hashchange', function() {
			handler(getCurrentValue());
		});
	}
	
	return {
		'getCurrentValue': getCurrentValue,
		'addUpdateHandler': addUpdateHandler
	}
})()