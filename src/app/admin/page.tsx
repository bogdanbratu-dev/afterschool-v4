'use client';

import { useState, useEffect } from 'react';
import { AnalyticsSection } from '@/components/AnalyticsSection';
import GASection from '@/components/GASection';

const CLUB_CATEGORIES = [
  { value: 'inot', label: '🏊 Înot' },
  { value: 'fotbal', label: '⚽ Fotbal' },
  { value: 'dansuri', label: '💃 Dansuri' },
  { value: 'arte_martiale', label: '🥋 Arte Marțiale' },
  { value: 'gimnastica', label: '🤸 Gimnastică' },
  { value: 'limbi_straine', label: '🌍 Limbi Străine' },
  { value: 'robotica', label: '🤖 Robotică / Programare' },
  { value: 'muzica', label: '🎵 Muzică' },
  { value: 'arte_creative', label: '🎨 Arte Creative' },
];

interface ClubData {
  id: number;
  name: string;
  address: string;
  sector: number;
  lat: number;
  lng: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  price_min: number | null;
  price_max: number | null;
  schedule: string | null;
  age_min: number | null;
  age_max: number | null;
  description: string | null;
  category: string;
  availability: string;
  is_premium?: number;
  contacts_hidden?: number;
}

interface AfterSchoolData {
  id: number;
  name: string;
  address: string;
  sector: number;
  lat: number;
  lng: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  price_min: number | null;
  price_max: number | null;
  pickup_time: string | null;
  end_time: string | null;
  age_min: number | null;
  age_max: number | null;
  description: string | null;
  activities: string | null;
  is_premium?: number;
  contacts_hidden?: number;
  banner_url?: string | null;
}

