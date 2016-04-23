internet = (function () {
	'use strict';
	
	var m = { };
	var interval = 1000;
	
	m.setup = function () {
		var currentState = null;
		var failureCount = 0;
		
		function applyState(state) {
			if (state !== currentState) {
				console.log("Setting internet state to " + state + ".")
				
				currentState = state;
				$('body').attr('data-internet', state);
			}
		}
		
		function handleSuccess() {
			failureCount = 0;
			
			applyState(true);
			startRequest();
		}
		
		function handleFailure() {
			startRequest();
			
			failureCount += 1;
			
			if (failureCount > 2) {
				applyState(false);
			}
		}
		
		function startRequest() {
			window.setTimeout(function () {
				stationboard.queueRequest('', null, handleSuccess, handleFailure);
			}, interval);
		}
		
		applyState(true);
		startRequest();
	}
	
	return m;
})();
