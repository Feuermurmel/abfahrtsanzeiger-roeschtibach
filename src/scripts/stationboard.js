stationboard = (function () {
	var endpoint = 'http://online.fahrplan.zvv.ch';
	
	var requestQueue = [];
	var requestRunning = false;
	
	var queueRequest = function (fragment, data, success, failure) {
		var processQueue = function () {
			if (!requestRunning) {
				var nextRequest = requestQueue.shift();
				
				if (nextRequest != null) {
					requestRunning = true;
					
					$.ajax(nextRequest);
				}
			}
		}
		
		requestQueue.push(
			{
				'url': endpoint + fragment,
				'data': data,
				'success':
					function (data) {
						try {
							var res = JSON2.parse(data.replace(/^journeysObj = /, ''));
						} catch (error) {
							failure(error);
							
							return;
						}
						
						success(res);
						
						requestRunning = false;
						processQueue();
					},
				'failure':
					function (error) {
						failure(error);
						
						requestRunning = false;
						processQueue();
					}
			});
		
		processQueue();
	}
	
	var requestDepartures = function (stationID, success, failure) {
		var fragment = '/bin/stboard.exe/dl'
		
		var data = {
			'L': 'vs_stbzvv',
			'input': stationID,
			'boardType': 'dep',
			'start': 'yes',
			'requestType': '0',
			'nocache': new Date().getTime() };
		
		queueRequest(fragment, data, success, failure);
	}
	
	return {
		'requestDepartures': requestDepartures };
})();
