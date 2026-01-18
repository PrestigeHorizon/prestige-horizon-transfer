import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, CheckCircle, AlertCircle, Loader2, Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const providerColors = {
  western_union: '#FFDA00',
  moneygram: '#E51B24',
  ria: '#F37021',
  mtn: '#FFCC00',
  moov: '#0068A5',
};

const providerNames = {
  western_union: 'Western Union',
  moneygram: 'MoneyGram',
  ria: 'Ria',
  mtn: 'MTN Mobile Money',
  moov: 'Moov Money',
};

const statusIcons = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  cancelled: AlertCircle,
  failed: AlertCircle,
};

const TransferHistory = () => {
  const [transfers, setTransfers] = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTransfers();
  }, []);

  useEffect(() => {
    filterTransfers();
  }, [transfers, statusFilter, providerFilter, searchQuery]);

  const fetchTransfers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/transfers`);
      setTransfers(response.data);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransfers = () => {
    let filtered = [...transfers];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (providerFilter !== 'all') {
      filtered = filtered.filter((t) => t.provider === providerFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.receiver_name.toLowerCase().includes(query) ||
          t.receiver_phone.includes(query) ||
          t.tracking_number?.toLowerCase().includes(query)
      );
    }

    setFilteredTransfers(filtered);
  };

  const formatAmount = (amount, currency = 'XOF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="transfer-history-page">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Transfer History</h1>
            <p className="text-[#A1A1AA] mt-1">View all your past transfers</p>
          </div>
          <Link to="/new-transfer">
            <Button className="bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold" data-testid="new-transfer-btn">
              New Transfer
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="bg-[#0F0F0F] border-white/10 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <Input
                  placeholder="Search by name, phone, or tracking number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#1A1A1A] border-white/10 text-white"
                  data-testid="search-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px] bg-[#1A1A1A] border-white/10 text-white" data-testid="status-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10">
                  <SelectItem value="all" className="text-white">All Status</SelectItem>
                  <SelectItem value="pending" className="text-white">Pending</SelectItem>
                  <SelectItem value="processing" className="text-white">Processing</SelectItem>
                  <SelectItem value="completed" className="text-white">Completed</SelectItem>
                  <SelectItem value="cancelled" className="text-white">Cancelled</SelectItem>
                  <SelectItem value="failed" className="text-white">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-full md:w-[180px] bg-[#1A1A1A] border-white/10 text-white" data-testid="provider-filter">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10">
                  <SelectItem value="all" className="text-white">All Providers</SelectItem>
                  {Object.entries(providerNames).map(([key, name]) => (
                    <SelectItem key={key} value={key} className="text-white">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transfers List */}
        <Card className="bg-[#0F0F0F] border-white/10" data-testid="transfers-list">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Transfers</span>
              <span className="text-sm font-normal text-[#A1A1AA]">
                {filteredTransfers.length} {filteredTransfers.length === 1 ? 'transfer' : 'transfers'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#A1A1AA] mb-4">
                  {transfers.length === 0 ? 'No transfers yet' : 'No transfers match your filters'}
                </p>
                {transfers.length === 0 && (
                  <Link to="/new-transfer">
                    <Button className="bg-[#D4AF37] text-black hover:bg-[#B59326]">
                      Make Your First Transfer
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransfers.map((transfer) => {
                  const StatusIcon = statusIcons[transfer.status];
                  return (
                    <Link
                      key={transfer.id}
                      to={`/transfers/${transfer.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] transition-colors gap-4"
                      data-testid={`transfer-item-${transfer.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${providerColors[transfer.provider]}20` }}
                        >
                          <div
                            className="w-5 h-5 rounded-full"
                            style={{ backgroundColor: providerColors[transfer.provider] }}
                          ></div>
                        </div>
                        <div>
                          <p className="text-white font-medium">{transfer.receiver_name}</p>
                          <p className="text-[#A1A1AA] text-sm">
                            {providerNames[transfer.provider]}
                          </p>
                          <p className="text-[#A1A1AA] text-xs mt-1">
                            {formatDate(transfer.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            {formatAmount(transfer.amount, transfer.currency)}
                          </p>
                          <p className="text-[#A1A1AA] text-xs">
                            Fee: {formatAmount(transfer.fee)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`status-${transfer.status} border-0 shrink-0`}
                        >
                          <StatusIcon className={`w-3 h-3 mr-1 ${transfer.status === 'processing' ? 'animate-spin' : ''}`} />
                          {transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}
                        </Badge>
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

export default TransferHistory;
