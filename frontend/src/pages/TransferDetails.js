import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Clock, CheckCircle, AlertCircle, Loader2, User, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';

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

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', description: 'Your transfer is awaiting processing' },
  processing: { icon: Loader2, label: 'Processing', description: 'Your transfer is being processed' },
  completed: { icon: CheckCircle, label: 'Completed', description: 'Transfer completed successfully' },
  cancelled: { icon: AlertCircle, label: 'Cancelled', description: 'Transfer was cancelled' },
  failed: { icon: AlertCircle, label: 'Failed', description: 'Transfer failed' },
};

const TransferDetails = () => {
  const { id } = useParams();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransfer();
  }, [id]);

  const fetchTransfer = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/transfers/${id}`);
      setTransfer(response.data);
    } catch (error) {
      console.error('Failed to fetch transfer:', error);
      toast.error('Transfer not found');
    } finally {
      setLoading(false);
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
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

  if (!transfer) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Navbar />
        <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Transfer Not Found</h1>
          <Link to="/transfers">
            <Button className="bg-[#D4AF37] text-black hover:bg-[#B59326]">
              Back to Transfers
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  const StatusIcon = statusConfig[transfer.status]?.icon || Clock;
  const statusInfo = statusConfig[transfer.status] || statusConfig.pending;

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="transfer-details-page">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          to="/transfers"
          className="inline-flex items-center gap-2 text-[#A1A1AA] hover:text-white transition-colors mb-6"
          data-testid="back-to-transfers"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transfers
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${providerColors[transfer.provider]}20` }}
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: providerColors[transfer.provider] }}
              ></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{providerNames[transfer.provider]}</h1>
              <p className="text-[#A1A1AA]">Transfer #{transfer.id.slice(0, 8)}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`status-${transfer.status} border-0 text-sm px-4 py-2`}
            data-testid="transfer-status"
          >
            <StatusIcon className={`w-4 h-4 mr-2 ${transfer.status === 'processing' ? 'animate-spin' : ''}`} />
            {statusInfo.label}
          </Badge>
        </div>

        {/* Status Card */}
        <Card className="bg-[#0F0F0F] border-white/10 mb-6" data-testid="status-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                transfer.status === 'completed' ? 'bg-green-500/20' : 
                transfer.status === 'failed' || transfer.status === 'cancelled' ? 'bg-red-500/20' : 
                'bg-yellow-500/20'
              }`}>
                <StatusIcon className={`w-6 h-6 ${
                  transfer.status === 'completed' ? 'text-green-500' :
                  transfer.status === 'failed' || transfer.status === 'cancelled' ? 'text-red-500' :
                  'text-yellow-500'
                } ${transfer.status === 'processing' ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h3 className="text-white font-semibold">{statusInfo.label}</h3>
                <p className="text-[#A1A1AA] text-sm">{statusInfo.description}</p>
              </div>
            </div>
            {transfer.tracking_number && (
              <div className="mt-4 p-4 bg-[#1A1A1A] rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-[#A1A1AA] text-xs uppercase tracking-wider">Tracking Number</p>
                  <p className="text-white font-mono text-lg" data-testid="tracking-number">{transfer.tracking_number}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(transfer.tracking_number)}
                  className="text-[#D4AF37] hover:bg-white/5"
                  data-testid="copy-tracking"
                >
                  <Copy className="w-5 h-5" />
                </Button>
              </div>
            )}
            {transfer.admin_notes && (
              <div className="mt-4 p-4 bg-[#1A1A1A] rounded-lg">
                <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-1">Admin Notes</p>
                <p className="text-white">{transfer.admin_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Amount Details */}
          <Card className="bg-[#0F0F0F] border-white/10" data-testid="amount-card">
            <CardHeader>
              <CardTitle className="text-white">Amount Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Send Amount</span>
                <span className="text-white font-medium">{formatAmount(transfer.amount, transfer.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Fee</span>
                <span className="text-white font-medium">{formatAmount(transfer.fee, transfer.currency)}</span>
              </div>
              <div className="h-px bg-white/10"></div>
              <div className="flex justify-between">
                <span className="text-white font-semibold">Total Paid</span>
                <span className="text-[#D4AF37] font-bold text-xl">{formatAmount(transfer.total_amount, transfer.currency)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Receiver Details */}
          <Card className="bg-[#0F0F0F] border-white/10" data-testid="receiver-card">
            <CardHeader>
              <CardTitle className="text-white">Receiver Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-[#A1A1AA]" />
                <div>
                  <p className="text-[#A1A1AA] text-xs">Name</p>
                  <p className="text-white">{transfer.receiver_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#A1A1AA]" />
                <div>
                  <p className="text-[#A1A1AA] text-xs">Phone</p>
                  <p className="text-white">{transfer.receiver_phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#A1A1AA]" />
                <div>
                  <p className="text-[#A1A1AA] text-xs">Country</p>
                  <p className="text-white">{transfer.receiver_country}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sender Details */}
          <Card className="bg-[#0F0F0F] border-white/10" data-testid="sender-card">
            <CardHeader>
              <CardTitle className="text-white">Sender Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-[#A1A1AA]" />
                <div>
                  <p className="text-[#A1A1AA] text-xs">Name</p>
                  <p className="text-white">{transfer.sender_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#A1A1AA]" />
                <div>
                  <p className="text-[#A1A1AA] text-xs">Phone</p>
                  <p className="text-white">{transfer.sender_phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Info */}
          <Card className="bg-[#0F0F0F] border-white/10" data-testid="info-card">
            <CardHeader>
              <CardTitle className="text-white">Transfer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Created</span>
                <span className="text-white">{formatDate(transfer.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Last Updated</span>
                <span className="text-white">{formatDate(transfer.updated_at)}</span>
              </div>
              {transfer.notes && (
                <div>
                  <p className="text-[#A1A1AA] text-sm mb-1">Notes</p>
                  <p className="text-white bg-[#1A1A1A] p-3 rounded-lg">{transfer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default TransferDetails;
