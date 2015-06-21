stationboard = (function () {
	'use strict';
	
	var requestQueue = [];
	var requestRunning = false;
	
	function getEndpoint() {
		if (hash.getCurrentValue()['direct'] == undefined) {
			return 'zvv';
		} else {
			return 'http://online.fahrplan.zvv.ch'
		}
	}
	
	function queueRequest(fragment, data, success, failure) {
		var processQueue = function () {
			if (!requestRunning) {
				var nextRequest = requestQueue.shift();
				
				if (nextRequest != null) {
					requestRunning = true;
					
					nextRequest();
				}
			}
		}
		
		var wrapCompletionFunction = function (completionFunction, delay) {
			return function (response) {
				// Start the next request no earlier than one second after the last one has completed.
				setTimeout(
					function () {
						requestRunning = false;
						processQueue();
					},
					delay);
				
				completionFunction(response);
			}
		}
		
		requestQueue.push(function () {
			$.ajax({
				'url': getEndpoint() + fragment,
				'data': data,
				'success': wrapCompletionFunction(success, 200),
				'error': wrapCompletionFunction(failure, 5000) });
		});
		
		processQueue();
	}
	
	var requestDepartures = function (stationID, success, failure) {
		var fragment = '/bin/stboard.exe/dl'
		
		var data = {
			'L': '2014.vs_stbzvv',
			'input': stationID,
			'boardType': 'dep',
			'start': 'yes',
			'requestType': 0,
			'nocache': new Date().getTime() };
		
		var handleSuccess = function (response) {
			try {
				var code = 'var journeysObj;' + response + ';return journeysObj;'
				var data = Function(code)();
			} catch (error) {
				failure(error);
				
				return;
			}
			
			var journeyData = data.journey;
			
			if (journeyData == null) {
				journeyData = [];
			}
			
			var departures = journeyData.map(
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