const emptyForm: Omit<AfterSchoolData, 'id'> = {
  name: '', address: '', sector: 1, lat: 44.4268, lng: 26.1025,
  phone: '', email: '', website: '',
  price_min: null, price_max: null,
  pickup_time: '', end_time: '',
  age_min: null, age_max: null,
  description: '', activities: '',
  banner_url: null,
};

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'afterschools' | 'clubs' | 'analytics' | 'ga' | 'reports'>('afterschools');
  const [reports, setReports] = useState<{
    id: number; timestamp: number; total_checked: number;
    changed_avail: number; changed_price: number; changed_schedule: number;
    changed_name: number; errors: number; discovery_ran: number;
    discovery_as: number; discovery_clubs: number;
  }[]>([]);
  const [analyticsData, setAnalyticsData] = useState<{
    visitsByDay: { date: string; count: number }[];
    pageBreakdown: Record<string, number>;
    deviceBreakdown: Record<string, number>;
    sourceBreakdown: Record<string, number>;
    topCountries: { country: string; count: number }[];
    topCities: { city: string; count: number }[];
    topSearches: { query: string; count: number }[];
    topClicks: { name: string; type: string; count: number }[];
    total: number;
  } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayDetails, setDayDetails] = useState<{
    date: string;
    totalVisits: number;
    pageviews: any[];
    sourceBreakdown: Record<string, number>;
    referrerBreakdown: Record<string, number>;
    searchEngineBreakdown: Record<string, number>;
    countryBreakdown: Record<string, number>;
    cityBreakdown: Record<string, number>;
    topSearches: { query: string; count: number }[];
    topClicks: { name: string; type: string; count: number }[];
    totalClicks: number;
    totalSearches: number;
  } | null>(null);
  const [searchConsoleData, setSearchConsoleData] = useState<{
    configured: boolean;
    error?: string;
    queries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
    pages: { page: string; clicks: number; impressions: number }[];
  } | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const [analyticsFrom, setAnalyticsFrom] = useState('');
  const [analyticsTo, setAnalyticsTo] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [afterschools, setAfterschools] = useState<AfterSchoolData[]>([]);
  const [editing, setEditing] = useState<AfterSchoolData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [clubs, setClubs] = useState<ClubData[]>([]);
  const [editingClub, setEditingClub] = useState<ClubData | null>(null);
  const [showClubForm, setShowClubForm] = useState(false);
  const [clubForm, setClubForm] = useState({
    name: '', address: '', sector: 1, lat: 44.4268, lng: 26.1025,
    phone: '', email: '', website: '',
    price_min: null as number | null, price_max: null as number | null,
    schedule: '', age_min: null as number | null, age_max: null as number | null,
    description: '', category: 'inot', availability: 'unknown',
    banner_url: null as string | null,
  });
  const [cronStatus, setCronStatus] = useState<{
    enabled: boolean;
    intervalDays: number;
    lastTriggered: string | null;
    running: boolean;
    progress: number;
    total: number;
    percentage: number;
    stats: { total: number; checked: number; available: number; full: number };
  } | null>(null);
  const [businessMode, setBusinessMode] = useState(false);
  const [businessModeLoading, setBusinessModeLoading] = useState(false);
  const [cronLoading, setCronLoading] = useState(false);
  const [cronMessage, setCronMessage] = useState('');
  const [editingInterval, setEditingInterval] = useState(false);
  const [intervalInput, setIntervalInput] = useState('7');
  const [bannerUploading, setBannerUploading] = useState(false);
  const [clubBannerUploading, setClubBannerUploading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(data => setAuthenticated(data.authenticated));
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadAfterschools();
      loadClubs();
      loadCronStatus();
      fetch('/api/settings').then(r => r.json()).then(d => setBusinessMode(d.business_mode));
    }
  }, [authenticated]);

  // Polling la fiecare 2s cat timp ruleaza
  useEffect(() => {
    if (!cronStatus?.running) return;
    const interval = setInterval(loadCronStatus, 2000);
    return () => clearInterval(interval);
  }, [cronStatus?.running]);

  const loadAfterschools = async () => {
    const res = await fetch('/api/admin/afterschools');
    if (res.ok) setAfterschools(await res.json());
  };

  const loadClubs = async () => {
    const res = await fetch('/api/admin/clubs');
    if (res.ok) setClubs(await res.json());
  };

  const handleSaveClub = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingClub ? `/api/admin/clubs/${editingClub.id}` : '/api/admin/clubs';
    const method = editingClub ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clubForm) });
    setShowClubForm(false);
    setEditingClub(null);
    setClubForm({ name: '', address: '', sector: 1, lat: 44.4268, lng: 26.1025, phone: '', email: '', website: '', price_min: null, price_max: null, schedule: '', age_min: null, age_max: null, description: '', category: 'inot', availability: 'unknown', banner_url: null });
    loadClubs();
  };

  const handleEditClub = (c: ClubData) => {
    setEditingClub(c);
    setClubForm({ name: c.name, address: c.address, sector: c.sector, lat: c.lat, lng: c.lng, phone: c.phone || '', email: c.email || '', website: c.website || '', price_min: c.price_min, price_max: c.price_max, schedule: c.schedule || '', age_min: c.age_min, age_max: c.age_max, description: c.description || '', category: c.category, availability: c.availability, banner_url: (c as any).banner_url || null });
    setShowClubForm(true);
  };

  const handleDeleteClub = async (id: number) => {
    if (!confirm('Esti sigur ca vrei sa stergi aceasta activitate?')) return;
    await fetch(`/api/admin/clubs/${id}`, { method: 'DELETE' });
    loadClubs();
  };

  const toggleClubPremium = async (id: number, currentVal: number) => {
    await fetch(`/api/admin/clubs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...clubs.find(c => c.id === id), is_premium: currentVal ? 0 : 1 }) });
    loadClubs();
  };

  const toggleClubContactsHidden = async (id: number, currentVal: number) => {
    await fetch(`/api/admin/clubs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...clubs.find(c => c.id === id), contacts_hidden: currentVal ? 0 : 1 }) });
    loadClubs();
  };

  const loadCronStatus = async () => {
    const res = await fetch('/api/admin/cron');
    if (res.ok) setCronStatus(await res.json());
  };

  const loadAnalytics = async (days: number, from?: string, to?: string) => {
    setAnalyticsLoading(true);
    const params = from && to ? `from=${from}&to=${to}` : `days=${days}`;
    const [res, gscRes] = await Promise.all([
      fetch(`/api/admin/analytics?${params}`),
      fetch(`/api/admin/search-console?days=${days}`),
    ]);
    if (res.ok) setAnalyticsData(await res.json());
    if (gscRes.ok) setSearchConsoleData(await gscRes.json());
    setAnalyticsLoading(false);
  };

  const loadDayDetails = async (date: string) => {
    setSelectedDay(date);
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/day?date=${date}`);
      if (res.ok) setDayDetails(await res.json());
    } catch (error) {
      console.error('Error loading day details:', error);
      setDayDetails(null);
    }
    setAnalyticsLoading(false);
  };

  const loadReports = async () => {
    const res = await fetch('/api/admin/reports');
    if (res.ok) setReports(await res.json());
  };

  const toggleBusinessMode = async () => {
    setBusinessModeLoading(true);
    const newVal = !businessMode;
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_mode: newVal }),
    });
    setBusinessMode(newVal);
    setBusinessModeLoading(false);
  };

  const togglePremium = async (id: number, currentVal: number) => {
    await fetch(`/api/admin/afterschools/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...afterschools.find(a => a.id === id), is_premium: currentVal ? 0 : 1 }),
    });
    loadAfterschools();
  };

  const toggleContactsHidden = async (id: number, currentVal: number) => {
    await fetch(`/api/admin/afterschools/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...afterschools.find(a => a.id === id), contacts_hidden: currentVal ? 0 : 1 }),
    });
    loadAfterschools();
  };

  const cronAction = async (action: 'start' | 'stop' | 'run-now' | 'stop-run') => {
    setCronLoading(true);
    setCronMessage('');
    const res = await fetch('/api/admin/cron', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setCronMessage(data.message || data.error || '');
    await loadCronStatus();
    setCronLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      setAuthenticated(true);
    } else {
      const data = await res.json();
      setLoginError(data.error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthenticated(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editing
      ? `/api/admin/afterschools/${editing.id}`
      : '/api/admin/afterschools';
    const method = editing ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    loadAfterschools();
  };

  const handleEdit = (as: AfterSchoolData) => {
    setEditing(as);
    setForm({
      name: as.name,
      address: as.address,
      sector: as.sector,
      lat: as.lat,
      lng: as.lng,
      phone: as.phone || '',
      email: as.email || '',
      website: as.website || '',
      price_min: as.price_min,
      price_max: as.price_max,
      pickup_time: as.pickup_time || '',
      end_time: as.end_time || '',
      age_min: as.age_min,
      age_max: as.age_max,
      description: as.description || '',
      activities: as.activities || '',
      banner_url: as.banner_url || null,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Esti sigur ca vrei sa stergi acest after school?')) return;
    await fetch(`/api/admin/afterschools/${id}`, { method: 'DELETE' });
    loadAfterschools();
  };

  const handleBannerUpload = async (file: File) => {
    setBannerUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload-banner', { method: 'POST', body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setForm(f => ({ ...f, banner_url: url }));
    }
    setBannerUploading(false);
  };

  const handleClubBannerUpload = async (file: File) => {
    setClubBannerUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload-banner', { method: 'POST', body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setClubForm(f => ({ ...f, banner_url: url }));
    }
    setClubBannerUploading(false);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="bg-[var(--color-card)] rounded-xl shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center mb-6 text-[var(--color-primary)]">Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-light)] mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text-main)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-light)] mb-1">Parola</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text-main)]"
              />
            </div>
            {loginError && <p className="text-sm text-[var(--color-danger)]">{loginError}</p>}
            <button
              type="submit"
              className="w-full py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
            >
              Intra in admin
            </button>
          </form>
          <div className="text-center mt-4">
            <a href="/" className="text-sm text-[var(--color-primary)] hover:underline">Inapoi la site</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Admin Header */}
      <header className="bg-[var(--color-card)] shadow-sm border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-primary)]">Admin Panel</h1>
            <p className="text-sm text-[var(--color-text-light)]">Gestioneaza after school-urile</p>
          </div>
          <div className="flex gap-3">
            <a href="/" className="px-4 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50">
              Vezi site-ul
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-[var(--color-danger)] border border-[var(--color-danger)] rounded-lg hover:bg-red-50"
            >
              Delogare
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab('afterschools')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'afterschools' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            After School-uri ({afterschools.length})
          </button>
          <button
            onClick={() => setActiveTab('clubs')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'clubs' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            🎯 Activități ({clubs.length})
          </button>
          <button
            onClick={() => { setActiveTab('analytics'); loadAnalytics(analyticsDays); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab('ga')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ga' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            📈 Google Analytics
          </button>
          <button
            onClick={() => { setActiveTab('reports'); loadReports(); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reports' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            📋 Rapoarte
          </button>
        </div>

        {/* Add Button */}
        <div className="flex justify-between items-center mb-6">
          {activeTab === 'afterschools' ? (
            <>
              <h2 className="text-lg font-semibold">After School-uri</h2>
              <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] text-sm font-medium">
                + Adauga After School
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Activități</h2>
              <button onClick={() => { setEditingClub(null); setClubForm({ name: '', address: '', sector: 1, lat: 44.4268, lng: 26.1025, phone: '', email: '', website: '', price_min: null, price_max: null, schedule: '', age_min: null, age_max: null, description: '', category: 'inot', availability: 'unknown', banner_url: null }); setShowClubForm(true); }} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] text-sm font-medium">
                + Adauga Activitate
              </button>
            </>
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
            <div className="relative bg-[var(--color-card)] rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
              <h3 className="text-lg font-bold mb-4">
                {editing ? 'Editeaza After School' : 'Adauga After School Nou'}
              </h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Nume *</label>
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text-main)]" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Adresa *</label>
                    <input required value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text-main)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sector</label>
                    <select value={form.sector} onChange={e => setForm({...form, sector: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                      {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Sector {s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Latitudine</label>
                      <input type="number" step="0.0001" value={form.lat} onChange={e => setForm({...form, lat: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Longitudine</label>
                      <input type="number" step="0.0001" value={form.lng} onChange={e => setForm({...form, lng: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefon</label>
                    <input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Website</label>
                    <input value={form.website || ''} onChange={e => setForm({...form, website: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Pret minim (lei/luna)</label>
                    <input type="number" value={form.price_min ?? ''} onChange={e => setForm({...form, price_min: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Pret maxim (lei/luna)</label>
                    <input type="number" value={form.price_max ?? ''} onChange={e => setForm({...form, price_max: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Ora preluare</label>
                    <input type="time" value={form.pickup_time || ''} onChange={e => setForm({...form, pickup_time: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Ora sfarsit program</label>
                    <input type="time" value={form.end_time || ''} onChange={e => setForm({...form, end_time: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Varsta minima</label>
                    <input type="number" value={form.age_min ?? ''} onChange={e => setForm({...form, age_min: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Varsta maxima</label>
                    <input type="number" value={form.age_max ?? ''} onChange={e => setForm({...form, age_max: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Descriere</label>
                    <textarea rows={3} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg resize-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Activitati (separate prin virgula)</label>
                    <input value={form.activities || ''} onChange={e => setForm({...form, activities: e.target.value})}
                      placeholder="Teme,Engleza,Sport,Arte"
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Banner (doar in modul Business)</label>
                    {form.banner_url && (
                      <div className="relative mb-2">
                        <img src={form.banner_url} alt="Banner" className="w-full h-28 object-cover rounded-lg border border-[var(--color-border)]" />
                        <button type="button" onClick={() => setForm(f => ({ ...f, banner_url: null }))}
                          className="absolute top-1 right-1 bg-[var(--color-card)]/80 hover:bg-[var(--color-card)] text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow">
                          ✕
                        </button>
                      </div>
                    )}
                    <input type="file" accept="image/*"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleBannerUpload(f); e.target.value = ''; }}
                      className="w-full text-sm text-[var(--color-text-light)] file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-lg file:bg-[var(--color-primary)] file:text-white file:text-sm file:cursor-pointer" />
                    {bannerUploading && <p className="text-xs text-[var(--color-text-light)] mt-1">Se incarca...</p>}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] font-medium">
                    {editing ? 'Salveaza modificarile' : 'Adauga'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border border-[var(--color-border)] rounded-lg hover:bg-gray-50">
                    Anuleaza
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <AnalyticsSection
              activeTab={activeTab}
              analyticsDays={analyticsDays}
              setAnalyticsDays={setAnalyticsDays}
              analyticsFrom={analyticsFrom}
              setAnalyticsFrom={setAnalyticsFrom}
              analyticsTo={analyticsTo}
              setAnalyticsTo={setAnalyticsTo}
              analyticsLoading={analyticsLoading}
              analyticsData={analyticsData}
              dayDetails={dayDetails}
              setDayDetails={setDayDetails}
              loadAnalytics={loadAnalytics}
              loadDayDetails={loadDayDetails}
              searchConsoleData={searchConsoleData}
            />
          </div>
        )}


        {/* Google Analytics Tab */}
        {activeTab === 'ga' && (
          <div className="space-y-6">
            <GASection />
          </div>
        )}

        {/* Business Mode Panel */}
        <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">Mod Business</h3>
              <p className="text-xs text-[var(--color-text-light)] mt-0.5">
                {businessMode
                  ? 'Activ — contactele sunt ascunse pentru listari non-premium'
                  : 'Inactiv — toate datele de contact sunt vizibile (mod lansare)'}
              </p>
            </div>
            <button
              onClick={toggleBusinessMode}
              disabled={businessModeLoading}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-40 ${
                businessMode
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {businessMode ? '★ Mod Business: Activ' : '○ Mod Business: Inactiv'}
            </button>
          </div>
        </div>

        {/* Cron Panel */}
        {cronStatus && (
          <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] p-5 mb-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-base">Verificare periodica</h3>
                <p className="text-xs text-[var(--color-text-light)] mt-0.5">
                  Crawleaza toate site-urile si actualizeaza disponibilitatea, preturile si orarul
                </p>
              </div>
              {cronStatus.running && (
                <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  In desfasurare...
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-[var(--color-primary)]">{cronStatus.stats.checked}</div>
                <div className="text-xs text-[var(--color-text-light)]">Verificate</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-600">{cronStatus.stats.available}</div>
                <div className="text-xs text-[var(--color-text-light)]">Cu locuri</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-red-500">{cronStatus.stats.full}</div>
                <div className="text-xs text-[var(--color-text-light)]">Pline</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-500">{cronStatus.stats.total - cronStatus.stats.available - cronStatus.stats.full}</div>
                <div className="text-xs text-[var(--color-text-light)]">Necunoscute</div>
              </div>
            </div>

            {/* Bara progres — vizibila doar cand ruleaza */}
            {cronStatus.running && (
              <div className="mb-5">
                <div className="flex justify-between text-xs text-[var(--color-text-light)] mb-1.5">
                  <span>Progres verificare</span>
                  <span className="font-semibold text-[var(--color-primary)]">
                    {cronStatus.percentage}% ({cronStatus.progress}/{cronStatus.total})
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-[var(--color-primary)] transition-all duration-500"
                    style={{ width: `${Math.max(cronStatus.percentage, 1)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Info interval + ultima rulare */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 text-xs text-[var(--color-text-light)]">
              {cronStatus.lastTriggered && (
                <span>Ultima rulare: <strong>{new Date(cronStatus.lastTriggered).toLocaleString('ro-RO')}</strong></span>
              )}
              <div className="flex items-center gap-1.5">
                <span>Interval verificare automata:</span>
                {editingInterval ? (
                  <form className="flex items-center gap-1" onSubmit={async (e) => {
                    e.preventDefault();
                    setCronLoading(true); setCronMessage('');
                    const res = await fetch('/api/admin/cron', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set-interval', days: intervalInput }) });
                    const data = await res.json();
                    setCronMessage(data.message || data.error || '');
                    setEditingInterval(false);
                    await loadCronStatus();
                    setCronLoading(false);
                  }}>
                    <input type="number" min="1" max="365" value={intervalInput} onChange={(e) => setIntervalInput(e.target.value)}
                      className="w-14 px-2 py-0.5 border border-[var(--color-border)] rounded text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]" autoFocus />
                    <span>zile</span>
                    <button type="submit" className="px-2 py-0.5 bg-[var(--color-primary)] text-white rounded text-xs">OK</button>
                    <button type="button" onClick={() => setEditingInterval(false)} className="px-2 py-0.5 border border-[var(--color-border)] rounded text-xs">✕</button>
                  </form>
                ) : (
                  <span className="font-medium text-[var(--color-text-main)]">
                    {cronStatus.intervalDays} {cronStatus.intervalDays === 1 ? 'zi' : 'zile'}
                    <button onClick={() => { setIntervalInput(cronStatus.intervalDays.toString()); setEditingInterval(true); }}
                      className="ml-1.5 text-[var(--color-primary)] hover:underline font-normal">Editeaza</button>
                  </span>
                )}
              </div>
            </div>

            {cronMessage && (
              <p className="text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-lg mb-4">{cronMessage}</p>
            )}

            {/* Butoane */}
            <div className="flex flex-wrap gap-2">
              {/* Toggle verificare automata */}
              <button
                onClick={() => cronAction(cronStatus.enabled ? 'stop' : 'start')}
                disabled={cronLoading}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-40 ${
                  cronStatus.enabled
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {cronStatus.enabled ? '● Verificare automata: Pornita' : '○ Verificare automata: Oprita'}
              </button>

              {/* Porneste / Opreste la cerere */}
              {cronStatus.running ? (
                <button
                  onClick={() => cronAction('stop-run')}
                  disabled={cronLoading}
                  className="px-4 py-2 text-sm rounded-lg font-medium border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  ⛔ Opreste verificarea curenta
                </button>
              ) : (
                <button
                  onClick={() => cronAction('run-now')}
                  disabled={cronLoading}
                  className="px-4 py-2 text-sm rounded-lg font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-40"
                >
                  ▶ Porneste la cerere
                </button>
              )}
            </div>
          </div>
        )}

        {/* Club Form Modal */}
        {showClubForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowClubForm(false)} />
            <div className="relative bg-[var(--color-card)] rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
              <h3 className="text-lg font-bold mb-4">{editingClub ? 'Editeaza Activitate' : 'Adauga Activitate Noua'}</h3>
              <form onSubmit={handleSaveClub} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Categorie *</label>
                    <select value={clubForm.category} onChange={e => setClubForm({...clubForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                      {CLUB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Nume *</label>
                    <input required value={clubForm.name} onChange={e => setClubForm({...clubForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text-main)]" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Adresa *</label>
                    <input required value={clubForm.address} onChange={e => setClubForm({...clubForm, address: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-text-main)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sector</label>
                    <select value={clubForm.sector} onChange={e => setClubForm({...clubForm, sector: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                      {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Sector {s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Latitudine</label>
                      <input type="number" step="0.0001" value={clubForm.lat} onChange={e => setClubForm({...clubForm, lat: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Longitudine</label>
                      <input type="number" step="0.0001" value={clubForm.lng} onChange={e => setClubForm({...clubForm, lng: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefon</label>
                    <input value={clubForm.phone || ''} onChange={e => setClubForm({...clubForm, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" value={clubForm.email || ''} onChange={e => setClubForm({...clubForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Website</label>
                    <input value={clubForm.website || ''} onChange={e => setClubForm({...clubForm, website: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Pret minim (lei/luna)</label>
                    <input type="number" value={clubForm.price_min ?? ''} onChange={e => setClubForm({...clubForm, price_min: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Pret maxim (lei/luna)</label>
                    <input type="number" value={clubForm.price_max ?? ''} onChange={e => setClubForm({...clubForm, price_max: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Program (ex: Luni, Miercuri 17:00-18:30)</label>
                    <input value={clubForm.schedule || ''} onChange={e => setClubForm({...clubForm, schedule: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Varsta minima</label>
                    <input type="number" value={clubForm.age_min ?? ''} onChange={e => setClubForm({...clubForm, age_min: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Varsta maxima</label>
                    <input type="number" value={clubForm.age_max ?? ''} onChange={e => setClubForm({...clubForm, age_max: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Descriere</label>
                    <textarea rows={3} value={clubForm.description || ''} onChange={e => setClubForm({...clubForm, description: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg resize-none" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Disponibilitate</label>
                    <select value={clubForm.availability} onChange={e => setClubForm({...clubForm, availability: e.target.value})}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                      <option value="unknown">Necunoscuta</option>
                      <option value="available">Locuri disponibile</option>
                      <option value="full">Plin</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Banner (doar in modul Business)</label>
                    {(clubForm as any).banner_url && (
                      <div className="relative mb-2">
                        <img src={(clubForm as any).banner_url} alt="Banner" className="w-full h-28 object-cover rounded-lg border border-[var(--color-border)]" />
                        <button type="button" onClick={() => setClubForm(f => ({ ...f, banner_url: null } as any))}
                          className="absolute top-1 right-1 bg-[var(--color-card)]/80 hover:bg-[var(--color-card)] text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow">
                          ✕
                        </button>
                      </div>
                    )}
                    <input type="file" accept="image/*"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleClubBannerUpload(f); e.target.value = ''; }}
                      className="w-full text-sm text-[var(--color-text-light)] file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-lg file:bg-[var(--color-primary)] file:text-white file:text-sm file:cursor-pointer" />
                    {clubBannerUploading && <p className="text-xs text-[var(--color-text-light)] mt-1">Se incarca...</p>}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] font-medium">
                    {editingClub ? 'Salveaza' : 'Adauga'}
                  </button>
                  <button type="button" onClick={() => setShowClubForm(false)} className="px-6 py-2 border border-[var(--color-border)] rounded-lg hover:bg-gray-50">
                    Anuleaza
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Table */}
        {activeTab === 'clubs' ? (
          <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Nume</th>
                    <th className="text-left px-4 py-3 font-medium">Categorie</th>
                    <th className="text-left px-4 py-3 font-medium">Adresa</th>
                    <th className="text-left px-4 py-3 font-medium">Pret</th>
                    <th className="text-left px-4 py-3 font-medium">Premium</th>
                    <th className="text-left px-4 py-3 font-medium">Contacte</th>
                    <th className="text-right px-4 py-3 font-medium">Actiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.map(c => (
                    <tr key={c.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-xs">{CLUB_CATEGORIES.find(cat => cat.value === c.category)?.label}</td>
                      <td className="px-4 py-3 text-[var(--color-text-light)]">{c.address}</td>
                      <td className="px-4 py-3">{c.price_min && `${c.price_min}-${c.price_max} lei`}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleClubPremium(c.id, c.is_premium ?? 0)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${c.is_premium ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                          {c.is_premium ? '★ Premium' : 'Free'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleClubContactsHidden(c.id, c.contacts_hidden ?? 0)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${c.contacts_hidden ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}>
                          {c.contacts_hidden ? '🔒 Ascunse' : '✓ Vizibile'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleEditClub(c)} className="text-[var(--color-primary)] hover:underline mr-3">Editeaza</button>
                        <button onClick={() => handleDeleteClub(c.id)} className="text-[var(--color-danger)] hover:underline">Sterge</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'afterschools' ? (
        <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nume</th>
                  <th className="text-left px-4 py-3 font-medium">Adresa</th>
                  <th className="text-left px-4 py-3 font-medium">Sector</th>
                  <th className="text-left px-4 py-3 font-medium">Pret</th>
                  <th className="text-left px-4 py-3 font-medium">Program</th>
                  <th className="text-left px-4 py-3 font-medium">Premium</th>
                  <th className="text-left px-4 py-3 font-medium">Contacte</th>
                  <th className="text-right px-4 py-3 font-medium">Actiuni</th>
                </tr>
              </thead>
              <tbody>
                {afterschools.map((as) => (
                  <tr key={as.id} className="border-b border-[var(--color-border)] hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{as.name}</td>
                    <td className="px-4 py-3 text-[var(--color-text-light)]">{as.address}</td>
                    <td className="px-4 py-3">{as.sector}</td>
                    <td className="px-4 py-3">{as.price_min && `${as.price_min}-${as.price_max} lei`}</td>
                    <td className="px-4 py-3">{as.pickup_time && `${as.pickup_time} - ${as.end_time}`}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePremium(as.id, as.is_premium ?? 0)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          as.is_premium
                            ? 'bg-amber-400 text-white hover:bg-amber-500'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {as.is_premium ? '★ Premium' : 'Free'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleContactsHidden(as.id, as.contacts_hidden ?? 0)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          as.contacts_hidden
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                      >
                        {as.contacts_hidden ? '🔒 Ascunse' : '✓ Vizibile'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEdit(as)}
                        className="text-[var(--color-primary)] hover:underline mr-3"
                      >
                        Editeaza
                      </button>
                      <button
                        onClick={() => handleDelete(as.id)}
                        className="text-[var(--color-danger)] hover:underline"
                      >
                        Sterge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        ) : null}
        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-lg font-semibold mb-6">Istoricul verificărilor automate</h2>
            {reports.length === 0 ? (
              <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-12 text-center text-[var(--color-text-light)]">
                Nu există rapoarte încă. Rapoartele apar după prima verificare automată.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {reports.map(r => {
                  const totalChanges = r.changed_avail + r.changed_price + r.changed_schedule + r.changed_name;
                  const status = r.errors > 0 ? '⚠️' : totalChanges > 0 ? '✏️' : '✅';
                  const date = new Date(r.timestamp).toLocaleString('ro-RO');
                  return (
                    <div key={r.id} className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{status}</span>
                          <div>
                            <div className="font-semibold">{date}</div>
                            <div className="text-xs text-[var(--color-text-light)]">{r.total_checked} afterschool-uri verificate</div>
                          </div>
                        </div>
                        {totalChanges > 0 && (
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                            {totalChanges} modificări
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { label: 'Disponibilitate', val: r.changed_avail },
                          { label: 'Preț', val: r.changed_price },
                          { label: 'Orar', val: r.changed_schedule },
                          { label: 'Nume', val: r.changed_name },
                          { label: 'Erori', val: r.errors, isError: true },
                        ].map(item => (
                          <div key={item.label} className="bg-[var(--color-bg)] rounded-lg p-3 text-center">
                            <div className={`text-2xl font-bold ${item.isError && item.val > 0 ? 'text-[var(--color-danger)]' : item.val > 0 ? 'text-amber-500' : 'text-[var(--color-success)]'}`}>
                              {item.val}
                            </div>
                            <div className="text-xs text-[var(--color-text-light)] mt-1">{item.label}</div>
                          </div>
                        ))}
                      </div>
                      {r.discovery_ran === 1 && (
                        <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex gap-4 text-sm text-[var(--color-text-light)]">
                          <span>🔎 Discovery: <strong className="text-[var(--color-primary)]">{r.discovery_as}</strong> afterschool-uri noi, <strong className="text-[var(--color-primary)]">{r.discovery_clubs}</strong> cluburi noi</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
