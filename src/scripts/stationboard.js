stationboard = (function () {
	'use strict';
	
	var endpoint = 'http://online.fahrplan.zvv.ch';
	
	var requestQueue = [];
	var requestRunning = false;
	
	var queueRequest = function (fragment, data, success, failure) {
		var processQueue = function () {
			if (!requestRunning) {
				var nextRequest = requestQueue.shift();
				
				if (nextRequest != null) {
				//	requestRunning = true;
					
					$.ajax(nextRequest);
				}
			}
		}
		
		var wrapCompletionFunction = function (completionFunction) {
			return function (response) {
				// Start the next request no earlier than one second after the last one has completed.
				setTimeout(
					function () {
						requestRunning = false;
						processQueue();
					},
					1000);
				
				completionFunction(response);
			}
		}
		
		requestQueue.push(
			{
				'url': endpoint + fragment,
				'data': data,
				'success': wrapCompletionFunction(success),
				'failure': wrapCompletionFunction(failure) });
		
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
		
		var handleSuccess = function (response) {
			try {
				var data = JSON2.parse(response.replace(/^journeysObj = /, ''));
			} catch (error) {
				failure(error);
				
				return;
			}
			
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
						'id': departureData.id,
						'trainID': departureData.trainid,
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
	
	var requestJourney = function (departure, success, failure) {
		var fragment = '/bin/traininfo.exe/dly/' + departure.trainID;
		
		var handleSuccess = function (response) {
			success(
				response.stops.map(
					function (stopData) {
						return {
							'station': stopData.name };
					}));
		}
		
		queueRequest(fragment, { }, handleSuccess, failure);
	}
	
	return {
		'requestDepartures': requestDepartures,
		'requestJourney': requestJourney };
})();
