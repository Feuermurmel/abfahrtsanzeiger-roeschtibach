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
			[/^(S) +([0-9]{5})$/, 'E'],
			[/^(S) +([0-9]+)$/, '$1$2']])
	
	var dataByStationID = { };
	
	function createRowElements(data) {
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
		
		var currentStation = null;
		
		var createRowElement = function (station, product, direction, departures) {
			var stationText = null;
			
			if (currentStation != station) {
				currentStation = station;
				stationText = fixStationName(station);
				
				console.log([station, stationText]);
			}
			
			var productName = fixProductName(product);
			var productElement = createElement('span', 'linie', [createElement('span', '', productName)]);
			
			productElement.attr('linie', productName);
			
			var departureElements = departures.map(function (data) {
				var departure = data.departure;
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
						function (x) { return x[0].departure.scheduled; },
						function (x) { return x[0].departure.product; },
						function (x) { return x[0].departure.direction; }]);
				
				departuresAtStation.forEach(
					function (departures) {
						var product = departures[0].departure.product;
						var direction = departures[0].departure.direction;
						
						rowElements.push(createRowElement(station, product, direction, departures));
					});
			});
		
		return rowElements;
	};
	
	// Run this on every full minute to update blinking tags and such.
	//scheduleOnInterval(60 * 1000, updateTable);
	
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
										console.log(['Could not get journey data.', departure]);
										
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
					console.log([stationID, error]);
					scheduleRefresh();
				});
		}
		
		refresh();
	};
	
	var stationSpecs = [
		{
			'stationID': 'Zürich, Rosengartenstrasse',
			'journeyExclusions': [] },
		{
			'stationID': 'Zürich, Wipkingerplatz',
			'journeyExclusions': [] },
		{
			'stationID': 'Zürich, Escher-Wyss-Platz',
			'journeyExclusions': [
				'Zürich, Rosengartenstrasse',
				'Zürich, Wipkingerplatz'] },
		{
			'stationID': 'Zürich Wipkingen (SBB)',
			'journeyExclusions': [
				'Zürich, Rosengartenstrasse'] },
		{
			'stationID': 'Zürich Hardbrücke (SBB)',
			'journeyExclusions': [
				'Zürich, Escher-Wyss-Platz'] }];
	
	var refreshInterval = 20000;
	
	var tableRowElementsByStationID = { };
	
	function updateTable() {
		$('#abfahrten tbody').empty().append(concat(stationSpecs.map(function (stationSpec) {
			return tableRowElementsByStationID[stationSpec.stationID];
		})));
	}
	
	stationSpecs.forEach(function (stationSpec) {
		var stationID = stationSpec.stationID;
		
		var journeyExclusionsMap = { };
		
		stationSpec.journeyExclusions.forEach(function (x) {
			journeyExclusionsMap[x] = true;
		})
		
		tableRowElementsByStationID[stationID] = [];
		
		subscribeStationBoard(
			stationID,
			refreshInterval,
			function (data) {
				var filteredData = data.filter(function (x) {
					return x.journey != null && x.journey.every(function (x) {
						return !journeyExclusionsMap[x.station];
					});
				});
				
				tableRowElementsByStationID[stationID] = createRowElements(filteredData);
				
				updateTable();
			});
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
