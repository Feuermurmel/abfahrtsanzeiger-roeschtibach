stationboard = (function () {
	var endpoint = 'http://online.fahrplan.zvv.ch';
	
	var loadScript = function (url, data, success, failure) {
		var scriptElement = $(document.createElement('script'));
		
		$('head').append(scriptElement);
		
		var cleanup = function () {
			scriptElement.remove();
		}
		
		scriptElement.on(
			'load',
			function () {
				cleanup();
				success();
			});
		
		scriptElement.on(
			'error',
			function (error) {
				cleanup();
				failure(error);
			});
		
		scriptElement.attr('type', 'text/javascript');
		scriptElement.attr('src', url + '?' + $.param(data));
	}
	
	var requestQueue = [];
	var requestRunning = false;
	
	var queueRequest = function (url, data, success, failure) {
		var processQueue = function () {
			if (!requestRunning) {
				var nextRequest = requestQueue.shift();
				
				if (nextRequest != null) {
					requestRunning = true;
					
					nextRequest();
				}
			}
		}
		
		requestQueue.push(
			function () {
				loadScript(
					url,
					data,
					function () {
						success();
						
						requestRunning = false;
						processQueue();
					},
					function (error) {
						failure(error);
						
						requestRunning = false;
						processQueue();
					});
			});
		
		processQueue();
	}
	
	var requestDepartures = function (stationID, success, failure) {
		var url = endpoint + '/bin/stboard.exe/dl'
		
		var data = {
			'L': 'vs_stbzvv',
			'input': stationID,
			'boardType': 'dep',
			'start': 'yes',
			'requestType': '0',
			'nocache': new Date().getTime() };
		
		queueRequest(
			url,
			data,
			function () {
				if (window.journeysObj == null || window.journeysObj.journey == null) {
					failure(['Empty data was loaded.', stationID]);
				} else {
					res = window.journeysObj;
					window.journeysObj = null;
					
					success(res);
				}
			},
			function (error) {
				failure(['Loading data failed.', stationID, error]);
			});
	}
	
	return {
		'requestDepartures': requestDepartures };
})();
