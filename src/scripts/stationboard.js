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
		
		var handleSuccess = function (data) {
			var departures = data.journey.map(
				function (departureData) {
					var delayString = departureData.rt.dlm;
					
					if (delayString == null) {
						delayString = '0';
					}
					
					var delay = parseInt(delayString) * 60 * 1000;
					
					var dateParts = departureData.da.split('.');
					var timeParts = departureData.ti.split(':');
					var time = new Date(
						parseInt(dateParts[2]) + 2000,
						parseInt(dateParts[1]) - 1,
						parseInt(dateParts[0]),
						parseInt(timeParts[0]),
						parseInt(timeParts[1]));
					
					var scheduled = time.getTime();
					
					return {
						'station': data.stationName,
						'product': departureData.pr,
						'direction': departureData.st,
						'scheduled': scheduled,
						'estimated': scheduled + delay };
				});
			
			success(departures);
		}
		
		queueRequest(fragment, data, handleSuccess, failure);
	}
	
	return {
		'requestDepartures': requestDepartures };
})();
