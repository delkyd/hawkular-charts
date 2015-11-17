/**
 * @name  hawkular-charts
 *
 * @description
 *   Base module for rhq-metrics-charts.
 *
 */
angular.module('hawkular.charts', []);

/// <reference path='../../vendor/vendor.d.ts' />
var Charts;
(function (Charts) {
    'use strict';
    var _module = angular.module('hawkular.charts');
    var AvailStatus = (function () {
        function AvailStatus(value) {
            this.value = value;
            // empty
        }
        AvailStatus.prototype.toString = function () {
            return this.value;
        };
        AvailStatus.UP = 'up';
        AvailStatus.DOWN = 'down';
        AvailStatus.UNKNOWN = 'unknown';
        return AvailStatus;
    })();
    Charts.AvailStatus = AvailStatus;
    var TransformedAvailDataPoint = (function () {
        function TransformedAvailDataPoint(start, end, value, startDate, endDate, duration, message) {
            this.start = start;
            this.end = end;
            this.value = value;
            this.startDate = startDate;
            this.endDate = endDate;
            this.duration = duration;
            this.message = message;
            this.duration = moment(end).from(moment(start), true);
            this.startDate = new Date(start);
            this.endDate = new Date(end);
        }
        return TransformedAvailDataPoint;
    })();
    Charts.TransformedAvailDataPoint = TransformedAvailDataPoint;
    var AvailabilityChartDirective = (function () {
        function AvailabilityChartDirective($rootScope) {
            var _this = this;
            this.restrict = 'E';
            this.replace = true;
            // Can't use 1.4 directive controllers because we need to support 1.3+
            this.scope = {
                data: '=',
                startTimestamp: '@',
                endTimestamp: '@',
                chartHeight: '@',
                timeLabel: '@',
                dateLabel: '@',
                noDataLabel: '@',
                chartTitle: '@'
            };
            this.link = function (scope, element, attrs) {
                // data specific vars
                var startTimestamp = +attrs.startTimestamp, endTimestamp = +attrs.endTimestamp, chartHeight = +attrs.chartHeight || 150, noDataLabel = attrs.noDataLabel || 'No Data';
                // chart specific vars
                var margin = { top: 10, right: 5, bottom: 5, left: 90 }, width = 750 - margin.left - margin.right, adjustedChartHeight = chartHeight - 50, height = adjustedChartHeight - margin.top - margin.bottom, titleHeight = 30, titleSpace = 10, innerChartHeight = height + margin.top - titleHeight - titleSpace, adjustedChartHeight2 = +titleHeight + titleSpace + margin.top, yScale, timeScale, yAxis, xAxis, xAxisGroup, brush, brushGroup, tip, timeScaleForBrush, chart, chartParent, svg;
                function getChartWidth() {
                    ///return angular.element('#' + chartContext.chartHandle).width();
                    return 760;
                }
                function buildAvailHover(d) {
                    return "<div class='chartHover'>\n        <div>\n        <small>\n          <span class='chartHoverLabel'>Status: </span><span>: </span>\n          <span class='chartHoverValue'>" + d.value.toUpperCase() + "</span>\n        </small>\n        </div>\n          <div>\n          <small>\n            <span class='chartHoverLabel'>Duration</span><span>: </span>\n            <span class='chartHoverValue'>" + d.duration + "</span>\n          </small>\n          </div>\n        </div>";
                }
                function oneTimeChartSetup() {
                    // destroy any previous charts
                    if (chart) {
                        chartParent.selectAll('*').remove();
                    }
                    chartParent = d3.select(element[0]);
                    chart = chartParent.append('svg')
                        .attr('viewBox', '0 0 760 150').attr('preserveAspectRatio', 'xMinYMin meet');
                    tip = d3.tip()
                        .attr('class', 'd3-tip')
                        .offset([-10, 0])
                        .html(function (d) {
                        return buildAvailHover(d);
                    });
                    svg = chart.append('g')
                        .attr('width', width + margin.left + margin.right)
                        .attr('height', innerChartHeight)
                        .attr('transform', 'translate(' + margin.left + ',' + (adjustedChartHeight2) + ')');
                    svg.append('defs')
                        .append('pattern')
                        .attr('id', 'diagonal-stripes')
                        .attr('patternUnits', 'userSpaceOnUse')
                        .attr('patternTransform', 'scale(0.7)')
                        .attr('width', 4)
                        .attr('height', 4)
                        .append('path')
                        .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
                        .attr('stroke', '#B6B6B6')
                        .attr('stroke-width', 1.2);
                    svg.call(tip);
                }
                function determineAvailScale(transformedAvailDataPoint) {
                    var adjustedTimeRange = [];
                    startTimestamp = +attrs.startTimestamp || d3.min(transformedAvailDataPoint, function (d) {
                        return d.start;
                    }) || +moment().subtract(1, 'hour');
                    if (transformedAvailDataPoint && transformedAvailDataPoint.length > 0) {
                        adjustedTimeRange[0] = startTimestamp;
                        adjustedTimeRange[1] = +moment(); // @TODO: Fix when we support end != now
                        yScale = d3.scale.linear()
                            .clamp(true)
                            .rangeRound([70, 0])
                            .domain([0, 175]);
                        yAxis = d3.svg.axis()
                            .scale(yScale)
                            .ticks(0)
                            .tickSize(0, 0)
                            .orient('left');
                        timeScale = d3.time.scale()
                            .range([0, width])
                            .domain(adjustedTimeRange);
                        xAxis = d3.svg.axis()
                            .scale(timeScale)
                            .tickSize(-70, 0)
                            .orient('top')
                            .tickFormat(d3.time.format.multi([
                            [".%L", function (d) {
                                    return d.getMilliseconds();
                                }],
                            [":%S", function (d) {
                                    return d.getSeconds();
                                }],
                            ["%H:%M", function (d) {
                                    return d.getMinutes();
                                }],
                            ["%H:%M", function (d) {
                                    return d.getHours();
                                }],
                            ["%a %d", function (d) {
                                    return d.getDay() && d.getDate() != 1;
                                }],
                            ["%b %d", function (d) {
                                    return d.getDate() != 1;
                                }],
                            ["%B", function (d) {
                                    return d.getMonth();
                                }],
                            ["%Y", function () {
                                    return true;
                                }]
                        ]));
                    }
                }
                function isUp(d) {
                    return d.value === AvailStatus.UP.toString();
                }
                function isDown(d) {
                    return d.value === AvailStatus.DOWN.toString();
                }
                function isUnknown(d) {
                    return d.value === AvailStatus.UNKNOWN.toString();
                }
                function formatTransformedDataPoints(inAvailData) {
                    var outputData = [];
                    var itemCount = inAvailData.length;
                    function sortByTimestamp(a, b) {
                        if (a.timestamp < b.timestamp)
                            return -1;
                        if (a.timestamp > b.timestamp)
                            return 1;
                        return 0;
                    }
                    inAvailData.sort(sortByTimestamp);
                    if (inAvailData && itemCount > 0 && inAvailData[0].timestamp) {
                        var now = new Date().getTime();
                        if (itemCount === 1) {
                            var availItem = inAvailData[0];
                            // we only have one item with start time. Assume unknown for the time before (last 1h)
                            // @TODO adjust to time picker
                            outputData.push(new TransformedAvailDataPoint(now - 60 * 60 * 1000, availItem.timestamp, AvailStatus.UNKNOWN.toString()));
                            // and the determined value up until the end.
                            outputData.push(new TransformedAvailDataPoint(availItem.timestamp, now, availItem.value));
                        }
                        else {
                            var backwardsEndTime = now;
                            for (var i = inAvailData.length; i > 0; i--) {
                                // if we have data starting in the future... discard it
                                //if (inAvailData[i - 1].timestamp > +moment()) {
                                //  continue;
                                //}
                                if (startTimestamp >= inAvailData[i - 1].timestamp) {
                                    outputData.push(new TransformedAvailDataPoint(startTimestamp, backwardsEndTime, inAvailData[i - 1].value));
                                    break;
                                }
                                else {
                                    outputData.push(new TransformedAvailDataPoint(inAvailData[i - 1].timestamp, backwardsEndTime, inAvailData[i - 1].value));
                                    backwardsEndTime = inAvailData[i - 1].timestamp;
                                }
                            }
                        }
                    }
                    return outputData;
                }
                function createSideYAxisLabels() {
                    ///@Todo: move out to stylesheet
                    svg.append('text')
                        .attr('class', 'availUpLabel')
                        .attr('x', -10)
                        .attr('y', 25)
                        .style('font-family', 'Arial, Verdana, sans-serif;')
                        .style('font-size', '12px')
                        .attr('fill', '#999')
                        .style('text-anchor', 'end')
                        .text('Up');
                    svg.append('text')
                        .attr('class', 'availDownLabel')
                        .attr('x', -10)
                        .attr('y', 55)
                        .style('font-family', 'Arial, Verdana, sans-serif;')
                        .style('font-size', '12px')
                        .attr('fill', '#999')
                        .style('text-anchor', 'end')
                        .text('Down');
                }
                function createAvailabilityChart(transformedAvailDataPoint) {
                    var xAxisMin = d3.min(transformedAvailDataPoint, function (d) {
                        return +d.start;
                    }), xAxisMax = d3.max(transformedAvailDataPoint, function (d) {
                        return +d.end;
                    });
                    var availTimeScale = d3.time.scale()
                        .range([0, width])
                        .domain([startTimestamp, xAxisMax]), yScale = d3.scale.linear()
                        .clamp(true)
                        .range([height, 0])
                        .domain([0, 4]), availXAxis = d3.svg.axis()
                        .scale(availTimeScale)
                        .ticks(8)
                        .tickSize(13, 0)
                        .orient('top');
                    // For each datapoint calculate the Y offset for the bar
                    // Up or Unknown: offset 0, Down: offset 35
                    function calcBarY(d) {
                        return height - yScale(0) + ((isUp(d) || isUnknown(d)) ? 0 : 35);
                    }
                    // For each datapoint calculate the Y removed height for the bar
                    // Unknown: full height 15, Up or Down: half height, 50
                    function calcBarHeight(d) {
                        return yScale(0) - (isUnknown(d) ? 15 : 50);
                    }
                    function calcBarFill(d) {
                        if (isUp(d)) {
                            return '#54A24E'; // green
                        }
                        else if (isUnknown(d)) {
                            return 'url(#diagonal-stripes)'; // gray stripes
                        }
                        else {
                            return '#D85054'; // red
                        }
                    }
                    svg.selectAll('rect.availBars')
                        .data(transformedAvailDataPoint)
                        .enter().append('rect')
                        .attr('class', 'availBars')
                        .attr('x', function (d) {
                        return availTimeScale(+d.start);
                    })
                        .attr('y', function (d) {
                        return calcBarY(d);
                    })
                        .attr('height', function (d) {
                        return calcBarHeight(d);
                    })
                        .attr('width', function (d) {
                        return availTimeScale(+d.end) - availTimeScale(+d.start);
                    })
                        .attr('fill', function (d) {
                        return calcBarFill(d);
                    })
                        .attr('opacity', function () {
                        return 0.85;
                    })
                        .on('mouseover', function (d, i) {
                        tip.show(d, i);
                    }).on('mouseout', function () {
                        tip.hide();
                    });
                    // The bottom line of the availability chart
                    svg.append('line')
                        .attr("x1", 0)
                        .attr("y1", 70)
                        .attr("x2", 655)
                        .attr("y2", 70)
                        .attr("stroke-width", 0.5)
                        .attr("stroke", "#D0D0D0");
                    createSideYAxisLabels();
                }
                function createXandYAxes() {
                    svg.selectAll('g.axis').remove();
                    // create x-axis
                    xAxisGroup = svg.append('g')
                        .attr('class', 'x axis')
                        .call(xAxis);
                    // create y-axis
                    svg.append('g')
                        .attr('class', 'y axis')
                        .call(yAxis);
                }
                function createXAxisBrush() {
                    brush = d3.svg.brush()
                        .x(timeScale)
                        .on('brushstart', brushStart)
                        .on('brushend', brushEnd);
                    xAxisGroup.append('g')
                        .attr('class', 'x brush')
                        .call(brush)
                        .selectAll('rect')
                        .attr('y', 0)
                        .attr('height', 70);
                    brushGroup = svg.append('g')
                        .attr('class', 'brush')
                        .call(brush);
                    brushGroup.selectAll('.resize').append('path');
                    brushGroup.selectAll('rect')
                        .attr('height', 70);
                    function brushStart() {
                        svg.classed('selecting', true);
                    }
                    function brushEnd() {
                        var extent = brush.extent(), startTime = Math.round(extent[0].getTime()), endTime = Math.round(extent[1].getTime()), dragSelectionDelta = endTime - startTime;
                        //svg.classed('selecting', !d3.event.target.empty());
                        if (dragSelectionDelta >= 60000) {
                            console.log('Drag: AvailTimeRangeChanged:' + extent);
                            $rootScope.$broadcast(Charts.EventNames.AVAIL_CHART_TIMERANGE_CHANGED.toString(), extent);
                        }
                        brushGroup.call(brush.clear());
                    }
                }
                scope.$watchCollection('data', function (newData) {
                    console.log('Avail Chart Data Changed');
                    if (newData) {
                        _this.transformedDataPoints = formatTransformedDataPoints(angular.fromJson(newData));
                        scope.render(_this.transformedDataPoints);
                    }
                });
                scope.$watchGroup(['startTimestamp', 'endTimestamp'], function (newTimestamp) {
                    console.log('Avail Chart Start/End Timestamp Changed');
                    startTimestamp = newTimestamp[0] || startTimestamp;
                    endTimestamp = newTimestamp[1] || endTimestamp;
                    scope.render(_this.transformedDataPoints);
                });
                scope.render = function (transformedAvailDataPoint) {
                    console.log('Starting Avail Chart Directive Render');
                    if (transformedAvailDataPoint && transformedAvailDataPoint.length > 0) {
                        console.group('Render Avail Chart');
                        console.time('availChartRender');
                        ///NOTE: layering order is important!
                        oneTimeChartSetup();
                        determineAvailScale(transformedAvailDataPoint);
                        createXandYAxes();
                        createAvailabilityChart(transformedAvailDataPoint);
                        createXAxisBrush();
                        console.timeEnd('availChartRender');
                        console.groupEnd();
                    }
                };
            };
        }
        AvailabilityChartDirective.Factory = function () {
            var directive = function ($rootScope) {
                return new AvailabilityChartDirective($rootScope);
            };
            directive['$inject'] = ['$rootScope'];
            return directive;
        };
        return AvailabilityChartDirective;
    })();
    Charts.AvailabilityChartDirective = AvailabilityChartDirective;
    _module.directive('availabilityChart', AvailabilityChartDirective.Factory());
})(Charts || (Charts = {}));

