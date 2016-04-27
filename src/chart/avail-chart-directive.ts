/// <reference path='../../typings/tsd.d.ts' />
namespace Charts {
  'use strict';

  declare let d3: any;

  const _module = angular.module('hawkular.charts');

  export class AvailStatus {

    public static UP = 'up';
    public static DOWN = 'down';
    public static UNKNOWN = 'unknown';

    constructor(public value: string) {
      // empty
    }

    public toString(): string {
      return this.value;
    }
  }

  /**
   * This is the input data format, directly from Metrics.
   */
  export interface IAvailDataPoint {
    timestamp: number;
    value: string;
  }

  /**
   * This is the transformed output data format. Formatted to work with availability chart (basically a DTO).
   */
  export interface ITransformedAvailDataPoint {
    start: number;
    end: number;
    value: string;
    startDate?: Date; /// Mainly for debugger human readable dates instead of a number
    endDate?: Date;
    duration?: string;
    message?: string;
  }

  export class TransformedAvailDataPoint implements ITransformedAvailDataPoint {

    constructor(public start: number,
      public end: number,
      public value: string,
      public startDate?: Date,
      public endDate?: Date,
      public duration?: string,
      public message?: string) {

      this.duration = moment(end).from(moment(start), true);
      this.startDate = new Date(start);
      this.endDate = new Date(end);
    }

  }

  export class AvailabilityChartDirective {

    private static _CHART_HEIGHT = 150;
    private static _CHART_WIDTH = 750;

    public restrict = 'E';
    public replace = true;

    // Can't use 1.4 directive controllers because we need to support 1.3+
    public scope = {
      data: '=',
      startTimestamp: '@',
      endTimestamp: '@',
      timeLabel: '@',
      dateLabel: '@',
      chartTitle: '@'
    };

    public link: (scope: any, element: ng.IAugmentedJQuery, attrs: any) => void;

    public transformedDataPoints: ITransformedAvailDataPoint[];

