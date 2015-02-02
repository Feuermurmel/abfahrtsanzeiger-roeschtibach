$(function () {
	var sortBy = function (list, keyFunctions) {
		var res = list.slice();
		
		res.sort(
			function (a, b) {
				for (var i = 0; i < keyFunctions.length; i += 1) {
					var keyFunction = keyFunctions[i]
					var aKey = keyFunction(a);
					var bKey = keyFunction(b);
					
					if (aKey < bKey) {
						return -1;
					} else if (aKey > bKey) {
						return 1;
					}
				}
				
				return 0;
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
	
	var formatNumber = function (x, width) {
		var res = '' + x;
		
		while (res.length < width) {
			res = '0' + res;
		}
		
		return res;
	}
	
	var formatDate = function (date, parts) {
		if (!(date instanceof Date)) {
			date = new Date(date);
		}
		
		var res = '';
		
		var resultParts = parts.split('').map(
			function (x) {
				if (x == 'y') {
					return formatNumber(date.getFullYear(), 4);
				} else if (x == 'm') {
					return formatNumber(date.getMonth() + 1, 2);
				} else if (x == 'd') {
					return formatNumber(date.getDate(), 2);
				} else if (x == 'H') {
					return formatNumber(date.getHours(), 2);
				} else if (x == 'M') {
					return formatNumber(date.getMinutes(), 2);
				} else if (x == 'S') {
					return formatNumber(date.getSeconds(), 2);
				} else {
					return x;
				}
			});
		
		return resultParts.join('');
	}
	
	var scheduleAt = function (date, action) {
		if (date instanceof Date) {
			date = date.getTime();
		}
		
		var reSchedule = function () {
			var now = new Date().getTime();
			var delay = date - now;
			
			// WebKit os OS X seems to notoriously schedule tasks too early.
			if (delay > 0) {
				setTimeout(reSchedule, delay);
			} else {
				action();
			}
		};
		
		// The task needs to be scheduled at least once to prevent it running before this function returns.
		setTimeout(reSchedule, 0);
	}
	
	var scheduleOnInterval = function (interval, action) {
		var now = new Date().getTime();
		
		var schedule = function (time) {
			scheduleAt(
				time,
				function () {
					schedule(time + interval);
					action();
				});
		}
		
		schedule(now - now % interval);
	}
	
	var createReplacementFunction = function (replacements) {
		return function (name) {
			replacements.map(
				function (x) {
					name = name.replace(x[0], x[1]);
				});
			
			return name;
		}
	}
	
	var fixStationName = createReplacementFunction(
		[
			[/^Zürich, /, ''],
			[/ \(SBB\)$/, '']])
	
	var fixProductName = createReplacementFunction(
		[[/ +/, '']])
	
	var dataByStationID = { };
	
	var updateTable = function () {
		var departuresByStationProductDirection = { };
		
		// Gather departures indexed by station, product and direction.
		$.each(
			dataByStationID,
			function (stationID, data) {
				data.journey.map(
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
						
						var departure = {
							'station': data.stationName,
							'product': departureData.pr,
							'direction': departureData.st,
							'scheduled': scheduled,
							'estimated': scheduled + delay };
						
						var departuresList = computeIfAbsent(
							computeIfAbsent(
								computeIfAbsent(
									departuresByStationProductDirection,
									departure.station,
									function () { return { }; }),
								departure.product,
								function () { return { }; }),
							departure.direction,
							function () { return []; });
						
						departuresList.push(departure);
					});
			});
		
		var currentStation = null;
		
		var createRowElement = function (station, product, direction, departures) {
			var stationText = null;
			
			if (currentStation != station) {
				currentStation = station;
				stationText = fixStationName(station);
			}
			
			var productElement = createElement('span', 'linie', [createElement('span', '', fixProductName(product))]);
			
			productElement.attr('linie', product);
			
			var departureElements = departures.map(
				function (departure) {
					var delay = departure.estimated - departure.scheduled;
					var abfahrtElements = [formatDate(departure.scheduled, 'H:M')];
					var remaining = departure.estimated - new Date().getTime();
					
					if (delay > 0) {
						abfahrtElements.push(createElement('span', 'verspätung', [Math.floor(delay / (60 * 1000))]));
					}
					
					var element = createElement('span', 'abfahrt', abfahrtElements);
					
					if (remaining <= 2 * 60 * 1000) {
						element.addClass('verpasst');
					} else if (remaining <= 5 * 60 * 1000) {
						element.addClass('knapp');
					}
					
					return element;
				});
			
			var cellElements = [
				createElement('th', '', [stationText]),
				createElement('td', '', [productElement]),
				createElement('td', '', [fixStationName(direction)]),
				createElement('td', '', departureElements)];
			
			return createElement('tr', '', cellElements);
		}
		
		var rowElements = [];
		
		$.each(
			departuresByStationProductDirection,
			function (station, departuresByProductDirection) {
				var departuresAtStation = [];
				
				// Gather all groups of departures at this station in a flat list.
				$.each(
					departuresByProductDirection,
					function (product, departuresByDirection) {
						$.each(
							departuresByDirection,
							function (direction, departures) {
								departuresAtStation.push(departures)
							});
					});
				
				departuresAtStation = sortBy(
					departuresAtStation,
					[
						function (x) { return x[0].scheduled; },
						function (x) { return x[0].product; },
						function (x) { return x[0].direction; }]);
				
				departuresAtStation.map(
					function (departures) {
						var product = departures[0].product;
						var direction = departures[0].direction;
						
						rowElements.push(createRowElement(station, product, direction, departures));
					});
			});
		
		$('#abfahrten tbody').empty().append(rowElements);
	};
	
	// Run this on every full minute to update blinking tags and such.
	scheduleOnInterval(60 * 1000, updateTable);
	
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
	
	var updateStationBoardForStation = function (stationID, success, failure) {
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
				if (window.journeysObj == null || window.journeysObj.journey == null) {
					console.log(['Empty data was loaded.', stationID]);
					failure();
				} else {
					dataByStationID[stationID] = window.journeysObj;
					window.journeysObj = null;
					
					updateTable();
					success();
				}
			},
			function (error) {
				console.log(['Loading data failed.', stationID, error]);
				failure();
			});
	}
	
	var stationIDs = ['8580522', '8591323', '8591437', '8503020', '8503015'];
	
	var refreshInterval = 20000;
	
	stationIDs.map(
		function (stationID) {
			var scheduleRefresh = function () {
				window.setTimeout(refresh, refreshInterval);
			}
			
			var refresh = function () {
				updateStationBoardForStation(
					stationID,
					scheduleRefresh,
					scheduleRefresh);
			}
			
			refresh();
		});
	
	// Update clock.
	scheduleOnInterval(
		1000,
		function () {
			$('#current-time').text(formatDate(new Date(), 'y-m-d H:M:S'));
		});
	
	// Toggle blink class.
	scheduleOnInterval(
		800,
		function () {
			$('body').toggleClass('blink-on');
		});
});