/// <reference path='../../vendor/vendor.d.ts' />
var Charts;
(function (Charts) {
    'use strict';
    var _module = angular.module('hawkular.charts');
    var ContextChartDirective = (function () {
        function ContextChartDirective($rootScope) {
            var _this = this;
            this.restrict = 'E';
            this.replace = true;
            // Can't use 1.4 directive controllers because we need to support 1.3+
            this.scope = {
                data: '='
            };
            this.link = function (scope, element, attrs) {
                var margin = { top: 10, right: 5, bottom: 5, left: 90 };
                // data specific vars
                var chartHeight = +attrs.chartHeight || ContextChartDirective._CHART_HEIGHT, width = ContextChartDirective._CHART_WIDTH - margin.left - margin.right, height = chartHeight - margin.top - margin.bottom, innerChartHeight = height + margin.top, yScale, yAxis, yAxisGroup, timeScale, xAxis, xAxisGroup, brush, brushGroup, chart, chartParent, svg;
                function setup() {
                    // destroy any previous charts
                    if (chart) {
                        chartParent.selectAll('*').remove();
                    }
                    chartParent = d3.select(element[0]);
                    chart = chartParent.append('svg')
                        .attr('viewBox', '0 0 750 100').attr('preserveAspectRatio', 'xMinYMin meet');
                    svg = chart.append('g')
                        .attr('width', width + margin.left + margin.right)
                        .attr('height', innerChartHeight)
                        .attr('transform', 'translate(' + margin.left + ',' + height + ')');
                }
                function createContextChart(dataPoints) {
                    console.log('dataPoints.length: ' + dataPoints.length);
                    timeScale = d3.time.scale()
                        .range([0, width - 10])
                        .domain([dataPoints[0].timestamp, dataPoints[dataPoints.length - 1].timestamp]);
                    xAxis = d3.svg.axis()
                        .scale(timeScale)
                        .ticks(10)
                        .tickSize(4, 0)
                        .orient('bottom');
                    svg.selectAll('g.axis').remove();
                    xAxisGroup = svg.append('g')
                        .attr('class', 'x axis')
                        .attr('transform', 'translate(0,' + height + ')')
                        .call(xAxis);
                    var yMin = d3.min(dataPoints, function (d) {
                        return d.avg;
                    });
                    var yMax = d3.max(dataPoints, function (d) {
                        return d.avg;
                    });
                    // give a pad of % to min/max so we are not against x-axis
                    yMax = yMax + (yMax * 0.03);
                    yMin = yMin - (yMin * 0.05);
                    yScale = d3.scale.linear()
                        .rangeRound([90, 0])
                        .domain([yMin, yMax]);
                    yAxis = d3.svg.axis()
                        .scale(yScale)
                        .ticks(3)
                        .tickSize(4, 0)
                        .orient("left");
                    yAxisGroup = svg.append('g')
                        .attr('class', 'y axis')
                        .call(yAxis);
                    var area = d3.svg.area()
                        .interpolate('cardinal')
                        .defined(function (d) {
                        return !d.empty;
                    })
                        .x(function (d) {
                        return timeScale(d.timestamp);
                    })
                        .y0(function (d) {
                        return height;
                    })
                        .y1(function (d) {
                        return yScale(d.avg);
                    });
                    var contextLine = d3.svg.line()
                        .interpolate('cardinal')
                        .defined(function (d) {
                        return !d.empty;
                    })
                        .x(function (d) {
                        return timeScale(d.timestamp);
                    })
                        .y(function (d) {
                        return yScale(d.avg);
                    });
                    var pathContextLine = svg.selectAll('path.contextLine').data([dataPoints]);
                    // update existing
                    pathContextLine.attr('class', 'contextLine')
                        .transition()
                        .attr('d', contextLine);
                    // add new ones
                    pathContextLine.enter().append('path')
                        .attr('class', 'contextLine')
                        .transition()
                        .attr('d', contextLine);
                    // remove old ones
                    pathContextLine.exit().remove();
                    var contextArea = svg.append("g")
                        .attr("class", "context");
                    contextArea.append("path")
                        .datum(dataPoints)
                        .transition()
                        .duration(500)
                        .attr("class", "contextArea")
                        .attr("d", area);
                }
                function createXAxisBrush() {
                    brush = d3.svg.brush()
                        .x(timeScale)
                        .on('brushstart', contextBrushStart)
                        .on('brushend', contextBrushEnd);
                    xAxisGroup.append('g')
                        .selectAll('rect')
                        .attr('y', 0)
                        .attr('height', height - 10);
                    brushGroup = svg.append('g')
                        .attr('class', 'brush')
                        .call(brush);
                    brushGroup.selectAll('.resize').append('path');
                    brushGroup.selectAll('rect')
                        .attr('height', 85);
                    function contextBrushStart() {
                        svg.classed('selecting', true);
                    }
                    function contextBrushEnd() {
                        var brushExtent = brush.extent(), startTime = Math.round(brushExtent[0].getTime()), endTime = Math.round(brushExtent[1].getTime()), dragSelectionDelta = endTime - startTime;
                        /// We ignore drag selections under a minute
                        if (dragSelectionDelta >= 60000) {
                            console.log('Drag: ContextChartTimeRangeChanged:' + brushExtent);
                            $rootScope.$broadcast(Charts.EventNames.CONTEXT_CHART_TIMERANGE_CHANGED.toString(), brushExtent);
                        }
                        //brushGroup.call(brush.clear());
                    }
                }
                scope.$watchCollection('data', function (newData) {
                    console.log('Context Chart Data Changed');
                    if (newData) {
                        _this.dataPoints = formatBucketedChartOutput(angular.fromJson(newData));
                        scope.render(_this.dataPoints);
                    }
                });
                function formatBucketedChartOutput(response) {
                    //  The schema is different for bucketed output
                    if (response) {
                        return response.map(function (point) {
                            var timestamp = point.timestamp || (point.start + (point.end - point.start) / 2);
                            return {
                                timestamp: timestamp,
                                //date: new Date(timestamp),
                                value: !angular.isNumber(point.value) ? undefined : point.value,
                                avg: (point.empty) ? undefined : point.avg,
                                min: !angular.isNumber(point.min) ? undefined : point.min,
                                max: !angular.isNumber(point.max) ? undefined : point.max,
                                empty: point.empty
                            };
                        });
                    }
                }
                scope.render = function (dataPoints) {
                    if (dataPoints && dataPoints.length > 0) {
                        console.group('Render Context Chart');
                        console.time('contextChartRender');
                        ///NOTE: layering order is important!
                        setup();
                        createContextChart(dataPoints);
                        createXAxisBrush();
                        console.timeEnd('contextChartRender');
                        console.groupEnd();
                    }
                };
            };
        }
        ContextChartDirective.Factory = function () {
            var directive = function ($rootScope) {
                return new ContextChartDirective($rootScope);
            };
            directive['$inject'] = ['$rootScope'];
            return directive;
        };
        ContextChartDirective._CHART_WIDTH = 750;
        ContextChartDirective._CHART_HEIGHT = 100;
        return ContextChartDirective;
    })();
    Charts.ContextChartDirective = ContextChartDirective;
    _module.directive('contextChart', ContextChartDirective.Factory());
})(Charts || (Charts = {}));

///
/// Copyright 2015 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///    http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///
var Charts;
(function (Charts) {
    'use strict';
    /// NOTE: this pattern is used because enums cant be used with strings
    var EventNames = (function () {
        function EventNames(value) {
            this.value = value;
            // empty
        }
        EventNames.prototype.toString = function () {
            return this.value;
        };
        EventNames.CHART_TIMERANGE_CHANGED = new EventNames('ChartTimeRangeChanged');
        EventNames.AVAIL_CHART_TIMERANGE_CHANGED = new EventNames('AvailChartTimeRangeChanged');
        EventNames.CONTEXT_CHART_TIMERANGE_CHANGED = new EventNames('ContextChartTimeRangeChanged');
        return EventNames;
    })();
    Charts.EventNames = EventNames;
})(Charts || (Charts = {}));

