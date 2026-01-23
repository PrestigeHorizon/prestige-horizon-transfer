import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

import westernUnionLogo from '../images/providers/western-union.png';
import moneyGramLogo from '../images/providers/moneygram.jpg';
import riaLogo from '../images/providers/ria.jpg';
import mtnLogo from '../images/providers/mtn-momo.png';
import moovLogo from '../images/providers/moov-money.png';
import corisLogo from '../images/providers/kori-money.png';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const providerColors = {
  western_union: '#caad05',
  moneygram: '#E51B24',
  ria: '#F37021',
  mtn: '#FFCC00',
  moov: '#00a51b',
  coris: '#0068A5',
};

// Map the keys to the exact strings API returns (e.g., 'western_union')
const providerMaps = {
  western_union: { name: 'Western Union', logo: westernUnionLogo, color: '#caad05' },
  moneygram: { name: 'MoneyGram', logo: moneyGramLogo, color: '#E51B24' },
  ria: { name: 'Ria', logo: riaLogo, color: '#F37021' },
  mtn: { name: 'MTN Mobile Money', logo: mtnLogo, color: '#FFCC00' },
  moov: { name: 'Moov Money', logo: moovLogo, color: '#00a51b' },
  coris: { name: 'Coris Money', logo: corisLogo, color: '#0068A5' },
};


const countries = [
  'Burkina Faso',
  'Mali',
  'Côte d\'Ivoire',
  'Senegal',
  'Niger',
  'Benin',
  'Togo',
  'Ghana',
  'Nigeria',
  'France',
  'USA',
  'Canada',
  'Other',
];

