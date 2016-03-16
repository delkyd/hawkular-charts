/// <reference path='../../typings/tsd.d.ts' />

namespace Charts {
  'use strict';

  /**
   * Defines an individual alert bounds  to be visually highlighted in a chart
   * that an alert was above/below a threshold.
   */
  export class AlertBound {
    public startDate: Date;
    public endDate: Date;

    constructor(public startTimestamp: TimeInMillis,
      public endTimestamp: TimeInMillis,
      public alertValue: number) {
      this.startDate = new Date(startTimestamp);
      this.endDate = new Date(endTimestamp);
    }

  }

  function createAlertLineDef(timeScale: any,
    yScale: any,
    alertValue: number) {
    let line = d3.svg.line()
      .interpolate('monotone')
      .x((d: any) => {
        return timeScale(d.timestamp);
      })
      .y((d: any) => {
        return yScale(alertValue);
      });

    return line;
  }

  export function createAlertLine(chartOptions: ChartOptions,
    alertValue: number,
    cssClassName: string): void {
    let pathAlertLine = chartOptions.svg.selectAll('path.alertLine').data([chartOptions.chartData]);
    // update existing
    pathAlertLine.attr('class', cssClassName)
      .attr('d', createAlertLineDef(chartOptions.timeScale, chartOptions.yScale, alertValue));

    // add new ones
    pathAlertLine.enter().append('path')
      .attr('class', cssClassName)
      .attr('d', createAlertLineDef(chartOptions.timeScale, chartOptions.yScale, alertValue));

    // remove old ones
    pathAlertLine.exit().remove();
  }

  function extractAlertRanges(chartData: IChartDataPoint[], threshold: AlertThreshold): AlertBound[] {
    let alertBoundAreaItems: AlertBound[];
    let startPoints: number[];

    function findStartPoints(chartData: IChartDataPoint[], threshold: AlertThreshold) {
      let startPoints = [];
      let prevItem: IChartDataPoint;

      chartData.forEach((chartItem: IChartDataPoint, i: number) => {
        if (i === 0 && chartItem.avg > threshold) {
          startPoints.push(i);
        } else {
          prevItem = chartData[i - 1];
          if (chartItem.avg > threshold && prevItem && (!prevItem.avg || prevItem.avg <= threshold)) {
            startPoints.push(prevItem.avg ? (i - 1) : i);
          }
        }

      });
      return startPoints;
    }

    function findEndPointsForStartPointIndex(startPoints: number[], threshold: AlertThreshold): AlertBound[] {
      let alertBoundAreaItems: AlertBound[] = [];
      let currentItem: IChartDataPoint;
      let nextItem: IChartDataPoint;
      let startItem: IChartDataPoint;

      startPoints.forEach((startPointIndex: number) => {
        startItem = chartData[startPointIndex];

        for (let j = startPointIndex; j < chartData.length - 1; j++) {
          currentItem = chartData[j];
          nextItem = chartData[j + 1];

          if ((currentItem.avg > threshold && nextItem.avg <= threshold)
            || (currentItem.avg > threshold && !nextItem.avg)) {
            alertBoundAreaItems.push(new AlertBound(startItem.timestamp,
              nextItem.avg ? nextItem.timestamp : currentItem.timestamp, threshold));
            break;
          }
        }
      });

      /// means the last piece data is all above threshold, use last data point
      if (alertBoundAreaItems.length === (startPoints.length - 1)) {
        alertBoundAreaItems.push(new AlertBound(chartData[startPoints[startPoints.length - 1]].timestamp,
          chartData[chartData.length - 1].timestamp, threshold));
      }

      return alertBoundAreaItems;
    }

    startPoints = findStartPoints(chartData, threshold);

    alertBoundAreaItems = findEndPointsForStartPointIndex(startPoints, threshold);

    return alertBoundAreaItems;

  }

  export function createAlertBoundsArea(chartOptions: ChartOptions,
    alertValue: number,
    highBound: number
  ) {
    const alertBounds: AlertBound[] = extractAlertRanges(chartOptions.chartData, alertValue);
    let rectAlert = chartOptions.svg.select('g.alertHolder').selectAll('rect.alertBounds').data(alertBounds);

    function alertBoundingRect(selection) {
      selection
        .attr('class', 'alertBounds')
        .attr('x', (d: AlertBound) => {
          return chartOptions.timeScale(d.startTimestamp);
        })
        .attr('y', () => {
          return chartOptions.yScale(highBound);
        })
        .attr('height', (d: AlertBound) => {
          return chartOptions.height - 40;
        })
        .attr('width', (d: AlertBound) => {
          return chartOptions.timeScale(d.endTimestamp) - chartOptions.timeScale(d.startTimestamp);
        });
    }

    // update existing
    rectAlert.call(alertBoundingRect);

    // add new ones
    rectAlert.enter()
      .append('rect')
      .call(alertBoundingRect);

    // remove old ones
    rectAlert.exit().remove();
  }

}
