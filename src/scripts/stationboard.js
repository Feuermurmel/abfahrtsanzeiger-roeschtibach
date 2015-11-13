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
				url: getEndpoint() + fragment,
				data: data,
				cache: false,
				success: wrapCompletionFunction(success, 200),
				error: wrapCompletionFunction(failure, 5000) });
		});
		
		processQueue();
	}
	
	var requestDepartures = function (stationName, maxResults, success, failure) {
		var fragment = '/bin/stboard.exe/dny'
		
		var data = {
			'tpl': 'stbResult2json',
			'start': '0',
			'maxJourneys': '' + maxResults,
			'input': stationName,
			'boardType': 'dep',
			'nocache': new Date().getTime()
		};
		
		var handleSuccess = function (response) {
			var connections = response.connections;
			
			if (connections == undefined) {
				connections = [];
			}
			
			var departures = connections.map(
				function (x) {
					var dateParts = x.mainLocation.date.split('.');
					var timeParts = x.mainLocation.time.split(':');
					var time = new Date(
						parseInt(dateParts[2]) + 2000,
						parseInt(dateParts[1]) - 1,
						parseInt(dateParts[0]),
						parseInt(timeParts[0]),
						parseInt(timeParts[1]));
					
					var scheduled = time.getTime();
					
					if (x.mainLocation.realTime.hasRealTime) {
						var delay = parseInt(x.mainLocation.realTime.delay) * 60 * 1000;
					} else {
						var delay = false;
					}	
					
					var lastLocation = x.locations[x.locations.length - 1];
					
					// Identifies a departure at a specific station. Used to track data associated with a departure.
					var idData = [
						x.product.name,
						x.product.direction,
						x.mainLocation.time,
						x.mainLocation.date
					]
					
					var line = x.product.line;
					
					if (line == null) {
						line = x.product.name;
					}
					
					return {
						'id': JSON.stringify(idData),
						'trainID': x.trainInfo,
						'station': x.mainLocation.location.name,
						'product': line,
						'direction': x.product.direction,
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
		queueRequest: queueRequest,
		requestDepartures: requestDepartures,
		requestJourney: requestJourney
	};
})();
