/// <reference path="../../../vendor/vendor.d.ts" />
declare namespace Charts {
    function createScatterLineChart(svg: any, timeScale: any, yScale: any, chartData: IChartDataPoint[], height?: number, interpolation?: string, hideHighLowValues?: boolean): void;
}