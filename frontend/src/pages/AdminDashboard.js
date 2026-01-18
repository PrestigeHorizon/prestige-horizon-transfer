import { useState, useEffect } from 'react';
import axios from 'axios';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  Users,
  DollarSign,
  TrendingUp,
  Edit,
} from 'lucide-react';

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

const AdminDashboard = () => {
  const [transfers, setTransfers] = useState([]);
  const [filteredTransfers, setFilteredTransfers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: '',
    tracking_number: '',
    admin_notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterTransfers();
  }, [transfers, statusFilter, searchQuery]);

  const fetchData = async () => {
    try {
      const [transfersRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/transfers`),
        axios.get(`${API_URL}/api/admin/stats`),
      ]);
      setTransfers(transfersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filterTransfers = () => {
    let filtered = [...transfers];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.receiver_name.toLowerCase().includes(query) ||
          t.sender_name.toLowerCase().includes(query) ||
          t.receiver_phone.includes(query) ||
          t.tracking_number?.toLowerCase().includes(query)
      );
    }

    setFilteredTransfers(filtered);
  };

  const handleEditClick = (transfer) => {
    setEditingTransfer(transfer);
    setUpdateData({
      status: transfer.status,
      tracking_number: transfer.tracking_number || '',
      admin_notes: transfer.admin_notes || '',
    });
  };

  const handleUpdate = async () => {
    setUpdateLoading(true);
    try {
      await axios.put(`${API_URL}/api/admin/transfers/${editingTransfer.id}`, updateData);
      toast.success('Transfer updated successfully');
      setEditingTransfer(null);
      fetchData();
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to update transfer');
    } finally {
      setUpdateLoading(false);
    }
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="admin-dashboard">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-[#A1A1AA] mt-1">Manage all transfer requests</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-[#0F0F0F] border-white/10" data-testid="admin-stat-total">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-sm">Total Transfers</p>
                    <p className="text-2xl font-bold text-white">{stats.total_transfers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#0F0F0F] border-white/10" data-testid="admin-stat-pending">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-sm">Pending</p>
                    <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#0F0F0F] border-white/10" data-testid="admin-stat-volume">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-sm">Total Volume</p>
                    <p className="text-lg font-bold text-green-500">{formatAmount(stats.total_volume)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#0F0F0F] border-white/10" data-testid="admin-stat-users">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[#A1A1AA] text-sm">Total Users</p>
                    <p className="text-2xl font-bold text-blue-500">{stats.total_users}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-[#0F0F0F] border-white/10 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                <Input
                  placeholder="Search transfers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#1A1A1A] border-white/10 text-white"
                  data-testid="admin-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px] bg-[#1A1A1A] border-white/10 text-white" data-testid="admin-status-filter">
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
            </div>
          </CardContent>
        </Card>

        {/* Transfers Table */}
        <Card className="bg-[#0F0F0F] border-white/10" data-testid="admin-transfers-table">
          <CardHeader>
            <CardTitle className="text-white">All Transfers ({filteredTransfers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransfers.length === 0 ? (
              <div className="text-center py-12 text-[#A1A1AA]">
                No transfers found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Sender</th>
                      <th>Receiver</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransfers.map((transfer) => {
                      const StatusIcon = statusIcons[transfer.status];
                      return (
                        <tr key={transfer.id} data-testid={`admin-transfer-${transfer.id}`}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded flex items-center justify-center"
                                style={{ backgroundColor: `${providerColors[transfer.provider]}20` }}
                              >
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: providerColors[transfer.provider] }}
                                ></div>
                              </div>
                              <span className="text-white text-sm">{providerNames[transfer.provider]?.split(' ')[0]}</span>
                            </div>
                          </td>
                          <td>
                            <div>
                              <p className="text-white text-sm">{transfer.sender_name}</p>
                              <p className="text-[#A1A1AA] text-xs">{transfer.sender_phone}</p>
                            </div>
                          </td>
                          <td>
                            <div>
                              <p className="text-white text-sm">{transfer.receiver_name}</p>
                              <p className="text-[#A1A1AA] text-xs">{transfer.receiver_phone}</p>
                            </div>
                          </td>
                          <td>
                            <p className="text-white font-semibold">{formatAmount(transfer.amount)}</p>
                            <p className="text-[#A1A1AA] text-xs">Fee: {formatAmount(transfer.fee)}</p>
                          </td>
                          <td>
                            <Badge variant="outline" className={`status-${transfer.status} border-0`}>
                              <StatusIcon className={`w-3 h-3 mr-1 ${transfer.status === 'processing' ? 'animate-spin' : ''}`} />
                              {transfer.status}
                            </Badge>
                          </td>
                          <td className="text-white text-sm">{formatDate(transfer.created_at)}</td>
                          <td>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(transfer)}
                              className="text-[#D4AF37] hover:bg-white/5"
                              data-testid={`edit-transfer-${transfer.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingTransfer} onOpenChange={() => setEditingTransfer(null)}>
        <DialogContent className="bg-[#0F0F0F] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Update Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[#A1A1AA]">Status</Label>
              <Select
                value={updateData.status}
                onValueChange={(value) => setUpdateData({ ...updateData, status: value })}
              >
                <SelectTrigger className="bg-[#1A1A1A] border-white/10 text-white" data-testid="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10">
                  <SelectItem value="pending" className="text-white">Pending</SelectItem>
                  <SelectItem value="processing" className="text-white">Processing</SelectItem>
                  <SelectItem value="completed" className="text-white">Completed</SelectItem>
                  <SelectItem value="cancelled" className="text-white">Cancelled</SelectItem>
                  <SelectItem value="failed" className="text-white">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[#A1A1AA]">Tracking Number</Label>
              <Input
                value={updateData.tracking_number}
                onChange={(e) => setUpdateData({ ...updateData, tracking_number: e.target.value })}
                placeholder="Enter tracking number"
                className="bg-[#1A1A1A] border-white/10 text-white"
                data-testid="edit-tracking"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#A1A1AA]">Admin Notes</Label>
              <Textarea
                value={updateData.admin_notes}
                onChange={(e) => setUpdateData({ ...updateData, admin_notes: e.target.value })}
                placeholder="Add notes..."
                className="bg-[#1A1A1A] border-white/10 text-white resize-none"
                rows={3}
                data-testid="edit-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingTransfer(null)}
              className="border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateLoading}
              className="bg-[#D4AF37] text-black hover:bg-[#B59326]"
              data-testid="save-update"
            >
              {updateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
