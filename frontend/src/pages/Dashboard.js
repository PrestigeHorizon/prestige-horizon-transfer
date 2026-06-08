import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, ArrowUpRight, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

import westernUnionLogo from '../images/providers/western-union.png';
import moneyGramLogo from '../images/providers/moneygram.jpg';
import riaLogo from '../images/providers/ria.jpg';
import mtnLogo from '../images/providers/mtn-momo.png';
import moovLogo from '../images/providers/moov-money.png';
import corisLogo from '../images/providers/kori-money.png';


const API_URL = process.env.REACT_APP_BACKEND_URL;

const providerNames = {
  western_union: 'Western Union',
  moneygram: 'MoneyGram',
  ria: 'Ria Transfer',
  mtn: 'MTN Mobile Money',
  moov: 'Moov Money',
  coris: 'Coris Money',
};

const providers = [
  { name: 'Western Union', logo: westernUnionLogo, color: '#caad05' },
  { name: 'MoneyGram', logo: moneyGramLogo, color: '#E51B24' },
  { name: 'Ria Transfer', logo: riaLogo, color: '#F37021' },
  { name: 'MTN Mobile Money', logo: mtnLogo, color: '#FFCC00' },
  { name: 'Moov Money', logo: moovLogo, color: '#00a51b' },
  { name: 'Coris Money', logo: corisLogo, color: '#0068A5' },
];


const statusIcons = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  cancelled: AlertCircle,
  failed: AlertCircle,
};

const Dashboard = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/transfers`);
      const data = response.data;
      setTransfers(data);

      // Calculate stats
      const total = data.length;
      const pending = data.filter((t) => t.status === 'pending' || t.status === 'processing').length;
      const completed = data.filter((t) => t.status === 'completed').length;
      const totalAmount = data.reduce((sum, t) => sum + t.amount, 0);

      setStats({ total, pending, completed, totalAmount });
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const recentTransfers = transfers.slice(0, 5);

  const formatAmount = (amount, currency = 'XOF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="dashboard-page">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-[#A1A1AA] mt-1">Manage your money transfers</p>
          </div>
          <Link to="/new-transfer">
            <Button
              className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold gold-glow-hover"
              data-testid="new-transfer-btn"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              New Transfer
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Card className="bg-[#0F0F0F] border-white/10" data-testid="stat-total">
            <CardContent className="p-6">
              <p className="text-[#A1A1AA] text-sm mb-1">Total Transfers</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#0F0F0F] border-white/10" data-testid="stat-pending">
            <CardContent className="p-6">
              <p className="text-[#A1A1AA] text-sm mb-1">In Progress</p>
              <p className="text-3xl font-bold text-[#FCD34D]">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#0F0F0F] border-white/10" data-testid="stat-completed">
            <CardContent className="p-6">
              <p className="text-[#A1A1AA] text-sm mb-1">Completed</p>
              <p className="text-3xl font-bold text-[#4ADE80]">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#0F0F0F] border-white/10" data-testid="stat-volume">
            <CardContent className="p-6">
              <p className="text-[#A1A1AA] text-sm mb-1">Total Volume</p>
              <p className="text-2xl font-bold text-[#D4AF37]">{formatAmount(stats.totalAmount)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-10">
          {providers.map((provider, index) => (
            <Link key={index} to={`/new-transfer?provider=${provider.name.toLowerCase().replace(' ', '_')}`}>
              <Card className="bg-[#0F0F0F] border-white/10 hover:border-opacity-50 transition-all cursor-pointer hover:-translate-y-1">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5">
                    <img src={provider.logo} alt={provider.name} className="h-6 w-auto rounded-full object-contain" />
                  </div>
                  <span className="text-white text-sm font-medium">{provider.name.split(' ')[0]}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>


        {/* Recent Transfers */}
        <Card className="bg-[#0F0F0F] border-white/10" data-testid="recent-transfers">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Recent Transfers</CardTitle>
            <Link to="/transfers">
              <Button variant="ghost" className="text-[#D4AF37] hover:bg-white/5">
                View All
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
              </div>
            ) : recentTransfers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#A1A1AA] mb-4">No transfers yet</p>
                <Link to="/new-transfer">
                  <Button className="bg-[#D4AF37] text-black hover:bg-[#B59326]">
                    Make Your First Transfer
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransfers.map((transfer) => {
                  const StatusIcon = statusIcons[transfer.status];
                  return (
                    <Link
                      key={transfer.id}
                      to={`/transfers/${transfer.id}`}
                      className="flex items-center justify-between p-4 rounded-lg bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] transition-colors"
                      data-testid={`transfer-${transfer.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5"
                        >
                          <img
                            src={providers.find(p =>
                              p.name.toLowerCase() === providerNames[transfer.provider]?.toLowerCase()
                            )?.logo}
                            alt={providerNames[transfer.provider]}
                            className="h-6 w-auto object-contain transition-transform duration-200 hover:scale-110"
                          />
                        </div>

                        <div>
                          <p className="text-white font-medium">{transfer.receiver_name}</p>
                          <p className="text-[#A1A1AA] text-sm">
                            {providerNames[transfer.provider]} • {formatDate(transfer.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            {formatAmount(transfer.amount, transfer.currency)}
                          </p>
                          <Badge
                            variant="outline"
                            className={`status-${transfer.status} border-0 text-xs`}
                          >
                            <StatusIcon className={`w-3 h-3 mr-1 ${transfer.status === 'processing' ? 'animate-spin' : ''}`} />
                            {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
