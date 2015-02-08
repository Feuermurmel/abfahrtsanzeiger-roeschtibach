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
			[/\s+$/, ''],
			[/^Zürich, /, ''],
			[/ \(SBB\)$/, '']])
	
	var fixProductName = createReplacementFunction(
		[
			[/^S(N?) +[0-9]{5}$/, 'E$1'],
			[/^(SN?) +([0-9]+)$/, '$1$2']])
	
	var dataByStationID = { };
	
	function createRowElements(data) {
		var rowElements = [];
		
		function addRow(station, product, direction, departures) {
			var productName = fixProductName(product);
			var productElement = createElement('span', 'linie', [createElement('span', '', productName)]);
			
			productElement.attr('linie', productName);
			
			var departureElements = departures.map(function (data) {
				var departure = data.departure;
				var delay = departure.estimated - departure.scheduled;
				var remaining = departure.estimated - new Date().getTime();
				var remainingMinutes = Math.ceil(remaining / (60 * 1000));
				
				var abfahrtElements = [remainingMinutes + '\''];
				
			//	if (delay > 0) {
			// 	abfahrtElements.push(createElement('span', 'verspätung', [Math.floor(delay / (60 * 1000))]));
			// }
				
				var element = createElement('span', 'abfahrt', abfahrtElements);
				
				if (remainingMinutes < 3) {
					element.addClass('verpasst');
				} else if (remainingMinutes < 6) {
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
			var noDeparturesCell = createElement('td', '', ['Keine relevanten Abfahrten in der nächsten Stunde.']);
			
			noDeparturesCell.attr('colspan', 3);
			
			rowElements.push(createElement('tr', 'keine-abfahrten', [noDeparturesCell]));
		} else {
			var departuresByStationProductDirection =
				mapValues(
					groupBy(data, function (x) {
						return x.departure.station;
					}),
					function (x) {
						return mapValues(
							groupBy(x, function (x) {
								return x.departure.product;
							}),
							function (x) {
								return mapValues(
									groupBy(x, function (x) {
										return x.departure.direction;
									}),
									function (x) {
										return sortBy(x, function (x) {
											return x.departure.scheduled;
										});
									});
							});
					});
			
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
							function (x) { return x[0].departure.estimated; },
							function (x) { return x[0].departure.product; },
							function (x) { return x[0].departure.direction; }]);
					
					departuresAtStation.forEach(
						function (departures) {
							var product = departures[0].departure.product;
							var direction = departures[0].departure.direction;
							
							addRow(station, product, direction, departures);
						});
				});
		}
		
		return rowElements;
	};
	
	function subscribeStationBoard(stationID, refreshInterval, handleUpdatedData) {
		var departureDataByID = { };
		
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
				function (departures) {
					var newDepartureDataByID = { };
					
					departures.forEach(
						function (departure) {
							var data = departureDataByID[departure.id];
							
							function requestJourney() {
								stationboard.requestJourney(
									departure,
									function (response) {
										data.journey = response;
										
										publishData();
									},
									function (error) {
										console.log(['Error getting journey data.', departure]);
										
										requestJourney();
									});
							}
							
							if (data == null) {
								data = {
									'departure': departure,
									'journey': null };
								
								requestJourney();
							} else {
								data.departure = departure;
							}
							
							newDepartureDataByID[departure.id] = data;
						});
					
					departureDataByID = newDepartureDataByID;
					
					publishData();
					scheduleRefresh();
				},
				function (error) {
					console.log(['Error getting departures.', stationID, error]);
					scheduleRefresh();
				});
		}
		
		refresh();
	};
	
	var refreshInterval = 20000;
	
	var tableRowElementsByStationID = { };
	var filteredDataByStationID = { };
	
	function setupDepartureTable(tableElement, stationID, journeyExclusions) {
		var tableBodyElement = createElement('tbody');
		
		$(tableElement).append(
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
		
		journeyExclusions.forEach(function (x) {
			journeyExclusionsMap[x] = true;
		})
		
		var filteredData = [];
		
		function udpateTable() {
			tableBodyElement.empty().append(createRowElements(filteredData));
		}
		
		subscribeStationBoard(
			stationID,
			refreshInterval,
			function (data) {
				filteredData = data.filter(function (x) {
					return x.journey != null && x.journey.every(function (x) {
						return !journeyExclusionsMap[x.station];
					});
				});
				
				udpateTable();
			});
		
		// Run this on every full minute to update departure states and time remaining.
		scheduleOnInterval(60 * 1000, udpateTable);
	}
	
	setupDepartureTable($('#t1'), 'Zürich, Rosengartenstrasse', []);
	setupDepartureTable($('#t2'), 'Zürich, Wipkingerplatz', []);
	setupDepartureTable($('#t3'), 'Zürich, Escher-Wyss-Platz', ['Zürich, Rosengartenstrasse', 'Zürich, Wipkingerplatz']);
	setupDepartureTable($('#t4'), 'Zürich Wipkingen (SBB)', ['Zürich, Rosengartenstrasse']);
	setupDepartureTable($('#t5'), 'Zürich Hardbrücke (SBB)', ['Zürich, Escher-Wyss-Platz']);
	
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
