mtbf = (function () {
	'use strict';
	
	var interval = 60 * 1000;
	
	function setup(daysElem) {
		daysElem = $(daysElem);
		
		var firstSuccess = null;
		var failureCount = 0;
		
		function handleSuccess() {
			startRequest();
			
			var now = new Date();
			
			if (firstSuccess == null) {
				firstSuccess = now;
			}
			
			failureCount = 0;
			
			var days = (now.getTime() - firstSuccess.getTime()) / (24 * 3600 * 1000);
			
			daysElem.text(Math.floor(days * 10) / 10);
		}
		
		function handleFailure() {
			startRequest();
			
			firstSuccess = null;
			failureCount += 1;
			
			if (failureCount > 3) {
				daysElem.text('Internet? Was ist das?');
			}
		}
		
		function startRequest() {
			window.setTimeout(function () {
				stationboard.queueRequest('', null, handleSuccess, handleFailure);
			}, interval);
		}
		
		startRequest();
	}
	
	return {
		setup: setup
	};
})();