/// <reference path='../../vendor/vendor.d.ts' />
var Charts;
(function (Charts) {
    'use strict';
    var debug = false;
    // the scale to use for y-axis when all values are 0, [0, DEFAULT_Y_SCALE]
    var DEFAULT_Y_SCALE = 10;
    /**
     * Defines an individual alert bounds  to be visually highlighted in a chart
     * that an alert was above/below a threshold.
     */
    var AlertBound = (function () {
        function AlertBound(startTimestamp, endTimestamp, alertValue) {
            this.startTimestamp = startTimestamp;
            this.endTimestamp = endTimestamp;
            this.alertValue = alertValue;
            this.startDate = new Date(startTimestamp);
            this.endDate = new Date(endTimestamp);
        }
        return AlertBound;
    })();
    /**
     * @ngdoc directive
     * @name hawkularChart
     * @description A d3 based charting direction to provide charting using various styles of charts.
     *
     */
    angular.module('hawkular.charts')
        .directive('hawkularChart', ['$rootScope', '$http', '$interval', '$log',
        function ($rootScope, $http, $interval, $log) {
            /// only for the stand alone charts
            var BASE_URL = '/hawkular/metrics';
            function link(scope, element, attrs) {
                // data specific vars
                var dataPoints = [], multiDataPoints, dataUrl = attrs.metricUrl, metricId = attrs.metricId || '', metricTenantId = attrs.metricTenantId || '', metricType = attrs.metricType || 'gauge', timeRangeInSeconds = +attrs.timeRangeInSeconds || 43200, refreshIntervalInSeconds = +attrs.refreshIntervalInSeconds || 3600, alertValue = +attrs.alertValue, interpolation = attrs.interpolation || 'monotone', endTimestamp = Date.now(), startTimestamp = endTimestamp - timeRangeInSeconds, previousRangeDataPoints = [], annotationData = [], contextData = [], multiChartOverlayData = [], chartHeight = +attrs.chartHeight || 250, chartType = attrs.chartType || 'hawkularline', timeLabel = attrs.timeLabel || 'Time', dateLabel = attrs.dateLabel || 'Date', singleValueLabel = attrs.singleValueLabel || 'Raw Value', noDataLabel = attrs.noDataLabel || 'No Data', aggregateLabel = attrs.aggregateLabel || 'Aggregate', startLabel = attrs.startLabel || 'Start', endLabel = attrs.endLabel || 'End', durationLabel = attrs.durationLabel || 'Interval', minLabel = attrs.minLabel || 'Min', maxLabel = attrs.maxLabel || 'Max', avgLabel = attrs.avgLabel || 'Avg', timestampLabel = attrs.timestampLabel || 'Timestamp', showAvgLine = true, showDataPoints = false, hideHighLowValues = false, useZeroMinValue = false, chartHoverDateFormat = attrs.chartHoverDateFormat || '%m/%d/%y', chartHoverTimeFormat = attrs.chartHoverTimeFormat || '%I:%M:%S %p', buttonBarDateTimeFormat = attrs.buttonbarDatetimeFormat || 'MM/DD/YYYY h:mm a';
                // chart specific vars
                var margin = { top: 10, right: 5, bottom: 5, left: 90 }, contextMargin = { top: 150, right: 5, bottom: 5, left: 90 }, xAxisContextMargin = { top: 190, right: 5, bottom: 5, left: 90 }, width = 750 - margin.left - margin.right, adjustedChartHeight = chartHeight - 50, height = adjustedChartHeight - margin.top - margin.bottom, smallChartThresholdInPixels = 600, titleHeight = 30, titleSpace = 10, innerChartHeight = height + margin.top - titleHeight - titleSpace + margin.bottom, adjustedChartHeight2 = +titleHeight + titleSpace + margin.top, barOffset = 2, chartData, calcBarWidth, calcBarWidthAdjusted, calcBarXPos, yScale, timeScale, yAxis, xAxis, tip, brush, brushGroup, timeScaleForBrush, timeScaleForContext, chart, chartParent, context, contextArea, svg, lowBound, highBound, avg, peak, min, processedNewData, processedPreviousRangeData;
                var hasInit = false;
                dataPoints = attrs.data;
                showDataPoints = attrs.showDataPoints;
                previousRangeDataPoints = attrs.previousRangeData;
                multiChartOverlayData = attrs.multiChartOverlayData;
                annotationData = attrs.annotationData;
                contextData = attrs.contextData;
                var startIntervalPromise;
                function xMidPointStartPosition(d) {
                    return timeScale(d.timestamp);
                }
                function getChartWidth() {
                    //return angular.element('#' + chartContext.chartHandle).width();
                    return 760;
                }
                function useSmallCharts() {
                    return getChartWidth() <= smallChartThresholdInPixels;
                }
                function initialization() {
                    // destroy any previous charts
                    if (chart) {
                        chartParent.selectAll('*').remove();
                    }
                    chartParent = d3.select(element[0]);
                    chart = chartParent.append('svg')
                        .attr('viewBox', '0 0 760 ' + (chartHeight + 25)).attr('preserveAspectRatio', 'xMinYMin meet');
                    createSvgDefs(chart);
                    svg = chart.append('g')
                        .attr('width', width + margin.left + margin.right)
                        .attr('height', innerChartHeight)
                        .attr('transform', 'translate(' + margin.left + ',' + (adjustedChartHeight2) + ')');
                    tip = d3.tip()
                        .attr('class', 'd3-tip')
                        .offset([-10, 0])
                        .html(function (d, i) {
                        return buildHover(d, i);
                    });
                    svg.call(tip);
                    // a placeholder for the alerts
                    svg.append('g').attr('class', 'alertHolder');
                    hasInit = true;
                }
                function setupFilteredData(dataPoints) {
                    var alertPeak, highPeak;
                    function determineMultiMetricMinMax() {
                        var currentMax, currentMin, seriesMax, seriesMin, maxList = [], minList = [];
                        multiChartOverlayData.forEach(function (series) {
                            currentMax = d3.max(series.map(function (d) {
                                return !isEmptyDataPoint(d) ? (d.avg || d.value) : 0;
                            }));
                            maxList.push(currentMax);
                            currentMin = d3.min(series.map(function (d) {
                                return !isEmptyDataPoint(d) ? (d.avg || d.value) : Number.MAX_VALUE;
                            }));
                            minList.push(currentMin);
                        });
                        seriesMax = d3.max(maxList);
                        seriesMin = d3.min(minList);
                        return [seriesMin, seriesMax];
                    }
                    if (multiChartOverlayData) {
                        var minMax = determineMultiMetricMinMax();
                        peak = minMax[1];
                        min = minMax[0];
                    }
                    if (dataPoints) {
                        peak = d3.max(dataPoints.map(function (d) {
                            return !isEmptyDataPoint(d) ? (d.avg || d.value) : 0;
                        }));
                        min = d3.min(dataPoints.map(function (d) {
                            return !isEmptyDataPoint(d) ? (d.avg || d.value) : undefined;
                        }));
                    }
                    lowBound = useZeroMinValue ? 0 : min - (min * 0.05);
                    if (alertValue) {
                        alertPeak = (alertValue * 1.2);
                        highPeak = peak + ((peak - min) * 0.2);
                        highBound = alertPeak > highPeak ? alertPeak : highPeak;
                    }
                    else {
                        highBound = peak + ((peak - min) * 0.2);
                    }
                    highBound = !!!highBound && !!!lowBound ? DEFAULT_Y_SCALE : highBound;
                }
                function determineScale(dataPoints) {
                    var xTicks, xTickSubDivide, numberOfBarsForSmallGraph = 20;
                    if (dataPoints.length > 0) {
                        // if window is too small server up small chart
                        if (useSmallCharts()) {
                            width = 250;
                            xTicks = 3;
                            xTickSubDivide = 2;
                            chartData = dataPoints.slice(dataPoints.length - numberOfBarsForSmallGraph, dataPoints.length);
                        }
                        else {
                            //  we use the width already defined above
                            xTicks = 9;
                            xTickSubDivide = 5;
                            chartData = dataPoints;
                        }
                        setupFilteredData(dataPoints);
                        calcBarWidth = function () {
                            return (width / chartData.length - barOffset);
                        };
                        // Calculates the bar width adjusted so that the first and last are half-width of the others
                        // see https://issues.jboss.org/browse/HAWKULAR-809 for info on why this is needed
                        calcBarWidthAdjusted = function (i) {
                            return (i === 0 || i === chartData.length - 1) ? calcBarWidth() / 2 : calcBarWidth();
                        };
                        // Calculates the bar X position. When using calcBarWidthAdjusted, it is required to push bars
                        // other than the first half bar to the left, to make up for the first being just half width
                        calcBarXPos = function (d, i) {
                            return timeScale(d.timestamp) - (i === 0 ? 0 : calcBarWidth() / 2);
                        };
                        yScale = d3.scale.linear()
                            .clamp(true)
                            .rangeRound([height, 0])
                            .domain([lowBound, highBound]);
                        yAxis = d3.svg.axis()
                            .scale(yScale)
                            .ticks(5)
                            .tickSize(4, 4, 0)
                            .orient('left');
                        timeScale = d3.time.scale()
                            .range([0, width])
                            .domain(d3.extent(chartData, function (d) {
                            return d.timestamp;
                        }));
                        if (contextData) {
                            timeScaleForContext = d3.time.scale()
                                .range([0, width])
                                .domain(d3.extent(contextData, function (d) {
                                return d.timestamp;
                            }));
                        }
                        else {
                            timeScaleForBrush = d3.time.scale()
                                .range([0, width])
                                .domain(d3.extent(chartData, function (d) {
                                return d.timestamp;
                            }));
                        }
                        xAxis = d3.svg.axis()
                            .scale(timeScale)
                            .ticks(xTicks)
                            .tickFormat(d3.time.format('%H:%M'))
                            .tickSize(4, 4, 0)
                            .orient('bottom');
                    }
                }
                function setupFilteredMultiData(multiDataPoints) {
                    var alertPeak, highPeak, highbound, lowbound;
                    function determineMultiDataMinMax() {
                        var currentMax, currentMin, seriesMax, seriesMin, maxList = [], minList = [];
                        multiDataPoints.forEach(function (series) {
                            currentMax = d3.max(series.values.map(function (d) {
                                return isEmptyDataPoint(d) ? 0 : d.avg;
                            }));
                            maxList.push(currentMax);
                            currentMin = d3.min(series.values.map(function (d) {
                                return !isEmptyDataPoint(d) ? d.avg : Number.MAX_VALUE;
                            }));
                            minList.push(currentMin);
                        });
                        seriesMax = d3.max(maxList);
                        seriesMin = d3.min(minList);
                        return [seriesMin, seriesMax];
                    }
                    var minMax = determineMultiDataMinMax();
                    peak = minMax[1];
                    min = minMax[0];
                    lowBound = useZeroMinValue ? 0 : min - (min * 0.05);
                    if (alertValue) {
                        alertPeak = (alertValue * 1.2);
                        highPeak = peak + ((peak - min) * 0.2);
                        highBound = alertPeak > highPeak ? alertPeak : highPeak;
                    }
                    else {
                        highBound = peak + ((peak - min) * 0.2);
                    }
                    return [lowBound, !!!highBound && !!!lowBound ? DEFAULT_Y_SCALE : highBound];
                }
                function determineMultiScale(multiDataPoints) {
                    var xTicks = 9, xTickSubDivide = 5;
                    var firstDataArray;
                    if (multiDataPoints && multiDataPoints[0] && multiDataPoints[0].values) {
                        var lowHigh = setupFilteredMultiData(multiDataPoints);
                        lowBound = lowHigh[0];
                        highBound = lowHigh[1];
                        yScale = d3.scale.linear()
                            .clamp(true)
                            .rangeRound([height, 0])
                            .domain([lowBound, highBound]);
                        yAxis = d3.svg.axis()
                            .scale(yScale)
                            .ticks(5)
                            .tickSize(4, 4, 0)
                            .orient('left');
                        timeScale = d3.time.scale()
                            .range([0, width])
                            .domain([d3.min(multiDataPoints, function (d) { return d3.min(d.values, function (p) { return p.timestamp; }); }),
                            d3.max(multiDataPoints, function (d) { return d3.max(d.values, function (p) { return p.timestamp; }); })]);
                        xAxis = d3.svg.axis()
                            .scale(timeScale)
                            .ticks(xTicks)
                            .tickFormat(d3.time.format('%H:%M'))
                            .tickSize(4, 4, 0)
                            .orient('bottom');
                    }
                }
                /**
                 * Load metrics data directly from a running Hawkular-Metrics server
                 * @param url
                 * @param metricId
                 * @param startTimestamp
                 * @param endTimestamp
                 * @param buckets
                 */
                function loadStandAloneMetricsForTimeRange(url, metricId, startTimestamp, endTimestamp, buckets) {
                    ///$log.debug('-- Retrieving metrics data for urlData: ' + metricId);
                    ///$log.debug('-- Date Range: ' + new Date(startTimestamp) + ' - ' + new Date(endTimestamp));
                    ///$log.debug('-- TenantId: ' + metricTenantId);
                    if (buckets === void 0) { buckets = 60; }
                    //let numBuckets = buckets || 60;
                    var requestConfig = {
                        headers: {
                            'Hawkular-Tenant': metricTenantId
                        },
                        params: {
                            start: startTimestamp,
                            end: endTimestamp,
                            buckets: buckets
                        }
                    };
                    if (startTimestamp >= endTimestamp) {
                        $log.log('Start date was after end date');
                    }
                    if (url && metricType && metricId) {
                        var metricTypeAndData = metricType.split('-');
                        /// sample url:
                        /// http://localhost:8080/hawkular/metrics/gauges/45b2256eff19cb982542b167b3957036.status.duration/data?
                        // buckets=120&end=1436831797533&start=1436828197533'
                        $http.get(url + '/' + metricTypeAndData[0] + 's/' + metricId + '/' + (metricTypeAndData[1] || 'data'), requestConfig).success(function (response) {
                            processedNewData = formatBucketedChartOutput(response);
                            scope.render(processedNewData, processedPreviousRangeData);
                        }).error(function (reason, status) {
                            $log.error('Error Loading Chart Data:' + status + ', ' + reason);
                        });
                    }
                }
                /**
                 * Transform the raw http response from Metrics to one usable in charts
                 * @param response
                 * @returns transformed response to IChartDataPoint[], ready to be charted
                 */
                function formatBucketedChartOutput(response) {
                    //  The schema is different for bucketed output
                    if (response) {
                        return response.map(function (point) {
                            var timestamp = point.timestamp || (point.start + (point.end - point.start) / 2);
                            return {
                                timestamp: timestamp,
                                date: new Date(timestamp),
                                value: !angular.isNumber(point.value) ? undefined : point.value,
                                avg: (point.empty) ? undefined : point.avg,
                                min: !angular.isNumber(point.min) ? undefined : point.min,
                                max: !angular.isNumber(point.max) ? undefined : point.max,
                                empty: point.empty
                            };
                        });
                    }
                }
                /**
                 * An empty datapoint has 'empty' attribute set to true. Used to distinguish from real 0 values.
                 * @param d
                 * @returns {boolean}
                 */
                function isEmptyDataPoint(d) {
                    return d.empty;
                }
                /**
                 * Raw metrics have a 'value' set instead of avg/min/max of aggregates
                 * @param d
                 * @returns {boolean}
                 */
                function isRawMetric(d) {
                    return typeof d.avg === 'undefined';
                }
                function buildHover(d, i) {
                    var hover, prevTimestamp, currentTimestamp = d.timestamp, barDuration, formattedDateTime = moment(d.timestamp).format(buttonBarDateTimeFormat);
                    if (i > 0) {
                        prevTimestamp = chartData[i - 1].timestamp;
                        barDuration = moment(currentTimestamp).from(moment(prevTimestamp), true);
                    }
                    if (isEmptyDataPoint(d)) {
                        // nodata
                        hover = "<div class='chartHover'>\n                <small class='chartHoverLabel'>" + noDataLabel + "</small>\n                <div><small><span class='chartHoverLabel'>" + durationLabel + "</span><span>: </span><span class='chartHoverValue'>" + barDuration + "</span></small> </div>\n                <hr/>\n                <div><small><span class='chartHoverLabel'>" + timestampLabel + "</span><span>: </span><span class='chartHoverValue'>" + formattedDateTime + "</span></small></div>\n                </div>";
                    }
                    else {
                        if (isRawMetric(d)) {
                            // raw single value from raw table
                            hover = "<div class='chartHover'>\n                <div><small><span class='chartHoverLabel'>" + timestampLabel + "</span><span>: </span><span class='chartHoverValue'>" + formattedDateTime + "</span></small></div>\n                  <div><small><span class='chartHoverLabel'>" + durationLabel + "</span><span>: </span><span class='chartHoverValue'>" + barDuration + "</span></small></div>\n                  <hr/>\n                  <div><small><span class='chartHoverLabel'>" + singleValueLabel + "</span><span>: </span><span class='chartHoverValue'>" + d3.round(d.value, 2) + "</span></small> </div>\n                  </div> ";
                        }
                        else {
                            // aggregate with min/avg/max
                            hover = "<div class='chartHover'>\n                <small>\n                  <span class='chartHoverLabel'>" + timestampLabel + "</span><span>: </span><span class='chartHoverValue'>" + formattedDateTime + "</span>\n                </small>\n                  <div><small><span class='chartHoverLabel'>" + durationLabel + "</span><span>: </span><span class='chartHoverValue'>" + barDuration + "</span></small> </div>\n                  <hr/>\n                  <div><small><span class='chartHoverLabel'>" + maxLabel + "</span><span>: </span><span class='chartHoverValue'>" + d3.round(d.max, 2) + "</span></small> </div>\n                  <div><small><span class='chartHoverLabel'>" + avgLabel + "</span><span>: </span><span class='chartHoverValue'>" + d3.round(d.avg, 2) + "</span></small> </div>\n                  <div><small><span class='chartHoverLabel'>" + minLabel + "</span><span>: </span><span class='chartHoverValue'>" + d3.round(d.min, 2) + "</span></small> </div>\n                  </div> ";
                        }
                    }
                    return hover;
                }
                function createHeader(titleName) {
                    var title = chart.append('g').append('rect')
                        .attr('class', 'title')
                        .attr('x', 30)
                        .attr('y', margin.top)
                        .attr('height', titleHeight)
                        .attr('width', width + 30 + margin.left)
                        .attr('fill', 'none');
                    chart.append('text')
                        .attr('class', 'titleName')
                        .attr('x', 40)
                        .attr('y', 37)
                        .text(titleName);
                    return title;
                }
                function createSvgDefs(chart) {
                    var defs = chart.append('defs');
                    defs.append('pattern')
                        .attr('id', 'noDataStripes')
                        .attr('patternUnits', 'userSpaceOnUse')
                        .attr('x', '0')
                        .attr('y', '0')
                        .attr('width', '6')
                        .attr('height', '3')
                        .append('path')
                        .attr('d', 'M 0 0 6 0')
                        .attr('style', 'stroke:#CCCCCC; fill:none;');
                    defs.append('pattern')
                        .attr('id', 'unknownStripes')
                        .attr('patternUnits', 'userSpaceOnUse')
                        .attr('x', '0')
                        .attr('y', '0')
                        .attr('width', '6')
                        .attr('height', '3')
                        .attr('style', 'stroke:#2E9EC2; fill:none;')
                        .append('path').attr('d', 'M 0 0 6 0');
                    defs.append('pattern')
                        .attr('id', 'downStripes')
                        .attr('patternUnits', 'userSpaceOnUse')
                        .attr('x', '0')
                        .attr('y', '0')
                        .attr('width', '6')
                        .attr('height', '3')
                        .attr('style', 'stroke:#ff8a9a; fill:none;')
                        .append('path').attr('d', 'M 0 0 6 0');
                }
                function createHistogramChart(stacked) {
                    var barClass = stacked ? 'leaderBar' : 'histogram';
                    var rectHistogram = svg.selectAll('rect.' + barClass).data(chartData);
                    // update existing
                    rectHistogram.attr('class', barClass)
                        .on('mouseover', function (d, i) {
                        tip.show(d, i);
                    }).on('mouseout', function () {
                        tip.hide();
                    })
                        .transition()
                        .attr('x', function (d, i) {
                        return calcBarXPos(d, i);
                    })
                        .attr('width', function (d, i) {
                        return calcBarWidthAdjusted(i);
                    })
                        .attr('y', function (d) {
                        return isEmptyDataPoint(d) ? 0 : yScale(d.avg);
                    })
                        .attr('height', function (d) {
                        return height - yScale(isEmptyDataPoint(d) ? yScale(highBound) : d.avg);
                    })
                        .attr('opacity', stacked ? '.6' : '1')
                        .attr('fill', function (d, i) {
                        return isEmptyDataPoint(d) ? 'url(#noDataStripes)' : (stacked ? '#D3D3D6' : '#C0C0C0');
                    })
                        .attr('stroke', function (d) {
                        return '#777';
                    })
                        .attr('stroke-width', function (d) {
                        return '0';
                    })
                        .attr('data-hawkular-value', function (d) {
                        return d.avg;
                    });
                    // add new ones
                    rectHistogram.enter().append('rect')
                        .on('mouseover', function (d, i) {
                        tip.show(d, i);
                    })
                        .on('mouseout', function () {
                        tip.hide();
                    })
                        .attr('class', barClass)
                        .transition()
                        .attr('x', function (d, i) {
                        return calcBarXPos(d, i);
                    })
                        .attr('width', function (d, i) {
                        return calcBarWidthAdjusted(i);
                    })
                        .attr('y', function (d) {
                        return isEmptyDataPoint(d) ? 0 : yScale(d.avg);
                    })
                        .attr('height', function (d) {
                        return height - yScale(isEmptyDataPoint(d) ? yScale(highBound) : d.avg);
                    })
                        .attr('opacity', stacked ? '.6' : '1')
                        .attr('fill', function (d, i) {
                        return isEmptyDataPoint(d) ? 'url(#noDataStripes)' : (stacked ? '#D3D3D6' : '#C0C0C0');
                    })
                        .attr('stroke', function (d) {
                        return '#777';
                    })
                        .attr('stroke-width', function (d) {
                        return '0';
                    })
                        .attr('data-hawkular-value', function (d) {
                        return d.avg;
                    });
                    // remove old ones
                    rectHistogram.exit().remove();
                    if (!hideHighLowValues) {
                        createHistogramHighLowValues(stacked);
                    }
                    else {
                        // we should hide high-low values.. or remove if existing
                        svg.selectAll('.histogramTopStem, .histogramBottomStem, .histogramTopCross, .histogramBottomCross').
                            remove();
                    }
                }
                function createHistogramHighLowValues(stacked) {
                    if (stacked) {
                        // upper portion representing avg to high
                        var rectHigh = svg.selectAll('rect.high, rect.singleValue').data(chartData);
                        // update existing
                        rectHigh.attr('class', function (d) {
                            return d.min === d.max ? 'singleValue' : 'high';
                        })
                            .attr('x', function (d, i) {
                            return calcBarXPos(d, i);
                        })
                            .attr('y', function (d) {
                            return isNaN(d.max) ? yScale(lowBound) : yScale(d.max);
                        })
                            .attr('height', function (d) {
                            return isEmptyDataPoint(d) ? 0 : (yScale(d.avg) - yScale(d.max) || 2);
                        })
                            .attr('width', function (d, i) {
                            return calcBarWidthAdjusted(i);
                        })
                            .attr('data-rhq-value', function (d) {
                            return d.max;
                        })
                            .attr('opacity', 0.9)
                            .on('mouseover', function (d, i) {
                            tip.show(d, i);
                        }).on('mouseout', function () {
                            tip.hide();
                        });
                        // add new ones
                        rectHigh.enter().append('rect')
                            .attr('class', function (d) {
                            return d.min === d.max ? 'singleValue' : 'high';
                        })
                            .attr('x', function (d, i) {
                            return calcBarXPos(d, i);
                        })
                            .attr('y', function (d) {
                            return isNaN(d.max) ? yScale(lowBound) : yScale(d.max);
                        })
                            .attr('height', function (d) {
                            return isEmptyDataPoint(d) ? 0 : (yScale(d.avg) - yScale(d.max) || 2);
                        })
                            .attr('width', function (d, i) {
                            return calcBarWidthAdjusted(i);
                        })
                            .attr('data-rhq-value', function (d) {
                            return d.max;
                        })
                            .attr('opacity', 0.9)
                            .on('mouseover', function (d, i) {
                            tip.show(d, i);
                        }).on('mouseout', function () {
                            tip.hide();
                        });
                        // remove old ones
                        rectHigh.exit().remove();
                        // lower portion representing avg to low
                        var rectLow = svg.selectAll('rect.low').data(chartData);
                        // update existing
                        rectLow.attr('class', 'low')
                            .attr('x', function (d, i) {
                            return calcBarXPos(d, i);
                        })
                            .attr('y', function (d) {
                            return isNaN(d.avg) ? height : yScale(d.avg);
                        })
                            .attr('height', function (d) {
                            return isEmptyDataPoint(d) ? 0 : (yScale(d.min) - yScale(d.avg));
                        })
                            .attr('width', function (d, i) {
                            return calcBarWidthAdjusted(i);
                        })
                            .attr('opacity', 0.9)
                            .attr('data-rhq-value', function (d) {
                            return d.min;
                        })
                            .on('mouseover', function (d, i) {
                            tip.show(d, i);
                        }).on('mouseout', function () {
                            tip.hide();
                        });
                        // add new ones
                        rectLow.enter().append('rect')
                            .attr('class', 'low')
                            .attr('x', function (d, i) {
                            return calcBarXPos(d, i);
                        })
                            .attr('y', function (d) {
                            return isNaN(d.avg) ? height : yScale(d.avg);
                        })
                            .attr('height', function (d) {
                            return isEmptyDataPoint(d) ? 0 : (yScale(d.min) - yScale(d.avg));
                        })
                            .attr('width', function (d, i) {
                            return calcBarWidthAdjusted(i);
                        })
                            .attr('opacity', 0.9)
                            .attr('data-rhq-value', function (d) {
                            return d.min;
                        })
                            .on('mouseover', function (d, i) {
                            tip.show(d, i);
                        }).on('mouseout', function () {
                            tip.hide();
                        });
                        // remove old ones
                        rectLow.exit().remove();
                    }
                    else {
                        var strokeOpacity = '0.6';
                        var lineHistoHighStem = svg.selectAll('.histogramTopStem').data(chartData);
                        // update existing
                        lineHistoHighStem.attr('class', 'histogramTopStem')
                            .filter(function (d) {
                            return !isEmptyDataPoint(d);
                        })
                            .attr('x1', function (d) {
                            return xMidPointStartPosition(d);
                        })
                            .attr('x2', function (d) {
                            return xMidPointStartPosition(d);
                        })
                            .attr('y1', function (d) {
                            return yScale(d.max);
                        })
                            .attr('y2', function (d) {
                            return yScale(d.avg);
                        })
                            .attr('stroke', function (d) {
                            return 'red';
                        })
                            .attr('stroke-opacity', function (d) {
                            return strokeOpacity;
                        });
                        // add new ones
                        lineHistoHighStem.enter().append('line')
                            .filter(function (d) {
                            return !isEmptyDataPoint(d);
                        })
                            .attr('class', 'histogramTopStem')
                            .attr('x1', function (d) {
                            return xMidPointStartPosition(d);
                        })
                            .attr('x2', function (d) {
                            return xMidPointStartPosition(d);
                        })
                            .attr('y1', function (d) {
                            return yScale(d.max);
                        })
                            .attr('y2', function (d) {
                            return yScale(d.avg);
                        })
                            .attr('stroke', function (d) {
                            return 'red';
                        })
                            .attr('stroke-opacity', function (d) {
                            return strokeOpacity;
                        });
                        // remove old ones
                        lineHistoHighStem.exit().remove();
                        var lineHistoLowStem = svg.selectAll('.histogramBottomStem').data(chartData);
                        // update existing
                        lineHistoLowStem
                            .filter(function (d) {
                            return !isEmptyDataPoint(d);
                        })
                            .attr('class', 'histogramBottomStem')
                            .attr('x1', function (d) {
                            return xMidPointStartPosition(d);
                        })
                            .attr('x2', function (d) {
                            return xMidPointStartPosition(d);
                        })
                            .attr('y1', function (d) {
                            return yScale(d.avg);
                        })
                            .attr('y2', function (d) {
                            return yScale(d.min);
                        })
                            .attr('stroke', function (d) {
                            return 'red';
                        }).attr('stroke-opacity', function (d) {
                            return strokeOpacity;
                        });
                        // add new ones
                        lineHistoLowStem.enter().append('line')
                            .filter(function (d) {
                            return !isEmptyDataPoint(d);
                        })
                            .attr('class', 'histogramBottomStem')
                            .attr('x1', function (d) {
                            return xMidPointStartPosition(d);
                        })
                            .attr('x2', function (d) {
                            return xMidPointStartPosition(d);
                        })
                            .attr('y1', function (d) {
                            return yScale(d.avg);
                        })
                            .attr('y2', function (d) {
                            return yScale(d.min);
                        })
                            .attr('stroke', function (d) {
                            return 'red';
                        }).attr('stroke-opacity', function (d) {
                            return strokeOpacity;
                        });
                        // remove old ones
                        lineHistoLowStem.exit().remove();
                        var lineHistoTopCross = svg.selectAll('.histogramTopCross').data(chartData);
                        // update existing
                        lineHistoTopCross
                            .filter(function (d) {
                            return !isEmptyDataPoint(d);
                        })
                            .attr('class', 'histogramTopCross')
                            .attr('x1', function (d) {
                            return xMidPointStartPosition(d) - 3;
                        })
                            .attr('x2', function (d) {
                            return xMidPointStartPosition(d) + 3;
                        })
                            .attr('y1', function (d) {
                            return yScale(d.max);
                        })
                            .attr('y2', function (d) {
                            return yScale(d.max);
                        })
                            .attr('stroke', function (d) {
                            return 'red';
                        })
                            .attr('stroke-width', function (d) {
                            return '0.5';
                        })
                            .attr('stroke-opacity', function (d) {
                            return strokeOpacity;
                        });
                        // add new ones
                        lineHistoTopCross.enter().append('line')
                            .filter(function (d) {
                            return !isEmptyDataPoint(d);
                        })
                            .attr('class', 'histogramTopCross')
                            .attr('x1', function (d) {
                            return xMidPointStartPosition(d) - 3;
                        })
                            .attr('x2', function (d) {
                            return xMidPointStartPosition(d) + 3;
                        })
                            .attr('y1', function (d) {
                            return yScale(d.max);
                        })
                            .attr('y2', function (d) {
                            return yScale(d.max);
                        })
                            .attr('stroke', function (d) {
                            return 'red';
                        })
                            .attr('stroke-width', function (d) {
                            return '0.5';
                        })
                            .attr('stroke-opacity', function (d) {
                            return strokeOpacity;
                        });
                        // remove old ones
                        lineHistoTopCross.exit().remove();
                        var lineHistoBottomCross = svg.selectAll('.histogramBottomCross').data(chartData);
                        // update existing
                        lineHistoBottomCross
                            .filter(function (d) {
                            return !isEmptyDataPoint(d);
                        })
                            .attr('class', 'histogramBottomCross')
                            .attr('x1', function (d) {
                            return xMidPointStartPosition(d) - 3;
                        })
                            .attr('x2', function (d) {
                            return xMidPointStartPosition(d) + 3;
                        })
                            .attr('y1', function (d) {
                            return yScale(d.min);
                        })
                            .attr('y2', function (d) {
                            return yScale(d.min);
                        })
                            .attr('stroke', function (d) {
                            return 'red';
                        })
                            .attr('stroke-width', function (d) {
                            return '0.5';
                        })
                            .attr('stroke-opacity', function (d) {
                            return strokeOpacity;
                        });
                        // add new ones
                        lineHistoBottomCross.enter().append('line')
                            .filter(function (d) {
                            return !isEmptyDataPoint(d);
                        })
                            .attr('class', 'histogramBottomCross')
                            .attr('x1', function (d) {
                            return xMidPointStartPosition(d) - 3;
                        })
                            .attr('x2', function (d) {
                            return xMidPointStartPosition(d) + 3;
                        })
                            .attr('y1', function (d) {
                            return yScale(d.min);
                        })
                            .attr('y2', function (d) {
                            return yScale(d.min);
                        })
                            .attr('stroke', function (d) {
                            return 'red';
                        })
                            .attr('stroke-width', function (d) {
                            return '0.5';
                        })
                            .attr('stroke-opacity', function (d) {
                            return strokeOpacity;
                        });
                        // remove old ones
                        lineHistoBottomCross.exit().remove();
                    }
                }
                function createHawkularMetricChart() {
                    var metricChartLine = d3.svg.line()
                        .interpolate(interpolation)
                        .defined(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .x(function (d) {
                        return timeScale(d.timestamp);
                    })
                        .y(function (d) {
                        return isRawMetric(d) ? yScale(d.value) : yScale(d.avg);
                    });
                    var pathMetric = svg.selectAll('path.metricLine').data([chartData]);
                    // update existing
                    pathMetric.attr('class', 'metricLine')
                        .transition()
                        .attr('d', metricChartLine);
                    // add new ones
                    pathMetric.enter().append('path')
                        .attr('class', 'metricLine')
                        .transition()
                        .attr('d', metricChartLine);
                    // remove old ones
                    pathMetric.exit().remove();
                }
                function createMultiLineChart(multiDataPoints) {
                    var colorScale = d3.scale.category10(), g = 0;
                    if (multiDataPoints) {
                        // before updating, let's remove those missing from datapoints (if any)
                        svg.selectAll('path[id^=\'multiLine\']')[0].forEach(function (existingPath) {
                            var stillExists = false;
                            multiDataPoints.forEach(function (singleChartData) {
                                singleChartData.keyHash = singleChartData.keyHash || ('multiLine' + hashString(singleChartData.key));
                                if (existingPath.getAttribute('id') === singleChartData.keyHash) {
                                    stillExists = true;
                                }
                            });
                            if (!stillExists) {
                                existingPath.remove();
                            }
                        });
                        multiDataPoints.forEach(function (singleChartData, idx) {
                            if (singleChartData && singleChartData.values) {
                                singleChartData.keyHash = singleChartData.keyHash || ('multiLine' + hashString(singleChartData.key));
                                var pathMultiLine = svg.selectAll('path#' + singleChartData.keyHash).data([singleChartData.values]);
                                // update existing
                                pathMultiLine.attr('id', singleChartData.keyHash)
                                    .attr('class', 'multiLine')
                                    .attr('fill', 'none')
                                    .attr('stroke', function () {
                                    return singleChartData.color || colorScale(g++);
                                })
                                    .transition()
                                    .attr('d', createLine('linear'));
                                // add new ones
                                pathMultiLine.enter().append('path')
                                    .attr('id', singleChartData.keyHash)
                                    .attr('class', 'multiLine')
                                    .attr('fill', 'none')
                                    .attr('stroke', function () {
                                    if (singleChartData.color) {
                                        return singleChartData.color;
                                    }
                                    else {
                                        return colorScale(g++);
                                    }
                                })
                                    .transition()
                                    .attr('d', createLine('linear'));
                                // remove old ones
                                pathMultiLine.exit().remove();
                            }
                        });
                    }
                    else {
                        $log.warn('No multi-data set for multiline chart');
                    }
                }
                function createAreaChart() {
                    var highArea = d3.svg.area()
                        .interpolate(interpolation)
                        .defined(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .x(function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .y(function (d) {
                        return isRawMetric(d) ? yScale(d.value) : yScale(d.max);
                    })
                        .y0(function (d) {
                        return isRawMetric(d) ? yScale(d.value) : yScale(d.avg);
                    }), avgArea = d3.svg.area()
                        .interpolate(interpolation)
                        .defined(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .x(function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .y(function (d) {
                        return isRawMetric(d) ? yScale(d.value) : yScale(d.avg);
                    }).
                        y0(function (d) {
                        return hideHighLowValues ? height : yScale(d.min);
                    }), lowArea = d3.svg.area()
                        .interpolate(interpolation)
                        .defined(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .x(function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .y(function (d) {
                        return isRawMetric(d) ? yScale(d.value) : yScale(d.min);
                    })
                        .y0(function () {
                        return height;
                    });
                    if (!hideHighLowValues) {
                        var highAreaPath = svg.selectAll('path.highArea').data([chartData]);
                        // update existing
                        highAreaPath.attr('class', 'highArea')
                            .attr('d', highArea);
                        // add new ones
                        highAreaPath.enter().append('path')
                            .attr('class', 'highArea')
                            .attr('d', highArea);
                        // remove old ones
                        highAreaPath.exit().remove();
                        var lowAreaPath = svg.selectAll('path.lowArea').data([chartData]);
                        // update existing
                        lowAreaPath.attr('class', 'lowArea')
                            .attr('d', lowArea);
                        // add new ones
                        lowAreaPath.enter().append('path')
                            .attr('class', 'lowArea')
                            .attr('d', lowArea);
                        // remove old ones
                        lowAreaPath.exit().remove();
                    }
                    var avgAreaPath = svg.selectAll('path.avgArea').data([chartData]);
                    // update existing
                    avgAreaPath.attr('class', 'avgArea')
                        .transition()
                        .attr('d', avgArea);
                    // add new ones
                    avgAreaPath.enter().append('path')
                        .attr('class', 'avgArea')
                        .transition()
                        .attr('d', avgArea);
                    // remove old ones
                    avgAreaPath.exit().remove();
                }
                function createScatterChart() {
                    if (!hideHighLowValues) {
                        var highDotCircle = svg.selectAll('.highDot').data(chartData);
                        // update existing
                        highDotCircle.attr('class', 'highDot')
                            .filter(function (d) {
                            return !isEmptyDataPoint(d);
                        })
                            .attr('r', 3)
                            .attr('cx', function (d) {
                            return xMidPointStartPosition(d);
                        })
                            .attr('cy', function (d) {
                            return isRawMetric(d) ? yScale(d.value) : yScale(d.max);
                        })
                            .style('fill', function () {
                            return '#ff1a13';
                        }).on('mouseover', function (d, i) {
                            tip.show(d, i);
                        }).on('mouseout', function () {
                            tip.hide();
                        });
                        // add new ones
                        highDotCircle.enter().append('circle')
                            .filter(function (d) {
                            return !isEmptyDataPoint(d);
                        })
                            .attr('class', 'highDot')
                            .attr('r', 3)
                            .attr('cx', function (d) {
                            return xMidPointStartPosition(d);
                        })
                            .attr('cy', function (d) {
                            return isRawMetric(d) ? yScale(d.value) : yScale(d.max);
                        })
                            .style('fill', function () {
                            return '#ff1a13';
                        }).on('mouseover', function (d, i) {
                            tip.show(d, i);
                        }).on('mouseout', function () {
                            tip.hide();
                        });
                        // remove old ones
                        highDotCircle.exit().remove();
                        var lowDotCircle = svg.selectAll('.lowDot').data(chartData);
                        // update existing
                        lowDotCircle.attr('class', 'lowDot')
                            .filter(function (d) {
                            return !isEmptyDataPoint(d);
                        })
                            .attr('r', 3)
                            .attr('cx', function (d) {
                            return xMidPointStartPosition(d);
                        })
                            .attr('cy', function (d) {
                            return isRawMetric(d) ? yScale(d.value) : yScale(d.min);
                        })
                            .style('fill', function () {
                            return '#70c4e2';
                        }).on('mouseover', function (d, i) {
                            tip.show(d, i);
                        }).on('mouseout', function () {
                            tip.hide();
                        });
                        // add new ones
                        lowDotCircle.enter().append('circle')
                            .filter(function (d) {
                            return !isEmptyDataPoint(d);
                        })
                            .attr('class', 'lowDot')
                            .attr('r', 3)
                            .attr('cx', function (d) {
                            return xMidPointStartPosition(d);
                        })
                            .attr('cy', function (d) {
                            return isRawMetric(d) ? yScale(d.value) : yScale(d.min);
                        })
                            .style('fill', function () {
                            return '#70c4e2';
                        }).on('mouseover', function (d, i) {
                            tip.show(d, i);
                        }).on('mouseout', function () {
                            tip.hide();
                        });
                        // remove old ones
                        lowDotCircle.exit().remove();
                    }
                    else {
                        // we should hide high-low values.. or remove if existing
                        svg.selectAll('.highDot, .lowDot').remove();
                    }
                    var avgDotCircle = svg.selectAll('.avgDot').data(chartData);
                    // update existing
                    avgDotCircle.attr('class', 'avgDot')
                        .filter(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .attr('r', 3)
                        .attr('cx', function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .attr('cy', function (d) {
                        return isRawMetric(d) ? yScale(d.value) : yScale(d.avg);
                    })
                        .style('fill', function () {
                        return '#FFF';
                    }).on('mouseover', function (d, i) {
                        tip.show(d, i);
                    }).on('mouseout', function () {
                        tip.hide();
                    });
                    // add new ones
                    avgDotCircle.enter().append('circle')
                        .filter(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .attr('class', 'avgDot')
                        .attr('r', 3)
                        .attr('cx', function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .attr('cy', function (d) {
                        return isRawMetric(d) ? yScale(d.value) : yScale(d.avg);
                    })
                        .style('fill', function () {
                        return '#FFF';
                    }).on('mouseover', function (d, i) {
                        tip.show(d, i);
                    }).on('mouseout', function () {
                        tip.hide();
                    });
                    // remove old ones
                    avgDotCircle.exit().remove();
                }
                function createScatterLineChart() {
                    var lineScatterTopStem = svg.selectAll('.scatterLineTopStem').data(chartData);
                    // update existing
                    lineScatterTopStem.attr('class', 'scatterLineTopStem')
                        .filter(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .attr('x1', function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .attr('x2', function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .attr('y1', function (d) {
                        return yScale(d.max);
                    })
                        .attr('y2', function (d) {
                        return yScale(d.avg);
                    })
                        .attr('stroke', function (d) {
                        return '#000';
                    });
                    // add new ones
                    lineScatterTopStem.enter().append('line')
                        .filter(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .attr('class', 'scatterLineTopStem')
                        .attr('x1', function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .attr('x2', function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .attr('y1', function (d) {
                        return yScale(d.max);
                    })
                        .attr('y2', function (d) {
                        return yScale(d.avg);
                    })
                        .attr('stroke', function (d) {
                        return '#000';
                    });
                    // remove old ones
                    lineScatterTopStem.exit().remove();
                    var lineScatterBottomStem = svg.selectAll('.scatterLineBottomStem').data(chartData);
                    // update existing
                    lineScatterBottomStem.attr('class', 'scatterLineBottomStem')
                        .filter(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .attr('x1', function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .attr('x2', function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .attr('y1', function (d) {
                        return yScale(d.avg);
                    })
                        .attr('y2', function (d) {
                        return yScale(d.min);
                    })
                        .attr('stroke', function (d) {
                        return '#000';
                    });
                    // add new ones
                    lineScatterBottomStem.enter().append('line')
                        .filter(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .attr('class', 'scatterLineBottomStem')
                        .attr('x1', function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .attr('x2', function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .attr('y1', function (d) {
                        return yScale(d.avg);
                    })
                        .attr('y2', function (d) {
                        return yScale(d.min);
                    })
                        .attr('stroke', function (d) {
                        return '#000';
                    });
                    // remove old ones
                    lineScatterBottomStem.exit().remove();
                    var lineScatterTopCross = svg.selectAll('.scatterLineTopCross').data(chartData);
                    // update existing
                    lineScatterTopCross.attr('class', 'scatterLineTopCross')
                        .filter(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .attr('x1', function (d) {
                        return xMidPointStartPosition(d) - 3;
                    })
                        .attr('x2', function (d) {
                        return xMidPointStartPosition(d) + 3;
                    })
                        .attr('y1', function (d) {
                        return yScale(d.max);
                    })
                        .attr('y2', function (d) {
                        return yScale(d.max);
                    })
                        .attr('stroke', function (d) {
                        return '#000';
                    })
                        .attr('stroke-width', function (d) {
                        return '0.5';
                    });
                    // add new ones
                    lineScatterTopCross.enter().append('line')
                        .filter(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .attr('class', 'scatterLineTopCross')
                        .attr('x1', function (d) {
                        return xMidPointStartPosition(d) - 3;
                    })
                        .attr('x2', function (d) {
                        return xMidPointStartPosition(d) + 3;
                    })
                        .attr('y1', function (d) {
                        return yScale(d.max);
                    })
                        .attr('y2', function (d) {
                        return yScale(d.max);
                    })
                        .attr('stroke', function (d) {
                        return '#000';
                    })
                        .attr('stroke-width', function (d) {
                        return '0.5';
                    });
                    // remove old ones
                    lineScatterTopCross.exit().remove();
                    var lineScatterBottomCross = svg.selectAll('.scatterLineBottomCross').data(chartData);
                    // update existing
                    lineScatterBottomCross.attr('class', 'scatterLineBottomCross')
                        .filter(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .attr('x1', function (d) {
                        return xMidPointStartPosition(d) - 3;
                    })
                        .attr('x2', function (d) {
                        return xMidPointStartPosition(d) + 3;
                    })
                        .attr('y1', function (d) {
                        return yScale(d.min);
                    })
                        .attr('y2', function (d) {
                        return yScale(d.min);
                    })
                        .attr('stroke', function (d) {
                        return '#000';
                    })
                        .attr('stroke-width', function (d) {
                        return '0.5';
                    });
                    // add new ones
                    lineScatterBottomCross.enter().append('line')
                        .filter(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .attr('class', 'scatterLineBottomCross')
                        .attr('x1', function (d) {
                        return xMidPointStartPosition(d) - 3;
                    })
                        .attr('x2', function (d) {
                        return xMidPointStartPosition(d) + 3;
                    })
                        .attr('y1', function (d) {
                        return yScale(d.min);
                    })
                        .attr('y2', function (d) {
                        return yScale(d.min);
                    })
                        .attr('stroke', function (d) {
                        return '#000';
                    })
                        .attr('stroke-width', function (d) {
                        return '0.5';
                    });
                    // remove old ones
                    lineScatterBottomCross.exit().remove();
                    var circleScatterDot = svg.selectAll('.scatterDot').data(chartData);
                    // update existing
                    circleScatterDot.attr('class', 'scatterDot')
                        .filter(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .attr('r', 3)
                        .attr('cx', function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .attr('cy', function (d) {
                        return isRawMetric(d) ? yScale(d.value) : yScale(d.avg);
                    })
                        .style('fill', function () {
                        return '#70c4e2';
                    })
                        .style('opacity', function () {
                        return '1';
                    }).on('mouseover', function (d, i) {
                        tip.show(d, i);
                    }).on('mouseout', function () {
                        tip.hide();
                    });
                    // add new ones
                    circleScatterDot.enter().append('circle')
                        .filter(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .attr('class', 'scatterDot')
                        .attr('r', 3)
                        .attr('cx', function (d) {
                        return xMidPointStartPosition(d);
                    })
                        .attr('cy', function (d) {
                        return isRawMetric(d) ? yScale(d.value) : yScale(d.avg);
                    })
                        .style('fill', function () {
                        return '#70c4e2';
                    })
                        .style('opacity', function () {
                        return '1';
                    }).on('mouseover', function (d, i) {
                        tip.show(d, i);
                    }).on('mouseout', function () {
                        tip.hide();
                    });
                    // remove old ones
                    circleScatterDot.exit().remove();
                }
                function createYAxisGridLines() {
                    // create the y axis grid lines
                    if (yScale) {
                        var yAxis_1 = svg.selectAll('g.grid.y_grid');
                        if (!yAxis_1[0].length) {
                            yAxis_1 = svg.append('g').classed('grid y_grid', true);
                        }
                        yAxis_1
                            .call(d3.svg.axis()
                            .scale(yScale)
                            .orient('left')
                            .ticks(10)
                            .tickSize(-width, 0)
                            .tickFormat(''));
                    }
                }
                function createXandYAxes() {
                    var xAxisGroup;
                    if (yAxis) {
                        svg.selectAll('g.axis').remove();
                        // create x-axis
                        xAxisGroup = svg.append('g')
                            .attr('class', 'x axis')
                            .attr('transform', 'translate(0,' + height + ')')
                            .call(xAxis);
                        xAxisGroup.append('g')
                            .attr('class', 'x brush')
                            .call(brush)
                            .selectAll('rect')
                            .attr('y', -6)
                            .attr('height', 30);
                        // create y-axis
                        svg.append('g')
                            .attr('class', 'y axis')
                            .call(yAxis)
                            .append('text')
                            .attr('transform', 'rotate(-90),translate(0,-50)')
                            .attr('x', -chartHeight / 2)
                            .style('text-anchor', 'start')
                            .text(attrs.yAxisUnits === 'NONE' ? '' : attrs.yAxisUnits);
                    }
                }
                function createCenteredLine(newInterpolation) {
                    var interpolate = newInterpolation || 'monotone', line = d3.svg.line()
                        .interpolate(interpolate)
                        .defined(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .x(function (d) {
                        return timeScale(d.timestamp);
                    })
                        .y(function (d) {
                        return isRawMetric(d) ? yScale(d.value) : yScale(d.avg);
                    });
                    return line;
                }
                function createLine(newInterpolation) {
                    var interpolate = newInterpolation || 'monotone', line = d3.svg.line()
                        .interpolate(interpolate)
                        .defined(function (d) {
                        return !isEmptyDataPoint(d);
                    })
                        .x(function (d) {
                        return timeScale(d.timestamp);
                    })
                        .y(function (d) {
                        return isRawMetric(d) ? yScale(d.value) : yScale(d.avg);
                    });
                    return line;
                }
                function createAvgLines() {
                    if (chartType === 'bar' || chartType === 'scatterline') {
                        var pathAvgLine = svg.selectAll('.barAvgLine').data([chartData]);
                        // update existing
                        pathAvgLine.attr('class', 'barAvgLine')
                            .attr('d', createCenteredLine('monotone'));
                        // add new ones
                        pathAvgLine.enter().append('path')
                            .attr('class', 'barAvgLine')
                            .attr('d', createCenteredLine('monotone'));
                        // remove old ones
                        pathAvgLine.exit().remove();
                    }
                }
                function createAlertLineDef(alertValue) {
                    var line = d3.svg.line()
                        .interpolate('monotone')
                        .x(function (d) {
                        return timeScale(d.timestamp);
                    })
                        .y(function (d) {
                        return yScale(alertValue);
                    });
                    return line;
                }
                function createAlertLine(alertValue) {
                    var pathAlertLine = svg.selectAll('path.alertLine').data([chartData]);
                    // update existing
                    pathAlertLine.attr('class', 'alertLine')
                        .attr('d', createAlertLineDef(alertValue));
                    // add new ones
                    pathAlertLine.enter().append('path')
                        .attr('class', 'alertLine')
                        .attr('d', createAlertLineDef(alertValue));
                    // remove old ones
                    pathAlertLine.exit().remove();
                }
                function extractAlertRanges(chartData, threshold) {
                    var alertBoundAreaItem;
                    var alertBoundAreaItems;
                    var startPoints;
                    var firstChartPoint = chartData[0];
                    var lastChartPoint = chartData[chartData.length - 1];
                    function findStartPoints(chartData, threshold) {
                        var startPoints = [];
                        var prevItem;
                        chartData.forEach(function (chartItem, i) {
                            if (i === 0 && chartItem.avg > threshold) {
                                startPoints.push(i);
                            }
                            else {
                                prevItem = chartData[i - 1];
                                if (chartItem.avg > threshold && prevItem && (!prevItem.avg || prevItem.avg <= threshold)) {
                                    startPoints.push(prevItem.avg ? (i - 1) : i);
                                }
                            }
                        });
                        return startPoints;
                    }
                    function findEndPointsForStartPointIndex(startPoints, threshold) {
                        var alertBoundAreaItems = [];
                        var currentItem;
                        var nextItem;
                        var startItem;
                        startPoints.forEach(function (startPointIndex) {
                            startItem = chartData[startPointIndex];
                            for (var j = startPointIndex; j < chartData.length - 1; j++) {
                                currentItem = chartData[j];
                                nextItem = chartData[j + 1];
                                if ((currentItem.avg > threshold && nextItem.avg <= threshold)
                                    || (currentItem.avg > threshold && !nextItem.avg)) {
                                    alertBoundAreaItems.push(new AlertBound(startItem.timestamp, nextItem.avg ? nextItem.timestamp : currentItem.timestamp, threshold));
                                    break;
                                }
                            }
                        });
                        /// means the last piece data is all above threshold, use last data point
                        if (alertBoundAreaItems.length === (startPoints.length - 1)) {
                            alertBoundAreaItems.push(new AlertBound(chartData[startPoints[startPoints.length - 1]].timestamp, chartData[chartData.length - 1].timestamp, threshold));
                        }
                        return alertBoundAreaItems;
                    }
                    startPoints = findStartPoints(chartData, threshold);
                    alertBoundAreaItems = findEndPointsForStartPointIndex(startPoints, threshold);
                    return alertBoundAreaItems;
                }
                function createAlertBoundsArea(alertBounds) {
                    var rectAlert = svg.select('g.alertHolder').selectAll('rect.alertBounds').data(alertBounds);
                    // update existing
                    rectAlert.attr('class', 'alertBounds')
                        .attr('x', function (d) {
                        return timeScale(d.startTimestamp);
                    })
                        .attr('y', function () {
                        return yScale(highBound);
                    })
                        .attr('height', function (d) {
                        ///@todo: make the height adjustable
                        return 185;
                        //return yScale(0) - height;
                    })
                        .attr('width', function (d) {
                        return timeScale(d.endTimestamp) - timeScale(d.startTimestamp);
                    });
                    // add new ones
                    rectAlert.enter().append('rect')
                        .attr('class', 'alertBounds')
                        .attr('x', function (d) {
                        return timeScale(d.startTimestamp);
                    })
                        .attr('y', function () {
                        return yScale(highBound);
                    })
                        .attr('height', function (d) {
                        ///@todo: make the height adjustable
                        return 185;
                        //return yScale(0) - height;
                    })
                        .attr('width', function (d) {
                        return timeScale(d.endTimestamp) - timeScale(d.startTimestamp);
                    });
                    // remove old ones
                    rectAlert.exit().remove();
                }
                function createXAxisBrush() {
                    brushGroup = svg.selectAll('g.brush');
                    if (brushGroup.empty()) {
                        brushGroup = svg.append('g').attr('class', 'brush');
                    }
                    brush = d3.svg.brush()
                        .x(timeScale)
                        .on('brushstart', brushStart)
                        .on('brushend', brushEnd);
                    brushGroup.call(brush);
                    brushGroup.selectAll('.resize').append('path');
                    brushGroup.selectAll('rect')
                        .attr('height', height);
                    function brushStart() {
                        svg.classed('selecting', true);
                    }
                    function brushEnd() {
                        var extent = brush.extent(), startTime = Math.round(extent[0].getTime()), endTime = Math.round(extent[1].getTime()), dragSelectionDelta = endTime - startTime;
                        svg.classed('selecting', !d3.event.target.empty());
                        // ignore range selections less than 1 minute
                        if (dragSelectionDelta >= 60000) {
                            $rootScope.$broadcast(Charts.EventNames.CHART_TIMERANGE_CHANGED.toString(), extent);
                        }
                        // clear the brush selection
                        brushGroup.call(brush.clear());
                    }
                }
                function createPreviousRangeOverlay(prevRangeData) {
                    if (prevRangeData) {
                        svg.append('path')
                            .datum(prevRangeData)
                            .attr('class', 'prevRangeAvgLine')
                            .style('stroke-dasharray', ('9,3'))
                            .attr('d', createCenteredLine('linear'));
                    }
                }
                function createMultiMetricOverlay() {
                    var colorScale = d3.scale.category20();
                    if (multiChartOverlayData) {
                        $log.log('Running MultiChartOverlay for %i metrics', multiChartOverlayData.length);
                        multiChartOverlayData.forEach(function (singleChartData) {
                            svg.append('path')
                                .datum(singleChartData)
                                .attr('class', 'multiLine')
                                .attr('fill', function (d, i) {
                                return colorScale(i);
                            })
                                .attr('stroke', function (d, i) {
                                return colorScale(i);
                            })
                                .attr('stroke-width', '1')
                                .attr('stroke-opacity', '.8')
                                .attr('d', createCenteredLine('linear'));
                        });
                    }
                }
                function annotateChart(annotationData) {
                    if (annotationData) {
                        svg.selectAll('.annotationDot')
                            .data(annotationData)
                            .enter().append('circle')
                            .attr('class', 'annotationDot')
                            .attr('r', 5)
                            .attr('cx', function (d) {
                            return timeScale(d.timestamp);
                        })
                            .attr('cy', function () {
                            return height - yScale(highBound);
                        })
                            .style('fill', function (d) {
                            if (d.severity === '1') {
                                return 'red';
                            }
                            else if (d.severity === '2') {
                                return 'yellow';
                            }
                            else {
                                return 'white';
                            }
                        });
                    }
                }
                function createDataPoints(dataPoints) {
                    var radius = 1;
                    var dotDatapoint = svg.selectAll('.dataPointDot').data(dataPoints);
                    // update existing
                    dotDatapoint.attr('class', 'dataPointDot')
                        .attr('r', radius)
                        .attr('cx', function (d) {
                        return timeScale(d.timestamp);
                    })
                        .attr('cy', function (d) {
                        return d.avg ? yScale(d.avg) : -9999999;
                    }).on('mouseover', function (d, i) {
                        tip.show(d, i);
                    }).on('mouseout', function () {
                        tip.hide();
                    });
                    // add new ones
                    dotDatapoint.enter().append('circle')
                        .attr('class', 'dataPointDot')
                        .attr('r', radius)
                        .attr('cx', function (d) {
                        return timeScale(d.timestamp);
                    })
                        .attr('cy', function (d) {
                        return d.avg ? yScale(d.avg) : -9999999;
                    }).on('mouseover', function (d, i) {
                        tip.show(d, i);
                    }).on('mouseout', function () {
                        tip.hide();
                    });
                    // remove old ones
                    dotDatapoint.exit().remove();
                }
                scope.$watchCollection('data', function (newData) {
                    if (newData) {
                        processedNewData = angular.fromJson(newData);
                        scope.render(processedNewData, processedPreviousRangeData);
                    }
                });
                scope.$watch('multiData', function (newMultiData) {
                    if (newMultiData) {
                        multiDataPoints = angular.fromJson(newMultiData);
                        scope.render(processedNewData, processedPreviousRangeData);
                    }
                }, true);
                scope.$watch('previousRangeData', function (newPreviousRangeValues) {
                    if (newPreviousRangeValues) {
                        //$log.debug('Previous Range data changed');
                        processedPreviousRangeData = angular.fromJson(newPreviousRangeValues);
                        scope.render(processedNewData, processedPreviousRangeData);
                    }
                }, true);
                scope.$watch('annotationData', function (newAnnotationData) {
                    if (newAnnotationData) {
                        annotationData = angular.fromJson(newAnnotationData);
                        scope.render(processedNewData, processedPreviousRangeData);
                    }
                }, true);
                scope.$watch('contextData', function (newContextData) {
                    if (newContextData) {
                        contextData = angular.fromJson(newContextData);
                        scope.render(processedNewData, processedPreviousRangeData);
                    }
                }, true);
                scope.$on('MultiChartOverlayDataChanged', function (event, newMultiChartData) {
                    $log.log('Handling MultiChartOverlayDataChanged in Chart Directive');
                    if (newMultiChartData) {
                        multiChartOverlayData = angular.fromJson(newMultiChartData);
                    }
                    else {
                        // same event is sent with no data to clear it
                        multiChartOverlayData = [];
                    }
                    scope.render(processedNewData, processedPreviousRangeData);
                });
                scope.$watchGroup(['alertValue', 'chartType', 'hideHighLowValues', 'useZeroMinValue', 'showAvgLine'], function (chartAttrs) {
                    alertValue = chartAttrs[0] || alertValue;
                    chartType = chartAttrs[1] || chartType;
                    hideHighLowValues = (typeof chartAttrs[2] !== 'undefined') ? chartAttrs[2] : hideHighLowValues;
                    useZeroMinValue = (typeof chartAttrs[3] !== 'undefined') ? chartAttrs[3] : useZeroMinValue;
                    showAvgLine = (typeof chartAttrs[4] !== 'undefined') ? chartAttrs[4] : showAvgLine;
                    scope.render(processedNewData, processedPreviousRangeData);
                });
                function loadStandAloneMetricsTimeRangeFromNow() {
                    endTimestamp = Date.now();
                    startTimestamp = moment().subtract(timeRangeInSeconds, 'seconds').valueOf();
                    loadStandAloneMetricsForTimeRange(dataUrl, metricId, startTimestamp, endTimestamp, 60);
                }
                /// standalone charts attributes
                scope.$watchGroup(['metricUrl', 'metricId', 'metricType', 'metricTenantId', 'timeRangeInSeconds'], function (standAloneParams) {
                    dataUrl = standAloneParams[0] || dataUrl;
                    metricId = standAloneParams[1] || metricId;
                    metricType = standAloneParams[2] || metricId;
                    metricTenantId = standAloneParams[3] || metricTenantId;
                    timeRangeInSeconds = standAloneParams[4] || timeRangeInSeconds;
                    loadStandAloneMetricsTimeRangeFromNow();
                });
                scope.$watch('refreshIntervalInSeconds', function (newRefreshInterval) {
                    if (newRefreshInterval) {
                        refreshIntervalInSeconds = +newRefreshInterval;
                        $interval.cancel(startIntervalPromise);
                        startIntervalPromise = $interval(function () {
                            loadStandAloneMetricsTimeRangeFromNow();
                        }, refreshIntervalInSeconds * 1000);
                    }
                });
                scope.$on('$destroy', function () {
                    $interval.cancel(startIntervalPromise);
                });
                scope.$on('DateRangeDragChanged', function (event, extent) {
                    scope.$emit('GraphTimeRangeChangedEvent', extent);
                });
                function determineChartType(chartType) {
                    switch (chartType) {
                        case 'rhqbar':
                            createHistogramChart(true);
                            break;
                        case 'histogram':
                            createHistogramChart(false);
                            break;
                        case 'line':
                        case 'hawkularline':
                        case 'hawkularmetric':
                            createHawkularMetricChart();
                            break;
                        case 'multiline':
                            createMultiLineChart(multiDataPoints);
                            break;
                        case 'area':
                            createAreaChart();
                            break;
                        case 'scatter':
                            createScatterChart();
                            break;
                        case 'scatterline':
                            createScatterLineChart();
                            break;
                        default:
                            $log.warn('chart-type is not valid. Must be in' +
                                ' [rhqbar,area,line,multiline,scatter,scatterline,histogram] chart type: ' + chartType);
                    }
                }
                // adapted from http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
                function hashString(str) {
                    var hash = 0, i, chr, len;
                    if (str.length == 0)
                        return hash;
                    for (i = 0, len = str.length; i < len; i++) {
                        chr = str.charCodeAt(i);
                        hash = ((hash << 5) - hash) + chr;
                        hash |= 0; // Convert to 32bit integer
                    }
                    return hash;
                }
                scope.render = function (dataPoints, previousRangeDataPoints) {
                    // if we don't have data, don't bother..
                    if (!dataPoints && !multiDataPoints) {
                        return;
                    }
                    debug && console.group('Render Chart');
                    debug && console.time('chartRender');
                    //NOTE: layering order is important!
                    if (!hasInit) {
                        initialization();
                    }
                    if (dataPoints) {
                        determineScale(dataPoints);
                    }
                    if (multiDataPoints) {
                        determineMultiScale(multiDataPoints);
                    }
                    ///createHeader(attrs.chartTitle);
                    if (alertValue && (alertValue > lowBound && alertValue < highBound)) {
                        createAlertBoundsArea(extractAlertRanges(chartData, alertValue));
                    }
                    createXAxisBrush();
                    createYAxisGridLines();
                    determineChartType(chartType);
                    if (showDataPoints) {
                        createDataPoints(chartData);
                    }
                    createPreviousRangeOverlay(previousRangeDataPoints);
                    createMultiMetricOverlay();
                    createXandYAxes();
                    if (showAvgLine) {
                        createAvgLines();
                    }
                    if (alertValue && (alertValue > lowBound && alertValue < highBound)) {
                        /// NOTE: this alert line has higher precedence from alert area above
                        createAlertLine(alertValue);
                    }
                    if (annotationData) {
                        annotateChart(annotationData);
                    }
                    debug && console.timeEnd('chartRender');
                    debug && console.groupEnd('Render Chart');
                };
            }
            return {
                link: link,
                restrict: 'E',
                replace: true,
                scope: {
                    data: '=',
                    multiData: '=',
                    metricUrl: '@',
                    metricId: '@',
                    metricType: '@',
                    metricTenantId: '@',
                    startTimestamp: '@',
                    endTimestamp: '@',
                    timeRangeInSeconds: '@',
                    refreshIntervalInSeconds: '@',
                    previousRangeData: '@',
                    annotationData: '@',
                    contextData: '@',
                    showDataPoints: '=',
                    alertValue: '@',
                    interpolation: '@',
                    multiChartOverlayData: '@',
                    chartHeight: '@',
                    chartType: '@',
                    yAxisUnits: '@',
                    useZeroMinValue: '=',
                    buttonbarDatetimeFormat: '@',
                    timeLabel: '@',
                    dateLabel: '@',
                    chartHoverDateFormat: '@',
                    chartHoverTimeFormat: '@',
                    singleValueLabel: '@',
                    noDataLabel: '@',
                    aggregateLabel: '@',
                    startLabel: '@',
                    endLabel: '@',
                    durationLabel: '@',
                    minLabel: '@',
                    maxLabel: '@',
                    avgLabel: '@',
                    timestampLabel: '@',
                    showAvgLine: '=',
                    hideHighLowValues: '=',
                    chartTitle: '@'
                }
            };
        }
    ]);
})(Charts || (Charts = {}));