    constructor($rootScope: ng.IRootScopeService) {

      this.link = (scope, element, attrs) => {

        // data specific vars
        let startTimestamp: number = +attrs.startTimestamp,
          endTimestamp: number = +attrs.endTimestamp,
          chartHeight = AvailabilityChartDirective._CHART_HEIGHT;

        // chart specific vars
        let margin = { top: 10, right: 5, bottom: 5, left: 90 },
          width = AvailabilityChartDirective._CHART_WIDTH - margin.left - margin.right,
          adjustedChartHeight = chartHeight - 50,
          height = adjustedChartHeight - margin.top - margin.bottom,
          titleHeight = 30,
          titleSpace = 10,
          innerChartHeight = height + margin.top - titleHeight - titleSpace,
          adjustedChartHeight2 = +titleHeight + titleSpace + margin.top,
          yScale,
          timeScale,
          yAxis,
          xAxis,
          xAxisGroup,
          brush,
          brushGroup,
          tip,
          chart,
          chartParent,
          svg;

        function buildAvailHover(d: ITransformedAvailDataPoint) {
          return `<div class='chartHover'>
            <div class='info-item'>
              <span class='chartHoverLabel'>Status:</span>
              <span class='chartHoverValue'>${d.value.toUpperCase()}</span>
            </div>
            <div class='info-item before-separator'>
              <span class='chartHoverLabel'>Duration:</span>
              <span class='chartHoverValue'>${d.duration}</span>
            </div>
          </div>`;
        }

        function oneTimeChartSetup(): void {
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
            .html((d: ITransformedAvailDataPoint) => {
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

        function determineAvailScale(transformedAvailDataPoint: ITransformedAvailDataPoint[]) {
          let adjustedTimeRange: number[] = [];

          startTimestamp = +attrs.startTimestamp ||
            d3.min(transformedAvailDataPoint, (d: ITransformedAvailDataPoint) => {
              return d.start;
            }) || +moment().subtract(1, 'hour');

          if (transformedAvailDataPoint && transformedAvailDataPoint.length > 0) {

            adjustedTimeRange[0] = startTimestamp;
            adjustedTimeRange[1] = endTimestamp || +moment();

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
              .tickFormat(xAxisTimeFormats());

          }
        }

        function isUp(d: ITransformedAvailDataPoint) {
          return d.value === AvailStatus.UP.toString();
        }

        //function isDown(d: ITransformedAvailDataPoint) {
        //  return d.value === AvailStatus.DOWN.toString();
        //}

        function isUnknown(d: ITransformedAvailDataPoint) {
          return d.value === AvailStatus.UNKNOWN.toString();
        }

        function formatTransformedDataPoints(inAvailData: IAvailDataPoint[]): ITransformedAvailDataPoint[] {
          let outputData: ITransformedAvailDataPoint[] = [];
          let itemCount = inAvailData.length;

          function sortByTimestamp(a: IAvailDataPoint, b: IAvailDataPoint) {
            if (a.timestamp < b.timestamp) {
              return -1;
            }
            if (a.timestamp > b.timestamp) {
              return 1;
            }
            return 0;
          }

          inAvailData.sort(sortByTimestamp);

          if (inAvailData && itemCount > 0 && inAvailData[0].timestamp) {
            let now = new Date().getTime();

            if (itemCount === 1) {
              let availItem = inAvailData[0];

              // we only have one item with start time. Assume unknown for the time before (last 1h)
              // @TODO adjust to time picker
              outputData.push(new TransformedAvailDataPoint(now - 60 * 60 * 1000,
                availItem.timestamp, AvailStatus.UNKNOWN.toString()));
              // and the determined value up until the end.
              outputData.push(new TransformedAvailDataPoint(availItem.timestamp, now, availItem.value));
            } else {
              let backwardsEndTime = now;

              for (let i = inAvailData.length; i > 0; i--) {
                // if we have data starting in the future... discard it
                //if (inAvailData[i - 1].timestamp > +moment()) {
                //  continue;
                //}
                if (startTimestamp >= inAvailData[i - 1].timestamp) {
                  outputData.push(new TransformedAvailDataPoint(startTimestamp,
                    backwardsEndTime, inAvailData[i - 1].value));
                  break;
                } else {
                  outputData.push(new TransformedAvailDataPoint(inAvailData[i - 1].timestamp,
                    backwardsEndTime, inAvailData[i - 1].value));
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

        function createAvailabilityChart(transformedAvailDataPoint: ITransformedAvailDataPoint[]) {
          //let xAxisMin = d3.min(transformedAvailDataPoint, (d: ITransformedAvailDataPoint) => {
          //  return +d.start;
          //}),
          let xAxisMax = d3.max(transformedAvailDataPoint, (d: ITransformedAvailDataPoint) => {
            return +d.end;
          });

          let availTimeScale = d3.time.scale()
            .range([0, width])
            .domain([startTimestamp, endTimestamp || xAxisMax]),

            yScale = d3.scale.linear()
              .clamp(true)
              .range([height, 0])
              .domain([0, 4]);

          //availXAxis = d3.svg.axis()
          //  .scale(availTimeScale)
          //  .ticks(8)
          //  .tickSize(13, 0)
          //  .orient('top');

          // For each datapoint calculate the Y offset for the bar
          // Up or Unknown: offset 0, Down: offset 35
          function calcBarY(d: ITransformedAvailDataPoint) {
            return height - yScale(0) + ((isUp(d) || isUnknown(d)) ? 0 : 35);
          }

          // For each datapoint calculate the Y removed height for the bar
          // Unknown: full height 15, Up or Down: half height, 50
          function calcBarHeight(d: ITransformedAvailDataPoint) {
            return yScale(0) - (isUnknown(d) ? 15 : 50);
          }

          function calcBarFill(d: ITransformedAvailDataPoint) {
            if (isUp(d)) {
              return '#54A24E'; // green
            } else if (isUnknown(d)) {
              return 'url(#diagonal-stripes)'; // gray stripes
            } else {
              return '#D85054'; // red
            }
          }

          svg.selectAll('rect.availBars')
            .data(transformedAvailDataPoint)
            .enter().append('rect')
            .attr('class', 'availBars')
            .attr('x', (d: ITransformedAvailDataPoint) => {
              return availTimeScale(+d.start);
            })
            .attr('y', (d: ITransformedAvailDataPoint) => {
              return calcBarY(d);
            })
            .attr('height', (d) => {
              return calcBarHeight(d);
            })
            .attr('width', (d: ITransformedAvailDataPoint) => {
              let dEnd = endTimestamp ? (Math.min(+d.end, endTimestamp)) : (+d.end);
              return availTimeScale(dEnd) - availTimeScale(+d.start);
            })
            .attr('fill', (d: ITransformedAvailDataPoint) => {
              return calcBarFill(d);
            })
            .attr('opacity', () => {
              return 0.85;
            })
            .on('mouseover', (d, i) => {
              tip.show(d, i);
            }).on('mouseout', () => {
              tip.hide();
            })
            .on('mousedown', () => {
              let brushElem = svg.select('.brush').node();
              let clickEvent: any = new Event('mousedown');
              clickEvent.pageX = d3.event.pageX;
              clickEvent.clientX = d3.event.clientX;
              clickEvent.pageY = d3.event.pageY;
              clickEvent.clientY = d3.event.clientY;
              brushElem.dispatchEvent(clickEvent);
            })
            .on('mouseup', () => {
              let brushElem = svg.select('.brush').node();
              let clickEvent: any = new Event('mouseup');
              clickEvent.pageX = d3.event.pageX;
              clickEvent.clientX = d3.event.clientX;
              clickEvent.pageY = d3.event.pageY;
              clickEvent.clientY = d3.event.clientY;
              brushElem.dispatchEvent(clickEvent);
            });

          // The bottom line of the availability chart
          svg.append('line')
            .attr('x1', 0)
            .attr('y1', 70)
            .attr('x2', 655)
            .attr('y2', 70)
            .attr('stroke-width', 0.5)
            .attr('stroke', '#D0D0D0');

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
            let extent = brush.extent(),
              startTime = Math.round(extent[0].getTime()),
              endTime = Math.round(extent[1].getTime()),
              dragSelectionDelta = endTime - startTime;

            //svg.classed('selecting', !d3.event.target.empty());
            if (dragSelectionDelta >= 60000) {
              $rootScope.$broadcast(EventNames.AVAIL_CHART_TIMERANGE_CHANGED.toString(), extent);
            }
            brushGroup.call(brush.clear());
          }
        }

        scope.$watchCollection('data', (newData) => {
          if (newData) {
            this.transformedDataPoints = formatTransformedDataPoints(angular.fromJson(newData));
            scope.render(this.transformedDataPoints);
          }
        });

        scope.$watchGroup(['startTimestamp', 'endTimestamp'], (newTimestamp) => {
          startTimestamp = +newTimestamp[0] || startTimestamp;
          endTimestamp = +newTimestamp[1] || endTimestamp;
          scope.render(this.transformedDataPoints);
        });

        scope.render = (transformedAvailDataPoint: ITransformedAvailDataPoint[]) => {
          if (transformedAvailDataPoint && transformedAvailDataPoint.length > 0) {
            //console.time('availChartRender');
            ///NOTE: layering order is important!
            oneTimeChartSetup();
            determineAvailScale(transformedAvailDataPoint);
            createXandYAxes();
            createXAxisBrush();
            createAvailabilityChart(transformedAvailDataPoint);
            //console.timeEnd('availChartRender');
          }
        };
      };
    }

    public static Factory() {
      let directive = ($rootScope: ng.IRootScopeService) => {
        return new AvailabilityChartDirective($rootScope);
      };

      directive['$inject'] = ['$rootScope'];

      return directive;
    }

  }

  _module.directive('hkAvailabilityChart', AvailabilityChartDirective.Factory());
}
