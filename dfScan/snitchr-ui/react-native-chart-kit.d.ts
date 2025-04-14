declare module 'react-native-chart-kit' {
    import * as React from 'react';
    import { ViewStyle } from 'react-native';
  
    export interface ChartConfig {
      backgroundGradientFrom: string;
      backgroundGradientTo: string;
      color: (opacity: number) => string;
      labelColor?: (opacity: number) => string;
      decimalPlaces?: number;
      barPercentage?: number;
    }
  
    export interface StackedBarChartData {
      labels: string[];
      legend: string[];
      data: number[][];
      barColors: string[];
    }
  
    export interface StackedBarChartProps {
      data: StackedBarChartData;
      width: number;
      height: number;
      chartConfig: ChartConfig;
      style?: ViewStyle;
    }
  
    export class StackedBarChart extends React.Component<StackedBarChartProps> {}
    export class BarChart extends React.Component<any> {}
    export class LineChart extends React.Component<any> {}
    export class PieChart extends React.Component<any> {}
  }
  