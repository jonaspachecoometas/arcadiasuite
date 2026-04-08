import { lazy, Suspense } from "react";

interface ChartData {
  type: "bar" | "line" | "pie" | "area";
  title: string;
  data: Record<string, any>[];
  xKey: string;
  yKeys: string[];
  colors: string[];
}

// Lazy load do recharts para não pesar o bundle inicial
const RechartsComponents = lazy(() =>
  import("recharts").then((module) => ({
    default: function RechartsWrapper({ chart }: { chart: ChartData }) {
      const {
        BarChart,
        Bar,
        LineChart,
        Line,
        PieChart,
        Pie,
        AreaChart,
        Area,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        Legend,
        ResponsiveContainer,
        Cell,
      } = module;

      const renderChart = () => {
        switch (chart.type) {
          case "bar":
            return (
              <BarChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={chart.xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                {chart.yKeys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={chart.colors[index % chart.colors.length]}
                  />
                ))}
              </BarChart>
            );
          case "line":
            return (
              <LineChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={chart.xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                {chart.yKeys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={chart.colors[index % chart.colors.length]}
                  />
                ))}
              </LineChart>
            );
          case "area":
            return (
              <AreaChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={chart.xKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                {chart.yKeys.map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={chart.colors[index % chart.colors.length]}
                    fill={chart.colors[index % chart.colors.length]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            );
          case "pie":
            return (
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={chart.data}
                  dataKey={chart.yKeys[0]}
                  nameKey={chart.xKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {chart.data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={chart.colors[index % chart.colors.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            );
          default:
            return null;
        }
      };

      return (
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      );
    },
  }))
);

interface ChartRendererProps {
  chart: ChartData;
}

export function ChartRenderer({ chart }: ChartRendererProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-64 flex items-center justify-center bg-muted/20 rounded">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <RechartsComponents chart={chart} />
    </Suspense>
  );
}
