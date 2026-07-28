import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Card, EmptyState } from './UI.jsx';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

const palette = ['#34d399', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'];
const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', usePointStyle: true, boxWidth: 8 } },
  },
  scales: {
    x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
    y: { ticks: { color: '#94a3b8', precision: 0 }, grid: { color: 'rgba(148,163,184,.12)' } },
  },
};

export function ChartCard({ title, subtitle, labels = [], values = [], type = 'bar' }) {
  const hasData = values.some((value) => value > 0);
  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: values,
        backgroundColor: type === 'line' ? 'rgba(52,211,153,.16)' : palette,
        borderColor: type === 'line' ? '#34d399' : palette,
        borderWidth: 2,
        fill: type === 'line',
        tension: 0.35,
      },
    ],
  };
  const Chart = type === 'line' ? Line : type === 'doughnut' ? Doughnut : Bar;
  return (
    <Card>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      <div className="mt-5 h-64">
        {hasData ? (
          <Chart data={data} options={type === 'doughnut' ? { ...options, scales: {} } : options} />
        ) : (
          <EmptyState title="No chart data" description="The current API response has no values for this chart." />
        )}
      </div>
    </Card>
  );
}
