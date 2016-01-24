$(function () {
	'use strict';
	
	var sortBy = function (list, keyFunctions) {
		if (keyFunctions == null) {
			keyFunctions = function (x) { return x };
		}
		
		if (!(keyFunctions instanceof Array)) {
			keyFunctions = [keyFunctions];
		}
		
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
	
	function groupBy(list, keyFunction) {
		var res = { };
		
		list.forEach(function (x) {
			computeIfAbsent(res, keyFunction(x), function () {
				return [];
			}).push(x);
		});
		
		return res;
	}
	
	function mapValues(map, mapFunction) {
		var res = { };
		
		$.each(map, function (k, v) {
			res[k] = mapFunction(v);
		});
		
		return res;
	}
	
	function keys(map) {
		var res = [];
		
		$.each(map, function (x) {
			res.push(x);
		});
		
		return res;
	}
	
	function concat(list) {
		return [].concat.apply([], list);
	}
	
	var createElement = function (tag, clazz, elements) {
		if (clazz == null) {
			clazz = '';
		}
		
		if (elements == null) {
			clazz = [];
		}
		
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
	
	function formatNumber(x, width) {
		var res = '' + x;
		
		while (res.length < width) {
			res = '0' + res;
		}
		
		return res;
	}
	
	function formatDurationMinutes(x, width) {
		var hours = Math.floor(x / 60);
		var minutes = x - hours * 60;
		
		if (hours > 0) {
			return hours + 'h' + formatNumber(minutes, 2);
		} else {
			return minutes + '\'';
		}
	}
	
	function formatDate(date, parts) {
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
			
			// WebKit on OS X seems to notoriously schedule tasks too early.
			if (delay > 0) {
				setTimeout(reSchedule, delay);
			} else {
				action();
			}
		};
		
		// The task needs to be scheduled at least once to prevent it running before this function returns.
		setTimeout(reSchedule, 0);
	}
	
	// Scheudle the specified function `action` to be scheduled wheneer the unix epoch in milliseconds crosses a number divisible by `interval`.
	var scheduleOnInterval = function (interval, action) {
		var reschedule = function () {
			var now = new Date().getTime();
			
			scheduleAt(now - now % interval + interval, reschedule);
			action();
		}
		
		reschedule();
	}
	
	var createReplacementFunction = function (replacements) {
		return function (name) {
			replacements.forEach(
				function (x) {
					name = name.replace(x[0], x[1]);
				});
			
			return name;
		}
	}
	
	var fixStationName = createReplacementFunction(
		[
			['&#252;', 'ü'],
			[/\s+$/, ''],
			[/ N$/, ''],
			[/ \(SBB\)$/, ''],
			[/^Zürich,? /, ''],
			[/^Bahnhof /, ''],
			[/^(Schmiede W)iedikon$/, '$1.'],
			[/^(Regensdorf|Opfikon|Tagelswangen|Unterengstringen), .*$/, '$1'],
			[/^(Herrliberg-Feldm)eilen$/, '$1.']])
	
	var fixProductName = createReplacementFunction(
		[
			[/^[0-9]{5,}$/, 'E'],
			[/^S(N?) +[0-9]{5,}$/, 'E$1'],
			[/^(SN?) +([0-9]+)$/, '$1$2']])
	
	var dataByStationID = { };
	
	// Create and return a set of <tr> elements representing the departures in the specified data.
	// data: Object with `departure` and `journey` elements.
	// remainingTime: Boolean specifying whether to display the demaining time or or the absolute time of a departure.
	// travelTimeMinutes: Minimum time remaining bevore the departure time starts blinking.
	// knappTravelTimeMinutes: Minimum time remaining bevore the departure time is grayed out.
	function createRowElements(data, remainingTime, travelTimeMinutes, knappTravelTimeMinutes) {
		var rowElements = [];
		
		function addRow(product, direction, departures) {
			var productName = fixProductName(product);
			var productElement = createElement('span', 'linie', [createElement('span', '', productName)]);
			
			productElement.attr('linie', productName);
			
			var departureElements = departures.map(function (data) {
				var departure = data.departure;
				var delay = departure.estimated - departure.scheduled;
				var delayMinutes = Math.ceil(delay / (60 * 1000));
				var remaining = departure.estimated - new Date().getTime();
				var remainingMinutes = Math.ceil(remaining / (60 * 1000)) - 1;
				var abfahrtElements = null;
				
				if (remainingTime) {
					if (remainingMinutes < 0) {
						remainingMinutes = 0;
					}
					
					abfahrtElements = [formatDurationMinutes(remainingMinutes)];
				} else {
					abfahrtElements = [formatDate(departure.scheduled, 'H:M')];
					
					if (delayMinutes > 2) {
						abfahrtElements.push(createElement('span', 'verspätung', [delayMinutes]));
					}
				}
				
				var element = createElement('span', 'abfahrt', abfahrtElements);
				
				if (remainingMinutes < knappTravelTimeMinutes) {
					element.addClass('verpasst');
				} else if (remainingMinutes < travelTimeMinutes) {
					element.addClass('knapp');
				}
				
				return element;
			});
			
			var cellElements = [
				createElement('td', '', [productElement]),
				createElement('td', '', [fixStationName(direction)]),
				createElement('td', '', departureElements)];
			
			rowElements.push(createElement('tr', '', cellElements));
		}
		
		if (data.length == 0) {
			var noDeparturesCell = createElement('td', '', ['Keine Abfahrten in den nächsten 2 Stunden.']);
			
			noDeparturesCell.attr('colspan', 3);
			
			rowElements.push(createElement('tr', 'keine-abfahrten', [noDeparturesCell]));
		} else {
			var departuresByProductNameDirection = mapValues(
				groupBy(
					data,
					function (x) {
						return fixProductName(x.departure.product);
					}),
				function (x) {
					return mapValues(
						groupBy(
							x,
							function (y) {
								return y.departure.direction;
							}),
						function (y) {
							return sortBy(
								y,
								function (z) {
									return z.departure.scheduled;
								});
						});
				});
				
			var departuresAtStation = [];
			
			// Gather all groups of departures at this station in a flat list.
			$.each(
				departuresByProductNameDirection,
				function (productName, departuresByDirection) {
					$.each(
						departuresByDirection,
						function (direction, departures) {
							departuresAtStation.push(departures)
						});
				});
			
			departuresAtStation = sortBy(
				departuresAtStation,
				[
					function (x) { return x[0].departure.estimated; },
					function (x) { return x[0].departure.product; },
					function (x) { return x[0].departure.direction; }]);
			
			departuresAtStation.forEach(
				function (departures) {
					var product = departures[0].departure.product;
					var direction = departures[0].departure.direction;
					
					addRow(product, direction, departures);
				});
		}
		
		return rowElements;
	};
	
	function subscribeStationBoard(stationID, requestInterval, refreshInterval, handleUpdatedData) {
		var maxQueriedResults = 1000;
		var departureDataByID = { };
		var resultCountHint = 10;
		
		function publishData() {
			var res = [];
			
			$.each(
				departureDataByID,
				function (_, x) {
					res.push(x);
				});
			
			handleUpdatedData(res);
		}
		
		function refresh() {
			function scheduleRefresh() {
				window.setTimeout(refresh, refreshInterval);
			}
			
			stationboard.requestDepartures(
				stationID,
				Math.min(resultCountHint, maxQueriedResults),
				function (departures) {
					var limitTime = (new Date()).getTime() + requestInterval;
					var resultsCount = departures.length;
					var resultsWithinInterval = 0;
					var newDepartureDataByID = { };
					
					departures.forEach(
						function (departure) {
							function requestJourney() {
								stationboard.requestJourney(
									departure,
									function (response) {
										data.journey = response;
										
										publishData();
									},
									function (error) {
										console.log('Error getting journey data: ' + JSON.stringify(departure) + ': ' + JSON.stringify(error));
										
										requestJourney();
									});
							}
							
							// Filter out departures that are too far in the future.
							if (departure.scheduled < limitTime) {
								var data = departureDataByID[departure.id];
								
								if (data == null) {
									data = {
										'departure': departure,
										'journey': null
									};
									
									requestJourney();
								} else {
									data.departure = departure;
								}
								
								resultsWithinInterval += 1;
								newDepartureDataByID[departure.id] = data;
							};
						});
					
					departureDataByID = newDepartureDataByID;
					
					publishData();
					
					if (resultsWithinInterval < resultsCount) {
						// More results than needed were returned. Use the number of results within the interval to calculate the new hint.
						resultCountHint = resultsWithinInterval + 5;
						scheduleRefresh();
					} else if (resultsCount < resultCountHint) {
						// Fewer results than requested were received. Use the number of returned results as the new hint.
						resultCountHint = resultsCount + 5;
						scheduleRefresh();
					} else {
						// More results within the interval may be returned if queried. Refresh immediately.
						resultCountHint = resultsCount * 2;
						refresh();
					}
				},
				function (error) {
					console.log(['Error getting departures.', stationID, error]);
					scheduleRefresh();
				});
		}
		
		refresh();
	};
	
	var refreshInterval = 20 * 1000;
	var requestInterval = 5 * 60 * 60 * 1000;
	
	var tableRowElementsByStationID = { };
	var filteredDataByStationID = { };
	
	function setupDepartureTable(args) {
		var tableBodyElement = createElement('tbody');
		
		$(args.element).append(
			[
				createElement('col', 'linie', []),
				createElement('col', 'richtung', []),
				createElement('col', 'abfahrten', []),
				createElement(
					'thead',
					'',
					[
						createElement(
							'tr',
							'',
							[
								createElement('td'),
								createElement('td', '', ['Richtung']),
								createElement('td', '', ['Abfahrten'])])]),
				tableBodyElement]);
		
		var journeyExclusionsMap = { };
		
		args.journeyExclusions.forEach(function (x) {
			journeyExclusionsMap[x] = true;
		})
		
		var filteredData = [];
		
		function updateTable() {
			tableBodyElement.empty().append(createRowElements(filteredData, args.remainingTime, args.travelTimeMinutes, args.knappTravelTimeMinutes));
		}
		
		subscribeStationBoard(
			args.stationID,
			requestInterval,
			refreshInterval,
			function (data) {
				filteredData = data.filter(function (x) {
					return x.journey != null && x.journey.every(function (x) {
						return !journeyExclusionsMap[x.station];
					});
				});
				
				updateTable();
			});
		
		// Run this on every full minute to update departure states and time remaining.
		scheduleOnInterval(60 * 1000, updateTable);
	}
	
	setupDepartureTable({
		element: $('#t1'),
		stationID: 'Zürich, Rosengartenstrasse',
		journeyExclusions: [],
		remainingTime: true,
		travelTimeMinutes: 5,
		knappTravelTimeMinutes: 2
	});
	
	setupDepartureTable({
		element: $('#t2'),
		stationID: 'Zürich, Wipkingerplatz',
		journeyExclusions: [],
		remainingTime: true,
		travelTimeMinutes: 5,
		knappTravelTimeMinutes: 2
	});
	
	setupDepartureTable({
		element: $('#t3'),
		stationID: 'Zürich, Escher-Wyss-Platz',
		journeyExclusions: ['Zürich, Rosengartenstrasse', 'Zürich, Wipkingerplatz'],
		remainingTime: true,
		travelTimeMinutes: 8,
		knappTravelTimeMinutes: 4
	});
	
	setupDepartureTable({
		element: $('#t4'),
		stationID: 'Zürich Wipkingen (SBB)',
		journeyExclusions: ['Zürich, Rosengartenstrasse'],
		remainingTime: false,
		travelTimeMinutes: 8,
		knappTravelTimeMinutes: 4
	});
	
	setupDepartureTable({
		element: $('#t5'),
		stationID: 'Zürich Hardbrücke (SBB)',
		journeyExclusions: ['Zürich, Escher-Wyss-Platz'],
		remainingTime: false,
		travelTimeMinutes: 16,
		knappTravelTimeMinutes: 11
	});
	
	// Update clock.
	scheduleOnInterval(
		60 * 1000,
		function () {
			$('#current-time').text(formatDate(new Date(), 'y-m-d H:M'));
		});
	
	function handleHashUpdate(value) {
		var kiosk = value['kiosk'] != undefined;
		
		$('body').toggleClass('kiosk', kiosk);
	}
	
	hash.addUpdateHandler(handleHashUpdate);
	handleHashUpdate(hash.getCurrentValue());
});
