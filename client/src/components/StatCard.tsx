interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  icon?: string;
}

export default function StatCard({ title, value, subtitle, trend, trendValue, icon }: StatCardProps) {
  return (
    <div className="card hover:shadow-cyan-glow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-400 text-sm mb-2">{title}</p>
          <h3 className="text-3xl font-display font-bold mb-1">{value}</h3>
          {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
        </div>
        {icon && (
          <div className="w-12 h-12 bg-cyan/10 rounded-lg flex items-center justify-center text-cyan text-2xl">
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className={`mt-4 text-sm ${trend === 'up' ? 'text-emerald' : 'text-crimson'}`}>
          {trend === 'up' ? '↑' : '↓'} {trendValue}
        </div>
      )}
    </div>
  );
}
