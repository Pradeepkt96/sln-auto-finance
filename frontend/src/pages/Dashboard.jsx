import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import sln from '../api';
import { 
  Briefcase, 
  IndianRupee, 
  AlertTriangle, 
  TrendingUp 
} from 'lucide-react';

const Dashboard = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState({
    activeLoans: 0,
    todaysCollection: 0,
    overdueLoans: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data } = await sln.get('/dashboard');
        setMetrics(data);
      } catch (error) {
        console.error('Failed to fetch metrics', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const statCards = [
    {
      title: t('totalActiveLoans'),
      value: metrics.activeLoans,
      icon: Briefcase,
      color: 'text-blue-500',
      bg: 'bg-blue-100',
    },
    {
      title: t('todaysCollections'),
      value: `₹ ${metrics.todaysCollection.toLocaleString()}`,
      icon: IndianRupee,
      color: 'text-emerald-500',
      bg: 'bg-emerald-100',
    },
    {
      title: t('overdueLoans'),
      value: metrics.overdueLoans,
      icon: AlertTriangle,
      color: 'text-rose-500',
      bg: 'bg-rose-100',
    },
    {
      title: t('monthlyRevenue'),
      value: `₹ ${metrics.monthlyRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-violet-500',
      bg: 'bg-violet-100',
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="card hover:shadow-md transition-shadow flex items-center p-6 glass">
              <div className={`p-4 rounded-full ${card.bg} mr-4`}>
                <Icon size={24} className={card.color} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
