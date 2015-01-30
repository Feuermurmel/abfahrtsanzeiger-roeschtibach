$(function () {
	var concat = function (arrays) {
		var res = [];
		
		arrays.map(
			function (x) {
				x.map(
					function (y) {
						res.push(y);
					});
			});
		
		return res;
	}
	
	var createElement = function (tag, clazz, elements) {
		var element = $(document.createElement(tag));
		
		element.addClass(clazz);
		element.append(elements);
		
		return element;
	}
	
	var computeIfAbsent = function (map, key, factory) {
		var value = map[key];
		
		if (value == null) {
			value = factory();
			
			map[key] = value;
		}
		
		return value;
	}
	
	var stationNameReplacemenets = [
		[/^Zürich, /, '']]
	
	var fixStationName = function (stationName) {
		stationNameReplacemenets.map(
			function (x) {
				stationName = stationName.replace(x[0], x[1]);
			});
		
		return stationName;
	}
	
	var dataByStationID = { };
	
	var updateTable = function () {
		var departuresByStationProductDirection = { };
		
		$.each(
			dataByStationID,
			function (stationID, data) {
				data.journey.map(
					function (departureData) {
						var delay = departureData.rt.dlm;
						
						if (delay == '0') {
							delay = null;
						}
						
						var departure = {
							'station': data.stationName,
							'product': departureData.pr,
							'direction': departureData.st,
							'time': departureData.ti,
							'delay': delay };
						
						computeIfAbsent(
							computeIfAbsent(
								computeIfAbsent(
									departuresByStationProductDirection,
									departure.station,
									function () { return { }; }),
								departure.product,
								function () { return { }; }),
							departure.direction,
							function () { return []; }).push(departure);
					});
			});
		
		var currentStation = null;
		
		var createRowElement = function (station, product, direction, departures) {
			var stationText = null;
			
			if (currentStation != station) {
				currentStation = station;
				stationText = fixStationName(station);
			}
			
			var productElement = createElement('span', 'linie', [createElement('span', '', product)]);
			
			productElement.attr('linie', product);
			
			var departureElements = [];
			
			departures.map(
				function (departure) {
					departureElements.push(createElement('span', 'fahrplan', [departure.time]));
					
					var delay = departure.delay;
					
					if (delay != null) {
						departureElements.push(createElement('span', 'verspätung', [delay]))
					}
				});
			
			var cellElements = [
				createElement('th', '', [stationText]),
				createElement('td', '', [productElement]),
				createElement('td', '', [fixStationName(direction)]),
				createElement('td', '', departureElements)]
			
			return createElement('tr', '', cellElements);
		}
		
		var rowElements = [];
		
		$.each(
			departuresByStationProductDirection,
			function (station, departuresByProductDirection) {
				$.each(
					departuresByProductDirection,
					function (product, departuresByDirection) {
						$.each(
							departuresByDirection,
							function (direction, departures) {
								rowElements.push(createRowElement(station, product, direction, departures))
							});
					});
			});
		
		$('table.abfahrten tbody').empty().append(rowElements);
	};
	
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
	
	var startStationBoardRequest = function (stationID) {
		var url = 'http://online.fahrplan.zvv.ch/bin/stboard.exe/dl'
		
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
				dataByStationID[stationID] = window.journeysObj;
				
				updateTable();
			},
			function (error) {
				console.log(['Loading data failed.', url, x]);
			});
	}
	
	// Fernverkehr: '8503020', '8503015'
	var stationIDs = ['8580522', '8591323', '8591437'];
	
	stationIDs.map(startStationBoardRequest);
});