const NewTransfer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProvider = searchParams.get('provider');

  const [step, setStep] = useState(1);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calculation, setCalculation] = useState(null);

  const [formData, setFormData] = useState({
    provider: preselectedProvider || '',
    amount: '',
    receiver_name: '',
    receiver_phone: '',
    receiver_country: 'Benin',
    notes: '',
  });

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (formData.provider && formData.amount && parseFloat(formData.amount) > 0) {
      calculateFee();
    } else {
      setCalculation(null);
    }
  }, [formData.provider, formData.amount]);

  const fetchProviders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/providers`);
      console.log("Available Providers:", response.data);
      setProviders(response.data);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      toast.error('Failed to load providers');
    }
  };

  const calculateFee = async () => {
    setCalculating(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/providers/${formData.provider}/calculate?amount=${formData.amount}`
      );
      setCalculation(response.data);
    } catch (error) {
      console.error('Failed to calculate fee:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/transfers`, {
        ...formData,
        amount: parseFloat(formData.amount),
      });

      toast.success('Transfer request submitted successfully!');
      navigate(`/transfers/${response.data.id}`);
    } catch (error) {
      console.error('Transfer failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to create transfer');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProviderDetails = (providerKey) => {
    // 1. Check local asset map
    if (providerMaps[providerKey]) return providerMaps[providerKey];

    // 2. Fallback to the simpler color object if available
    return {
      name: providerKey.replace('_', ' '),
      logo: null,
      color: providerColors[providerKey] || '#D4AF37'
    };
  };

  const selectedProvider = providers.find((p) => p.provider === formData.provider);

  const brandDetails = getProviderDetails(formData.provider);

  const canProceedStep1 = formData.provider && formData.amount && parseFloat(formData.amount) > 0;
  const canProceedStep2 = formData.receiver_name && formData.receiver_phone && formData.receiver_country;

  return (
    <div className="min-h-screen bg-[#050505]" data-testid="new-transfer-page">
      <Navbar />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">New Transfer</h1>
          <p className="text-[#A1A1AA] mt-1">Send money to your loved ones</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${step >= s
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-[#1A1A1A] text-[#A1A1AA]'
                  }`}
                data-testid={`step-indicator-${s}`}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-0.5 ${step > s ? 'bg-[#D4AF37]' : 'bg-[#1A1A1A]'}`}></div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Updated Provider Selection */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <Label className="text-[#A1A1AA] mb-4 block">Select Provider</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-3 gap-4">
                  {providers.map((provider) => {
                    // Use the helper to get logo/color, or fallback to defaults
                    const details = getProviderDetails(provider.provider);

                    const isSelected = formData.provider === provider.provider;

                    return (
                      <button
                        key={provider.provider}
                        type="button"
                        onClick={() => setFormData({ ...formData, provider: provider.provider })}
                        className={`provider-card p-4 rounded-xl border transition-all flex flex-col items-center text-center ${isSelected
                          ? 'bg-white/5'
                          : 'border-white/10 bg-[transparent] hover:border-white/20'
                          }`}
                        style={{
                          // Uses the brand color for the border when selected
                          borderColor: isSelected ? details.color : 'transparent',
                          boxShadow: isSelected ? `${details.color}15 0px 0px 15px` : 'none',
                          backgroundColor: `${details.color}20`, color: details.color
                        }}
                      >
                        <div
                          className="w-20 h-full rounded-full flex items-center justify-center mb-3 overflow-hidden p-1"
                        >
                          {details.logo ? (
                            <img
                              src={details.logo}
                              alt={details.name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div
                              className="w-full h-full rounded flex items-center justify-center text-[10px] font-bold"
                              style={{ backgroundColor: `${details.color}20`, color: details.color }}
                            >
                              {details.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <p className="text-white font-medium text-xs">{details.name}</p>
                        <p className="text-[#A1A1AA] text-[10px] mt-1">{provider.estimated_time}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <Label htmlFor="amount" className="text-[#A1A1AA]">Amount (XOF)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-2 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white text-2xl font-bold h-16"
                  min={selectedProvider?.min_amount || 100}
                  max={selectedProvider?.max_amount || 5000000}
                  data-testid="amount-input"
                />
                {selectedProvider && (
                  <p className="text-[#A1A1AA] text-sm mt-2">
                    Min: {formatAmount(selectedProvider.min_amount)} | Max: {formatAmount(selectedProvider.max_amount)}
                  </p>
                )}
              </div>

              {/* Fee Calculation */}
              {calculation && (
                <Card className="bg-[#0F0F0F] border-white/10" data-testid="fee-calculation">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-[#A1A1AA]">
                        <span>Amount</span>
                        <span>{formatAmount(calculation.amount)}</span>
                      </div>
                      <div className="flex justify-between text-[#A1A1AA]">
                        <span>Fee</span>
                        <span>{formatAmount(calculation.fee)}</span>
                      </div>
                      <div className="h-px bg-white/10"></div>
                      <div className="flex justify-between text-white font-bold text-lg">
                        <span>Total</span>
                        <span className="text-[#D4AF37]">{formatAmount(calculation.total)}</span>
                      </div>
                      <p className="text-[#A1A1AA] text-sm">
                        Estimated time: {calculation.estimated_time}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canProceedStep1 || calculating}
                className="w-full bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold py-6"
                data-testid="step-1-next"
              >
                Continue
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Receiver Details */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in" data-testid="step-2">
              <Card className="bg-[#0F0F0F] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Receiver Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label htmlFor="receiver_name" className="text-[#A1A1AA]">Full Name</Label>
                    <Input
                      id="receiver_name"
                      type="text"
                      placeholder="Receiver's full name"
                      value={formData.receiver_name}
                      onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })}
                      className="mt-2 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white"
                      required
                      data-testid="receiver-name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="receiver_phone" className="text-[#A1A1AA]">Phone Number</Label>
                    <Input
                      id="receiver_phone"
                      type="tel"
                      placeholder="+226 70 00 00 00"
                      value={formData.receiver_phone}
                      onChange={(e) => setFormData({ ...formData, receiver_phone: e.target.value })}
                      className="mt-2 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white"
                      required
                      data-testid="receiver-phone"
                    />
                  </div>

                  <div>
                    <Label htmlFor="receiver_country" className="text-[#A1A1AA]">Country</Label>
                    <Select
                      value={formData.receiver_country}
                      onValueChange={(value) => setFormData({ ...formData, receiver_country: value })}
                    >
                      <SelectTrigger
                        className="mt-2 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white"
                        data-testid="receiver-country"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-white/10">
                        {countries.map((country) => (
                          <SelectItem key={country} value={country} className="text-white hover:bg-white/10">
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-[#A1A1AA]">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional information..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="mt-2 bg-[#1A1A1A] border-white/10 focus:border-[#D4AF37] text-white resize-none"
                      rows={3}
                      data-testid="notes"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                  data-testid="step-2-back"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="flex-1 bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold"
                  data-testid="step-2-next"
                >
                  Review
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <Card className="bg-[#0F0F0F] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Review Transfer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-[#1A1A1A]">
                    <div className="w-20 h-full rounded-lg flex items-center justify-center bg-[#000] p-1 overflow-hidden">
                      {brandDetails.logo ? (
                        <img src={brandDetails.logo} alt={brandDetails.name} className="w-full h-full object-contain" />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: brandDetails.color }}
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{brandDetails.name}</p>
                      <p className="text-[#A1A1AA] text-sm">{selectedProvider?.estimated_time}</p>
                    </div>
                  </div>

                  {/* Amount Summary */}
                  {calculation && (
                    <div className="space-y-3 p-4 rounded-lg bg-[#1A1A1A]">
                      <div className="flex justify-between text-[#A1A1AA]">
                        <span>Send Amount</span>
                        <span className="text-white">{formatAmount(calculation.amount)}</span>
                      </div>
                      <div className="flex justify-between text-[#A1A1AA]">
                        <span>Fee</span>
                        <span className="text-white">{formatAmount(calculation.fee)}</span>
                      </div>
                      <div className="h-px bg-white/10"></div>
                      <div className="flex justify-between font-bold text-lg">
                        <span className="text-white">Total to Pay</span>
                        <span className="text-[#D4AF37]">{formatAmount(calculation.total)}</span>
                      </div>
                    </div>
                  )}

                  {/* Receiver Info */}
                  <div className="space-y-3 p-4 rounded-lg bg-[#1A1A1A]">
                    <h4 className="text-white font-semibold">Receiver</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#A1A1AA]">Name</span>
                        <span className="text-white">{formData.receiver_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A1A1AA]">Phone</span>
                        <span className="text-white">{formData.receiver_phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#A1A1AA]">Country</span>
                        <span className="text-white">{formData.receiver_country}</span>
                      </div>
                      {formData.notes && (
                        <div className="flex justify-between">
                          <span className="text-[#A1A1AA]">Notes</span>
                          <span className="text-white">{formData.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                  data-testid="step-3-back"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#D4AF37] text-black hover:bg-[#B59326] font-semibold"
                  data-testid="submit-transfer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Confirm Transfer
                      <Check className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
};

export default NewTransfer;
