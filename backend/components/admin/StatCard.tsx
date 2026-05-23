interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: "pink" | "blue" | "green" | "orange" | "purple";
  trend?: string;
}

const colorMap = {
  pink:   { bg: "bg-pink-50",   icon: "bg-pink-500",   text: "text-pink-600" },
  blue:   { bg: "bg-blue-50",   icon: "bg-blue-500",   text: "text-blue-600" },
  green:  { bg: "bg-green-50",  icon: "bg-green-500",  text: "text-green-600" },
  orange: { bg: "bg-orange-50", icon: "bg-orange-500", text: "text-orange-600" },
  purple: { bg: "bg-purple-50", icon: "bg-purple-500", text: "text-purple-600" },
};

export default function StatCard({
  label,
  value,
  icon,
  color = "pink",
  trend,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div className="stat-card">
      <div className={`${colors.icon} w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 text-xs font-medium truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {trend && <p className="text-xs text-gray-400 mt-0.5">{trend}</p>}
      </div>
    </div>
  );
}
