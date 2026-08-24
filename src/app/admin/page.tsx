'use client';

import { useState, useEffect } from 'react';
import { AnalyticsSection } from '@/components/AnalyticsSection';
import GASection from '@/components/GASection';
import AdminListings from '@/components/AdminListings';
import PotrivireLeadsTab from '@/components/PotrivireLeadsTab';
import AdminGrowth from '@/components/AdminGrowth';
import OutreachTab from '@/components/OutreachTab';
import CateringAdmin from '@/components/CateringAdmin';
import ProfessionalsAdmin from '@/components/ProfessionalsAdmin';
import KindergartensAdmin from '@/components/KindergartensAdmin';
import TutorsAdmin from '@/components/TutorsAdmin';
import ExpiringAlert from '@/components/ExpiringAlert';
import MicrositesAdmin from '@/components/MicrositesAdmin';
import FbOutreach from '@/components/FbOutreach';
import FbAutoPost from '@/components/FbAutoPost';
import WaOutreach from '@/components/WaOutreach';
import MicrositePitchTab from '@/components/MicrositePitchTab';
import CircSchoolsTab from '@/components/CircSchoolsTab';
import AdCalibrationTab from '@/components/AdCalibrationTab';

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
  leads_enabled?: number | null;
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
  premium_expires_at?: string | null;
  contacts_hidden?: number;
  is_paused?: number;
  banner_url?: string | null;
  editorial_summary?: string | null;
  photo_urls?: string | null;
  leads_enabled?: number | null;
}

const emptyForm: Omit<AfterSchoolData, 'id'> = {
  name: '', address: '', sector: 1, lat: 44.4268, lng: 26.1025,
  phone: '', email: '', website: '',
  price_min: null, price_max: null,
  pickup_time: '', end_time: '',
  age_min: null, age_max: null,
  description: '', activities: '',
  banner_url: null,
  editorial_summary: null as string | null,
  photo_urls: null as string | null,
  premium_expires_at: null as string | null,
  is_premium: 0,
  contacts_hidden: 0,
  leads_enabled: null,
};

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'afterschools' | 'clubs' | 'analytics' | 'saturation' | 'reports' | 'listings' | 'potrivireLeads' | 'growthCampaigns' | 'users' | 'outreach' | 'catering' | 'professionals' | 'kindergartens' | 'tutors' | 'microsites' | 'fboutreach' | 'fbautopost' | 'waoutreach' | 'micrositepitch' | 'circschools' | 'adcalibration'>('afterschools');
  const [msResult, setMsResult] = useState<{ microsite_url: string; magic_link: string } | null>(null);
  const [editMicrosite, setEditMicrosite] = useState<{ id: number; outreach_enabled: number; resend_api_key: string; outreach_from_email: string } | null>(null);
  const [msCreating, setMsCreating] = useState<number | null>(null);
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
  const [spotlight, setSpotlight] = useState<{ ratio: number; min: number; max: number; windowMin: number; alertRatio: number }>({ ratio: 0.25, min: 1, max: 4, windowMin: 15, alertRatio: 0.5 });
  const [spotlightSaving, setSpotlightSaving] = useState(false);
  const [spotlightSaved, setSpotlightSaved] = useState(false);
  const [saturation, setSaturation] = useState<{ label: string; sector: number | null; total: number; premium: number; k: number; occupiedSlots: number; occupancy: number; untilHalf: number; alertLevel: 'ok' | 'near' | 'over' }[] | null>(null);
  const [saturationLoading, setSaturationLoading] = useState(false);
  const [zoneSaturation, setZoneSaturation] = useState<{ label: string; zone: string; total: number; premium: number; k: number; occupiedSlots: number; occupancy: number; untilHalf: number; alertLevel: 'ok' | 'near' | 'over' }[] | null>(null);
  const [saturationView, setSaturationView] = useState<'sector' | 'zona'>('sector');
  const [zoneOverrides, setZoneOverrides] = useState<{ table: string; sector: number | null; config: Record<string, number> }[]>([]);
  const [overrideForm, setOverrideForm] = useState({ table: 'afterschools', sector: '', ratio: '', min: '', max: '', alertRatio: '' });
  const [cronLoading, setCronLoading] = useState(false);
  const [cronMessage, setCronMessage] = useState('');
  const [editingInterval, setEditingInterval] = useState(false);
  const [intervalInput, setIntervalInput] = useState('7');
  const [bannerUploading, setBannerUploading] = useState(false);
  const [clubBannerUploading, setClubBannerUploading] = useState(false);
  const [asSearch, setAsSearch] = useState('');
  const [clubSearch, setClubSearch] = useState('');
  const [selectedAS, setSelectedAS] = useState<Set<number>>(new Set());
  const [selectedClubs, setSelectedClubs] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [outreachData, setOutreachData] = useState<Record<string, any[]> | null>(null);
  const [outreachFilter, setOutreachFilter] = useState<string>('pending');

  const loadUsers = async () => {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Stergi contul si resetezi listarea asociata?')) return;
    const res = await fetch('/api/admin/users/' + id, { method: 'DELETE' });
    if (!res.ok) { alert('Stergerea a esuat. Vezi consola/log-urile serverului.'); return; }
    setUsers(u => u.filter((x: any) => x.id !== id));
  };
  const loadOutreach = async () => {
    const res = await fetch('/api/admin/outreach');
    const data = await res.json();
    setOutreachData(data);
  };

  const updateOutreach = async (type: string, id: number, status: string) => {
    await fetch('/api/admin/outreach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_type: type, listing_id: id, status }),
    });
    await loadOutreach();
  };

  const [clubCategoryFilter, setClubCategoryFilter] = useState('');

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
      fetch('/api/settings').then(r => r.json()).then(d => { setBusinessMode(d.business_mode); if (d.spotlight) setSpotlight(d.spotlight); });
      loadSaturation();
      loadZoneOverrides();
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
    if (editMicrosite?.id) {
      await fetch(`/api/admin/microsites/${editMicrosite.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outreach_enabled: editMicrosite.outreach_enabled, resend_api_key: editMicrosite.resend_api_key, outreach_from_email: editMicrosite.outreach_from_email }),
      });
    }
    setShowClubForm(false);
    setEditingClub(null);
    setClubForm({ name: '', address: '', sector: 1, lat: 44.4268, lng: 26.1025, phone: '', email: '', website: '', price_min: null, price_max: null, schedule: '', age_min: null, age_max: null, description: '', category: 'inot', availability: 'unknown', banner_url: null });
    setEditMicrosite(null);
    loadClubs();
  };

  const handleEditClub = async (c: ClubData) => {
    setEditingClub(c);
    setClubForm({ name: c.name, address: c.address, sector: c.sector, lat: c.lat, lng: c.lng, phone: c.phone || '', email: c.email || '', website: c.website || '', price_min: c.price_min, price_max: c.price_max, schedule: c.schedule || '', age_min: c.age_min, age_max: c.age_max, description: c.description || '', category: c.category, availability: c.availability, banner_url: (c as any).banner_url || null, editorial_summary: (c as any).editorial_summary || '', photo_urls: (c as any).photo_urls || null } as any);
    setClubForm(f => ({ ...f, premium_expires_at: (c as any).premium_expires_at || null, leads_enabled: (c as any).leads_enabled ?? null } as any));
    // Fetch associated microsite for outreach config
    try {
      const mr = await fetch(`/api/admin/microsites?listing_type=club&listing_id=${c.id}`);
      const md = await mr.json();
      if (md && md.id) setEditMicrosite({ id: md.id, outreach_enabled: md.outreach_enabled ?? 0, resend_api_key: md.resend_api_key ?? '', outreach_from_email: md.outreach_from_email ?? '' });
      else setEditMicrosite(null);
    } catch { setEditMicrosite(null); }
    setShowClubForm(true);
  };

  const handleDeleteClub = async (id: number) => {
    if (!confirm('Esti sigur ca vrei sa stergi aceasta activitate?')) return;
    await fetch(`/api/admin/clubs/${id}`, { method: 'DELETE' });
    loadClubs();
  };

  const toggleClubPremium = async (id: number, currentVal: number) => {
    if (!currentVal) {
      const target = clubs.find(c => c.id === id);
      if (target && target.sector != null) {
        const sec = target.sector;
        const inZone = clubs.filter(c => c.sector === sec);
        const premiumInZone = inZone.filter(c => c.is_premium).length;
        const total = inZone.length;
        if (total >= 4 && (premiumInZone + 1) / total >= spotlight.alertRatio) {
          const pct = Math.round(((premiumInZone + 1) / total) * 100);
          const proceed = window.confirm(
            `Atentie: in Sector ${sec} vei avea ${premiumInZone + 1} din ${total} activitati premium (${pct}%), peste pragul de ${Math.round(spotlight.alertRatio * 100)}%.\n\nContinui totusi?`
          );
          if (!proceed) return;
        }
      }
    }
    await fetch(`/api/admin/clubs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...clubs.find(c => c.id === id), is_premium: currentVal ? 0 : 1 }) });
    loadClubs();
  };

  const toggleClubContactsHidden = async (id: number, currentVal: number) => {
    await fetch(`/api/admin/clubs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...clubs.find(c => c.id === id), contacts_hidden: currentVal ? 0 : 1 }) });
    loadClubs();
  };

  const toggleClubSelect = (id: number) => {
    setSelectedClubs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllClubs = () => {
    setSelectedClubs(prev => prev.size === filteredClubs.length ? new Set() : new Set(filteredClubs.map(c => c.id)));
  };
  const bulkSetClubContactsHidden = async (hidden: boolean) => {
    setBulkLoading(true);
    await fetch('/api/admin/clubs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selectedClubs], contacts_hidden: hidden }) });
    setSelectedClubs(new Set());
    await loadClubs();
    setBulkLoading(false);
  };

  const toggleASSelect = (id: number) => {
    setSelectedAS(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllAS = () => {
    setSelectedAS(prev => prev.size === filteredAfterschools.length ? new Set() : new Set(filteredAfterschools.map(a => a.id)));
  };
  const bulkSetASContactsHidden = async (hidden: boolean) => {
    setBulkLoading(true);
    await fetch('/api/admin/afterschools', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [...selectedAS], contacts_hidden: hidden }) });
    setSelectedAS(new Set());
    await loadAfterschools();
    setBulkLoading(false);
  };

  const loadCronStatus = async () => {
    const res = await fetch('/api/admin/cron');
    if (res.ok) setCronStatus(await res.json());
  };

  const loadAnalytics = async (days: number, from?: string, to?: string, page?: string) => {
    setAnalyticsLoading(true);
    let params = from && to ? `from=${from}&to=${to}` : `days=${days}`;
    if (page) params += `&page=${encodeURIComponent(page)}`;
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

  const saveSpotlight = async () => {
    setSpotlightSaving(true);
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spotlight }),
    });
    setSpotlightSaving(false);
    setSpotlightSaved(true);
    setTimeout(() => setSpotlightSaved(false), 2000);
  };

  const loadSaturation = async () => {
    setSaturationLoading(true);
    const res = await fetch('/api/admin/saturation');
    const d = await res.json();
    setSaturation(d.rows || []);
    setZoneSaturation(d.zoneRows || []);
    setSaturationLoading(false);
  };

  const loadZoneOverrides = async () => {
    const res = await fetch('/api/admin/zone-overrides');
    if (res.ok) setZoneOverrides(await res.json());
  };

  const saveZoneOverride = async () => {
    const { table, sector, ratio, min, max, alertRatio } = overrideForm;
    const config: Record<string, number> = {};
    if (ratio !== '') config.ratio = parseFloat(ratio);
    if (min !== '') config.min = parseInt(min);
    if (max !== '') config.max = parseInt(max);
    if (alertRatio !== '') config.alertRatio = parseFloat(alertRatio);
    if (Object.keys(config).length === 0) return;
    await fetch('/api/admin/zone-overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, sector: sector !== '' ? parseInt(sector) : null, config }),
    });
    setOverrideForm({ table: 'afterschools', sector: '', ratio: '', min: '', max: '', alertRatio: '' });
    loadZoneOverrides();
    loadSaturation();
  };

  const deleteZoneOverride = async (table: string, sector: number | null) => {
    await fetch('/api/admin/zone-overrides', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, sector }),
    });
    loadZoneOverrides();
    loadSaturation();
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
    const target = afterschools.find(a => a.id === id) as any;
    // Avertizare la vanzare: activarea premium impinge sectorul peste pragul de alerta?
    if (!currentVal && target && target.sector != null) {
      const sec = target.sector;
      const inZone = (afterschools as any[]).filter(a => a.sector === sec);
      const premiumInZone = inZone.filter(a => a.is_premium).length;
      const total = inZone.length;
      if (total > 0 && (premiumInZone + 1) / total >= spotlight.alertRatio) {
        const pct = Math.round(((premiumInZone + 1) / total) * 100);
        const proceed = window.confirm(
          `Atentie: in Sector ${sec} vei avea ${premiumInZone + 1} din ${total} afterschool-uri premium (${pct}%), peste pragul de ${Math.round(spotlight.alertRatio * 100)}%.\n\nCu cat sunt mai multe premium intr-o zona, cu atat valoarea scade pentru fiecare. Recomandare: creste pretul in zona asta, nu opri vanzarea.\n\nContinui totusi?`
        );
        if (!proceed) return;
      }
    }
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

  const togglePaused = async (id: number, currentVal: number) => {
    await fetch(`/api/admin/afterschools/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...afterschools.find(a => a.id === id), is_paused: currentVal ? 0 : 1 }),
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

    if (editMicrosite?.id) {
      await fetch(`/api/admin/microsites/${editMicrosite.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outreach_enabled: editMicrosite.outreach_enabled, resend_api_key: editMicrosite.resend_api_key, outreach_from_email: editMicrosite.outreach_from_email }),
      });
    }
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    setEditMicrosite(null);
    loadAfterschools();
  };

  const handleEdit = async (as: AfterSchoolData) => {
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
      editorial_summary: (as as any).editorial_summary || null,
      photo_urls: (as as any).photo_urls || null,
      premium_expires_at: (as as any).premium_expires_at || null,
      is_premium: (as as any).is_premium ?? 0,
      contacts_hidden: (as as any).contacts_hidden ?? 0,
      is_paused: (as as any).is_paused ?? 0,
      leads_enabled: (as as any).leads_enabled ?? null,
    });
    // Fetch associated microsite for outreach config
    try {
      const mr = await fetch(`/api/admin/microsites?listing_type=afterschool&listing_id=${as.id}`);
      const md = await mr.json();
      if (md && md.id) setEditMicrosite({ id: md.id, outreach_enabled: md.outreach_enabled ?? 0, resend_api_key: md.resend_api_key ?? '', outreach_from_email: md.outreach_from_email ?? '' });
      else setEditMicrosite(null);
    } catch { setEditMicrosite(null); }
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

  const filteredAfterschools = afterschools.filter(a => {
    const q = asSearch.toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.address.toLowerCase().includes(q);
  });

  const filteredClubs = clubs.filter(c => {
    const q = clubSearch.toLowerCase();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q);
    const matchesCategory = !clubCategoryFilter || c.category === clubCategoryFilter;
    return matchesSearch && matchesCategory;
  });

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

  const quickCreateMicrosite = async (type: string, id: number) => {
    setMsCreating(id);
    const res = await fetch('/api/admin/microsites/quick-create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_type: type, listing_id: id }),
    });
    const data = await res.json();
    setMsCreating(null);
    if (res.ok) setMsResult(data);
    else alert(data.error || 'Eroare la creare microsite');
  };

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
            onClick={() => setActiveTab('saturation')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'saturation' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            🎯 Ocupare Premium
          </button>
          <button
            onClick={() => { setActiveTab('reports'); loadReports(); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reports' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            📋 Rapoarte
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'listings' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            🏢 Listari
          </button>
          <button
            onClick={() => setActiveTab('potrivireLeads')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'potrivireLeads' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            🎯 Potrivire
          </button>
          <button
            onClick={() => setActiveTab('growthCampaigns')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'growthCampaigns' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            🚀 Growth
          </button>
          <button
            onClick={() => { setActiveTab('users'); loadUsers(); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            👥 Useri
          </button>
          <button
            onClick={() => { setActiveTab('outreach'); loadOutreach(); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'outreach' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            📣 Outreach
          </button>
          <button
            onClick={() => setActiveTab('catering')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'catering' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            🍽️ Catering
          </button>
          <button
            onClick={() => setActiveTab('professionals')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'professionals' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            👨‍🏫 Colaboratori
          </button>
          <button
            onClick={() => setActiveTab('kindergartens')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'kindergartens' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            🧸 Grădinițe
          </button>
          <button
            onClick={() => setActiveTab('tutors')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tutors' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            📚 Meditații
          </button>
          <button
            onClick={() => setActiveTab('microsites')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'microsites' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            🌐 Micro-site-uri
          </button>
          <button
            onClick={() => setActiveTab('fboutreach')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fboutreach' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            📣 Outreach FB
          </button>
          <button
            onClick={() => setActiveTab('fbautopost')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fbautopost' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            🤖 Auto-postare FB
          </button>
          <button
            onClick={() => setActiveTab('waoutreach')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'waoutreach' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            📱 Outreach WA
          </button>
          <button
            onClick={() => setActiveTab('micrositepitch')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'micrositepitch' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            🌐 Pachet site
          </button>
          <button
            onClick={() => setActiveTab('circschools')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'circschools' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            🏫 Circumscripții
          </button>
          <button
            onClick={() => setActiveTab('adcalibration')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'adcalibration' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-light)] hover:text-[var(--color-text-main)]'}`}
          >
            📊 Calibrare reclame
          </button>
        </div>

        {/* Add Button + Search */}
        {(activeTab === 'afterschools' || activeTab === 'clubs') && (
          <div className="mb-6 space-y-3">
            <div className="flex justify-between items-center">
              {activeTab === 'afterschools' ? (
                <>
                  <h2 className="text-lg font-semibold">
                    After School-uri
                    {asSearch && <span className="ml-2 text-sm font-normal text-[var(--color-text-light)]">({filteredAfterschools.length} din {afterschools.length})</span>}
                  </h2>
                  <button onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] text-sm font-medium">
                    + Adauga After School
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">
                    Activități
                    {(clubSearch || clubCategoryFilter) && <span className="ml-2 text-sm font-normal text-[var(--color-text-light)]">({filteredClubs.length} din {clubs.length})</span>}
                  </h2>
                  <button onClick={() => { setEditingClub(null); setClubForm({ name: '', address: '', sector: 1, lat: 44.4268, lng: 26.1025, phone: '', email: '', website: '', price_min: null, price_max: null, schedule: '', age_min: null, age_max: null, description: '', category: 'inot', availability: 'unknown', banner_url: null }); setShowClubForm(true); }} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] text-sm font-medium">
                    + Adauga Activitate
                  </button>
                </>
              )}
            </div>
            {activeTab === 'afterschools' && (
              <input
                type="search"
                placeholder="Caută după nume sau adresă..."
                value={asSearch}
                onChange={e => setAsSearch(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)] text-[var(--color-text-main)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            )}
            {activeTab === 'clubs' && (
              <div className="flex gap-3">
                <input
                  type="search"
                  placeholder="Caută după nume sau adresă..."
                  value={clubSearch}
                  onChange={e => setClubSearch(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)] text-[var(--color-text-main)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <select
                  value={clubCategoryFilter}
                  onChange={e => setClubCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">Toate categoriile</option>
                  {CLUB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Descriere Google (editorial summary)</label>
                    <textarea rows={2} value={(form as any).editorial_summary || ''} onChange={e => setForm(f => ({ ...f, editorial_summary: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg resize-none text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Poze carusel (max 3 URL-uri)</label>
                    {((form as any).photo_urls ? JSON.parse((form as any).photo_urls) : []).map((url: string, i: number) => (
                      <div key={i} className="flex gap-2 items-center mb-2">
                        <img src={url} alt={`Foto ${i+1}`} className="w-16 h-12 object-cover rounded border border-[var(--color-border)] flex-shrink-0" />
                        <input value={url} onChange={e => {
                          const arr = JSON.parse((form as any).photo_urls || '[]');
                          arr[i] = e.target.value;
                          setForm(f => ({ ...f, photo_urls: JSON.stringify(arr) }));
                        }} className="flex-1 px-2 py-1 border border-[var(--color-border)] rounded text-xs" />
                        <button type="button" onClick={() => {
                          const arr = JSON.parse((form as any).photo_urls || '[]').filter((_: string, j: number) => j !== i);
                          setForm(f => ({ ...f, photo_urls: arr.length ? JSON.stringify(arr) : null }));
                        }} className="text-red-500 hover:text-red-700 font-bold text-sm px-1">✕</button>
                      </div>
                    ))}
                    {((form as any).photo_urls ? JSON.parse((form as any).photo_urls) : []).length < 3 && (
                      <button type="button" onClick={() => {
                        const url = prompt('URL poza:');
                        if (!url) return;
                        const arr = (form as any).photo_urls ? JSON.parse((form as any).photo_urls) : [];
                        setForm(f => ({ ...f, photo_urls: JSON.stringify([...arr, url]) }));
                      }} className="text-sm text-[var(--color-primary)] hover:underline">+ Adauga poza</button>
                    )}
                  </div>
                </div>
                {editing && editMicrosite && (
                  <div className="md:col-span-2 mt-2 border border-teal-200 rounded-xl p-4 bg-teal-50/40 space-y-3">
                    <p className="text-sm font-semibold text-teal-800">Outreach partener</p>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editMicrosite.outreach_enabled === 1} onChange={e => setEditMicrosite(m => m ? { ...m, outreach_enabled: e.target.checked ? 1 : 0 } : m)}
                          className="w-4 h-4 text-teal-600 rounded" />
                        <span className="text-sm font-medium text-teal-800">Activat</span>
                      </label>
                    </div>
                    {editMicrosite.outreach_enabled === 1 && <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Resend API Key</label>
                        <input type="password" value={editMicrosite.resend_api_key} onChange={e => setEditMicrosite(m => m ? { ...m, resend_api_key: e.target.value } : m)}
                          placeholder="re_..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email expeditor (From)</label>
                        <input type="email" value={editMicrosite.outreach_from_email} onChange={e => setEditMicrosite(m => m ? { ...m, outreach_from_email: e.target.value } : m)}
                          placeholder="contact@expertcatering.ro" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                      </div>
                    </>}
                  </div>
                )}
                {editing && !editMicrosite && (
                  <div className="md:col-span-2 mt-2 text-xs text-gray-400 italic">Creeaza mai intai un microsite pentru acest listing pentru a configura outreach-ul.</div>
                )}
                <div className="md:col-span-2 mt-1">
                  <label className="block text-sm font-medium mb-1">Data expirare Premium</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={(form as any).premium_expires_at || ''}
                      onChange={e => setForm(f => ({ ...f, premium_expires_at: e.target.value || null }))}
                      className="px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)]"
                    />
                    {([['+ 1 lună', 1], ['+ 3 luni', 3], ['+ 6 luni', 6], ['+ 1 an', 12]] as [string, number][]).map(([lbl, mo]) => (
                      <button key={lbl} type="button"
                        onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + mo); setForm(f => ({ ...f, premium_expires_at: d.toISOString().split('T')[0] })); }}
                        className="text-xs px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded border border-amber-200 font-medium">
                        {lbl}
                      </button>
                    ))}
                    {(form as any).premium_expires_at && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, premium_expires_at: null }))}
                        className="text-xs px-2 py-1 text-gray-400 hover:text-red-500">✕ Șterge data</button>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center gap-2 text-sm">
                  <span className="text-[var(--color-text-light)]">💬 Formular de contact (Solicită informații):</span>
                  <select value={form.leads_enabled ?? ''} onChange={e => setForm(f => ({ ...f, leads_enabled: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs bg-[var(--color-bg)]">
                    <option value="">Auto (activat implicit)</option>
                    <option value="1">Mereu activ</option>
                    <option value="0">Mereu inactiv</option>
                  </select>
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
            <hr className="border-[var(--color-border)]" />
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

        {activeTab === 'saturation' && (
        <div className="space-y-6">
        {/* Premium Spotlight Panel */}
        <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] p-5 mb-6">
          <div className="mb-3">
            <h3 className="font-semibold text-base">Spotlight Premium (rotatie)</h3>
            <p className="text-xs text-[var(--color-text-light)] mt-0.5">
              Cate listari premium se fixeaza sus per zona. Restul premium raman cu contactele deblocate, dar in pozitie normala. Peste capacitate, se rotesc echitabil intre ele.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <label className="text-sm">
              <span className="block text-xs text-[var(--color-text-light)] mb-1">Procent zona (0-1)</span>
              <input type="number" step="0.05" min="0" max="1" value={spotlight.ratio}
                onChange={e => setSpotlight(s => ({ ...s, ratio: parseFloat(e.target.value) }))}
                className="w-full border border-[var(--color-border)] rounded px-2 py-1.5 bg-transparent" />
            </label>
            <label className="text-sm">
              <span className="block text-xs text-[var(--color-text-light)] mb-1">Minim (podea)</span>
              <input type="number" step="1" min="0" max="50" value={spotlight.min}
                onChange={e => setSpotlight(s => ({ ...s, min: parseInt(e.target.value) }))}
                className="w-full border border-[var(--color-border)] rounded px-2 py-1.5 bg-transparent" />
            </label>
            <label className="text-sm">
              <span className="block text-xs text-[var(--color-text-light)] mb-1">Maxim (plafon)</span>
              <input type="number" step="1" min="1" max="100" value={spotlight.max}
                onChange={e => setSpotlight(s => ({ ...s, max: parseInt(e.target.value) }))}
                className="w-full border border-[var(--color-border)] rounded px-2 py-1.5 bg-transparent" />
            </label>
            <label className="text-sm">
              <span className="block text-xs text-[var(--color-text-light)] mb-1">Rotatie (min)</span>
              <input type="number" step="1" min="1" max="1440" value={spotlight.windowMin}
                onChange={e => setSpotlight(s => ({ ...s, windowMin: parseInt(e.target.value) }))}
                className="w-full border border-[var(--color-border)] rounded px-2 py-1.5 bg-transparent" />
            </label>
            <label className="text-sm">
              <span className="block text-xs text-[var(--color-text-light)] mb-1">Alerta la % zona</span>
              <input type="number" step="0.05" min="0" max="1" value={spotlight.alertRatio}
                onChange={e => setSpotlight(s => ({ ...s, alertRatio: parseFloat(e.target.value) }))}
                className="w-full border border-[var(--color-border)] rounded px-2 py-1.5 bg-transparent" />
            </label>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="text-xs text-[var(--color-text-light)]">
              Exemplu spotlight/zona: {[5, 10, 20].map(n => { const k = Math.min(spotlight.max, Math.max(spotlight.min, Math.round(n * spotlight.ratio))); return n + '→' + k; }).join('   ·   ')}
            </div>
            <button onClick={saveSpotlight} disabled={spotlightSaving}
              className="ml-auto px-4 py-2 text-sm rounded-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40">
              {spotlightSaving ? 'Salvez...' : spotlightSaved ? '✓ Salvat' : 'Salveaza'}
            </button>
          </div>
        </div>

        {/* Grad de ocupare premium / zona */}
        <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] p-5 mb-6">
          <div className="flex items-center justify-between mb-3">

            <div>

              <h3 className="font-semibold text-base">Grad de ocupare premium</h3>

              <p className="text-xs text-[var(--color-text-light)] mt-0.5">Sloturi = premium ocupate din capacitatea de spotlight. „Pana la 1/2” = cate vanzari mai poti face pana treci pragul de alerta. Rosu = depasit, galben = urmatoarea vanzare il trece.</p>

            </div>

            <div className="flex items-center gap-2">

              <div className="flex rounded-lg overflow-hidden border border-[var(--color-border)] text-sm">

                <button onClick={() => setSaturationView('sector')} className={`px-3 py-1.5 transition-colors ${saturationView === 'sector' ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-bg)]'}`}>Per sector</button>

                <button onClick={() => setSaturationView('zona')} className={`px-3 py-1.5 transition-colors ${saturationView === 'zona' ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-bg)]'}`}>Per cartier</button>

              </div>

              <button onClick={loadSaturation} disabled={saturationLoading} className="px-4 py-2 text-sm rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-40">

                {saturationLoading ? 'Verific...' : 'Reincarca'}

              </button>

            </div>

          </div>
          {saturationView === 'sector' && saturation && saturation.some(r => r.alertLevel !== 'ok') && (
            <div className="mb-3 text-sm rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800">
              ⚠ {saturation.filter(r => r.alertLevel === 'over').length} sectoare peste prag, {saturation.filter(r => r.alertLevel === 'near').length} aproape sa treaca. Ia in calcul cresterea pretului acolo.
            </div>
          )}
          {saturationView === 'zona' && zoneSaturation && zoneSaturation.some(r => r.alertLevel !== 'ok') && (
            <div className="mb-3 text-sm rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800">
              ⚠ {zoneSaturation.filter(r => r.alertLevel === 'over').length} cartiere peste prag, {zoneSaturation.filter(r => r.alertLevel === 'near').length} aproape sa treaca.
            </div>
          )}
          {saturationView === 'sector' && saturation && (saturation.length === 0 ? (
            <p className="text-xs text-[var(--color-text-light)]">Nicio zona inca.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-[var(--color-text-light)] border-b border-[var(--color-border)]">
                  <th className="py-1.5 pr-3">Afacere</th><th className="pr-3">Sector</th><th className="pr-3">Listari</th><th className="pr-3">Premium</th><th className="pr-3 w-44">Grad ocupare</th><th className="pr-3">Sloturi</th><th className="pr-3">Pana la 1/2</th>
                </tr></thead>
                <tbody>
                  {saturation.map((r, i) => (
                    <tr key={i} className={`border-b border-[var(--color-border)] ${r.alertLevel === 'over' ? 'bg-red-100' : r.alertLevel === 'near' ? 'bg-amber-50' : ''}`}>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{r.label}</td>
                      <td className="pr-3">{r.sector ?? '—'}</td>
                      <td className="pr-3">{r.total}</td>
                      <td className={`pr-3 ${r.alertLevel === 'over' ? 'text-red-600 font-semibold' : r.alertLevel === 'near' ? 'text-amber-700 font-semibold' : ''}`}>{r.premium}</td>
                      <td className="pr-3">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 h-2 rounded bg-gray-200 overflow-hidden min-w-[70px]">
                            <div className={`h-full ${r.alertLevel === 'over' ? 'bg-red-500' : r.alertLevel === 'near' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Math.round(r.occupancy * 100))}%` }} />
                          </div>
                          <span className="text-xs tabular-nums w-9 text-right">{Math.round(r.occupancy * 100)}%</span>
                        </div>
                      </td>
                      <td className="pr-3 tabular-nums">{r.occupiedSlots}/{r.k}</td>
                      <td className="pr-3 tabular-nums">{r.alertLevel === 'over' ? <span className="text-red-600 font-semibold">depasit</span> : r.untilHalf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {saturationView === 'zona' && zoneSaturation && (zoneSaturation.length === 0 ? (
            <p className="text-xs text-[var(--color-text-light)]">Nicio zona detectata inca.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-[var(--color-text-light)] border-b border-[var(--color-border)]">
                  <th className="py-1.5 pr-3">Afacere</th><th className="pr-3 min-w-[130px]">Cartier</th><th className="pr-3">Listari</th><th className="pr-3">Premium</th><th className="pr-3 w-44">Grad ocupare</th><th className="pr-3">Sloturi</th><th className="pr-3">Pana la 1/2</th>
                </tr></thead>
                <tbody>
                  {zoneSaturation.map((r, i) => (
                    <tr key={i} className={`border-b border-[var(--color-border)] ${r.alertLevel === 'over' ? 'bg-red-100' : r.alertLevel === 'near' ? 'bg-amber-50' : ''}`}>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{r.label}</td>
                      <td className="pr-3 whitespace-nowrap font-medium">{r.zone}</td>
                      <td className="pr-3">{r.total}</td>
                      <td className={`pr-3 ${r.alertLevel === 'over' ? 'text-red-600 font-semibold' : r.alertLevel === 'near' ? 'text-amber-700 font-semibold' : ''}`}>{r.premium}</td>
                      <td className="pr-3">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 h-2 rounded bg-gray-200 overflow-hidden min-w-[70px]">
                            <div className={`h-full ${r.alertLevel === 'over' ? 'bg-red-500' : r.alertLevel === 'near' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Math.round(r.occupancy * 100))}%` }} />
                          </div>
                          <span className="text-xs tabular-nums w-9 text-right">{Math.round(r.occupancy * 100)}%</span>
                        </div>
                      </td>
                      <td className="pr-3 tabular-nums">{r.occupiedSlots}/{r.k}</td>
                      <td className="pr-3 tabular-nums">{r.alertLevel === 'over' ? <span className="text-red-600 font-semibold">depasit</span> : r.untilHalf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Override per zona */}
        <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] p-5 mb-6">
          <h3 className="font-semibold text-base mb-1">Override per zona</h3>
          <p className="text-xs text-[var(--color-text-light)] mb-4">Seteaza limite diferite pentru un anumit tip + sector. Campurile goale mostenesc valorile globale de sus.</p>
          {zoneOverrides.length > 0 && (
            <div className="mb-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-[var(--color-text-light)] border-b border-[var(--color-border)]">
                  <th className="pr-3 py-1">Tip</th><th className="pr-3">Sector</th><th className="pr-3">Procent</th><th className="pr-3">Min</th><th className="pr-3">Max</th><th className="pr-3">Alerta</th><th></th>
                </tr></thead>
                <tbody>
                  {zoneOverrides.map((ov, i) => (
                    <tr key={i} className="border-b border-[var(--color-border)]">
                      <td className="pr-3 py-1.5 capitalize">{ov.table}</td>
                      <td className="pr-3">{ov.sector ?? '—'}</td>
                      <td className="pr-3">{ov.config.ratio ?? '—'}</td>
                      <td className="pr-3">{ov.config.min ?? '—'}</td>
                      <td className="pr-3">{ov.config.max ?? '—'}</td>
                      <td className="pr-3">{ov.config.alertRatio ?? '—'}</td>
                      <td><button onClick={() => deleteZoneOverride(ov.table, ov.sector)} className="text-red-500 hover:text-red-700 text-xs">Sterge</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
            <label className="text-xs">
              <span className="block text-[var(--color-text-light)] mb-1">Tip afacere</span>
              <select value={overrideForm.table} onChange={e => setOverrideForm(f => ({ ...f, table: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded px-2 py-1.5 bg-transparent text-sm">
                <option value="afterschools">Afterschool</option>
                <option value="clubs">Activitati</option>
                <option value="kindergartens">Gradinite</option>
                <option value="professionals">Colaboratori</option>
                <option value="tutors">Meditatii</option>
                <option value="caterers">Catering</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="block text-[var(--color-text-light)] mb-1">Sector (gol = fara sector)</span>
              <input type="number" min="1" max="6" placeholder="1-6" value={overrideForm.sector}
                onChange={e => setOverrideForm(f => ({ ...f, sector: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded px-2 py-1.5 bg-transparent text-sm" />
            </label>
            <label className="text-xs">
              <span className="block text-[var(--color-text-light)] mb-1">Procent (0-1)</span>
              <input type="number" step="0.05" min="0" max="1" placeholder="global" value={overrideForm.ratio}
                onChange={e => setOverrideForm(f => ({ ...f, ratio: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded px-2 py-1.5 bg-transparent text-sm" />
            </label>
            <label className="text-xs">
              <span className="block text-[var(--color-text-light)] mb-1">Min</span>
              <input type="number" min="0" placeholder="global" value={overrideForm.min}
                onChange={e => setOverrideForm(f => ({ ...f, min: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded px-2 py-1.5 bg-transparent text-sm" />
            </label>
            <label className="text-xs">
              <span className="block text-[var(--color-text-light)] mb-1">Max</span>
              <input type="number" min="1" placeholder="global" value={overrideForm.max}
                onChange={e => setOverrideForm(f => ({ ...f, max: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded px-2 py-1.5 bg-transparent text-sm" />
            </label>
            <label className="text-xs">
              <span className="block text-[var(--color-text-light)] mb-1">Alerta %</span>
              <input type="number" step="0.05" min="0" max="1" placeholder="global" value={overrideForm.alertRatio}
                onChange={e => setOverrideForm(f => ({ ...f, alertRatio: e.target.value }))}
                className="w-full border border-[var(--color-border)] rounded px-2 py-1.5 bg-transparent text-sm" />
            </label>
          </div>
          <button onClick={saveZoneOverride} className="mt-3 px-4 py-2 text-sm rounded-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white">
            + Adauga override
          </button>
        </div>
        </div>
        )}

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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Descriere Google (editorial summary)</label>
                    <textarea rows={2} value={(clubForm as any).editorial_summary || ''} onChange={e => setClubForm(f => ({ ...f, editorial_summary: e.target.value } as any))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg resize-none text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Poze carusel (max 3 URL-uri)</label>
                    {((clubForm as any).photo_urls ? JSON.parse((clubForm as any).photo_urls) : []).map((url: string, i: number) => (
                      <div key={i} className="flex gap-2 items-center mb-2">
                        <img src={url} alt={`Foto ${i+1}`} className="w-16 h-12 object-cover rounded border border-[var(--color-border)] flex-shrink-0" />
                        <input value={url} onChange={e => {
                          const arr = JSON.parse((clubForm as any).photo_urls || '[]');
                          arr[i] = e.target.value;
                          setClubForm(f => ({ ...f, photo_urls: JSON.stringify(arr) } as any));
                        }} className="flex-1 px-2 py-1 border border-[var(--color-border)] rounded text-xs" />
                        <button type="button" onClick={() => {
                          const arr = JSON.parse((clubForm as any).photo_urls || '[]').filter((_: string, j: number) => j !== i);
                          setClubForm(f => ({ ...f, photo_urls: arr.length ? JSON.stringify(arr) : null } as any));
                        }} className="text-red-500 hover:text-red-700 font-bold text-sm px-1">✕</button>
                      </div>
                    ))}
                    {((clubForm as any).photo_urls ? JSON.parse((clubForm as any).photo_urls) : []).length < 3 && (
                      <button type="button" onClick={() => {
                        const url = prompt('URL poza:');
                        if (!url) return;
                        const arr = (clubForm as any).photo_urls ? JSON.parse((clubForm as any).photo_urls) : [];
                        setClubForm(f => ({ ...f, photo_urls: JSON.stringify([...arr, url]) } as any));
                      }} className="text-sm text-[var(--color-primary)] hover:underline">+ Adauga poza</button>
                    )}
                  </div>
                </div>
                {editingClub && editMicrosite && (
                  <div className="md:col-span-2 mt-2 border border-teal-200 rounded-xl p-4 bg-teal-50/40 space-y-3">
                    <p className="text-sm font-semibold text-teal-800">Outreach partener</p>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={editMicrosite.outreach_enabled === 1} onChange={e => setEditMicrosite(m => m ? { ...m, outreach_enabled: e.target.checked ? 1 : 0 } : m)}
                          className="w-4 h-4 text-teal-600 rounded" />
                        <span className="text-sm font-medium text-teal-800">Activat</span>
                      </label>
                    </div>
                    {editMicrosite.outreach_enabled === 1 && <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Resend API Key</label>
                        <input type="password" value={editMicrosite.resend_api_key} onChange={e => setEditMicrosite(m => m ? { ...m, resend_api_key: e.target.value } : m)}
                          placeholder="re_..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email expeditor (From)</label>
                        <input type="email" value={editMicrosite.outreach_from_email} onChange={e => setEditMicrosite(m => m ? { ...m, outreach_from_email: e.target.value } : m)}
                          placeholder="contact@exemplu.ro" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                      </div>
                    </>}
                  </div>
                )}
                {editingClub && !editMicrosite && (
                  <div className="md:col-span-2 mt-2 text-xs text-gray-400 italic">Creeaza mai intai un microsite pentru acest listing pentru a configura outreach-ul.</div>
                )}
                <div className="md:col-span-2 mt-1">
                  <label className="block text-sm font-medium mb-1">Data expirare Premium</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={(clubForm as any).premium_expires_at || ''}
                      onChange={e => setClubForm(f => ({ ...f, premium_expires_at: e.target.value || null } as any))}
                      className="px-3 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-[var(--color-bg)]"
                    />
                    {([['+ 1 lună', 1], ['+ 3 luni', 3], ['+ 6 luni', 6], ['+ 1 an', 12]] as [string, number][]).map(([lbl, mo]) => (
                      <button key={lbl} type="button"
                        onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + mo); setClubForm(f => ({ ...f, premium_expires_at: d.toISOString().split('T')[0] } as any)); }}
                        className="text-xs px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded border border-amber-200 font-medium">
                        {lbl}
                      </button>
                    ))}
                    {(clubForm as any).premium_expires_at && (
                      <button type="button" onClick={() => setClubForm(f => ({ ...f, premium_expires_at: null } as any))}
                        className="text-xs px-2 py-1 text-gray-400 hover:text-red-500">✕ Șterge data</button>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center gap-2 text-sm">
                  <span className="text-[var(--color-text-light)]">💬 Formular de contact (Solicită informații):</span>
                  <select value={(clubForm as any).leads_enabled ?? ''} onChange={e => setClubForm(f => ({ ...f, leads_enabled: e.target.value === '' ? null : Number(e.target.value) } as any))}
                    className="border border-[var(--color-border)] rounded-lg px-2 py-1 text-xs bg-[var(--color-bg)]">
                    <option value="">Auto (activat implicit)</option>
                    <option value="1">Mereu activ</option>
                    <option value="0">Mereu inactiv</option>
                  </select>
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
          <>
          {selectedClubs.size > 0 && (
            <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-sm font-semibold text-purple-800">{selectedClubs.size} selectate</span>
              <button onClick={() => bulkSetClubContactsHidden(true)} disabled={bulkLoading} className="text-xs px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50">
                🔒 Ascunde contact (selectate)
              </button>
              <button onClick={() => bulkSetClubContactsHidden(false)} disabled={bulkLoading} className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50">
                ✓ Arata contact (selectate)
              </button>
            </div>
          )}
          <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-4 py-3"><input type="checkbox" checked={filteredClubs.length > 0 && selectedClubs.size === filteredClubs.length} onChange={selectAllClubs} /></th>
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
                  {filteredClubs.map(c => (
                    <tr key={c.id} className={`border-b border-[var(--color-border)] ${c.is_premium ? "bg-amber-500/15 border-l-4 border-l-amber-400" : "hover:bg-gray-50/5"}`}>
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedClubs.has(c.id)} onChange={() => toggleClubSelect(c.id)} /></td>
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
                        <button onClick={() => quickCreateMicrosite('club', c.id)} disabled={msCreating === c.id}
                          className="text-teal-600 hover:text-teal-700 hover:underline mr-3 disabled:opacity-50">
                          {msCreating === c.id ? '...' : '🌐 Microsite'}
                        </button>
                        <button onClick={() => handleEditClub(c)} className="text-[var(--color-primary)] hover:underline mr-3">Editeaza</button>
                        <button onClick={() => handleDeleteClub(c.id)} className="text-[var(--color-danger)] hover:underline">Sterge</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
        ) : activeTab === 'afterschools' ? (
        <>
        {selectedAS.size > 0 && (
          <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg">
            <span className="text-sm font-semibold text-purple-800">{selectedAS.size} selectate</span>
            <button onClick={() => bulkSetASContactsHidden(true)} disabled={bulkLoading} className="text-xs px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50">
              🔒 Ascunde contact (selectate)
            </button>
            <button onClick={() => bulkSetASContactsHidden(false)} disabled={bulkLoading} className="text-xs px-3 py-1.5 border border-green-300 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50">
              ✓ Arata contact (selectate)
            </button>
          </div>
        )}
        <div className="bg-[var(--color-card)] rounded-xl shadow-sm border border-[var(--color-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-4 py-3"><input type="checkbox" checked={filteredAfterschools.length > 0 && selectedAS.size === filteredAfterschools.length} onChange={selectAllAS} /></th>
                  <th className="text-left px-4 py-3 font-medium">Nume</th>
                  <th className="text-left px-4 py-3 font-medium">Adresa</th>
                  <th className="text-left px-4 py-3 font-medium">Sector</th>
                  <th className="text-left px-4 py-3 font-medium">Pret</th>
                  <th className="text-left px-4 py-3 font-medium">Program</th>
                  <th className="text-left px-4 py-3 font-medium">Premium</th>
                  <th className="text-left px-4 py-3 font-medium">Contacte</th>
                  <th className="text-left px-4 py-3 font-medium">Pauza</th>
                  <th className="text-right px-4 py-3 font-medium">Actiuni</th>
                </tr>
              </thead>
              <tbody>
                {filteredAfterschools.map((as) => (
                  <tr key={as.id} className={`border-b border-[var(--color-border)] ${as.is_premium ? "bg-amber-500/15 border-l-4 border-l-amber-400" : "hover:bg-gray-50/5"} ${as.is_paused ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedAS.has(as.id)} onChange={() => toggleASSelect(as.id)} /></td>
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
                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePaused(as.id, as.is_paused ?? 0)}
                        title="Opreste listarea de pe site fara sa o stergi, ca s-o poti relua ulterior"
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          as.is_paused
                            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {as.is_paused ? '⏸ Pauzat' : '▶ Activ'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => quickCreateMicrosite('afterschool', as.id)}
                        disabled={msCreating === as.id}
                        className="text-teal-600 hover:text-teal-700 hover:underline mr-3 disabled:opacity-50"
                      >
                        {msCreating === as.id ? '...' : '🌐 Microsite'}
                      </button>
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
        </>
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

        {activeTab === 'listings' && <AdminListings />}

        {activeTab === 'potrivireLeads' && <PotrivireLeadsTab />}
        {activeTab === 'growthCampaigns' && <AdminGrowth />}

        {activeTab === 'users' && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-4">Utilizatori ({users.length})</h2>
            {users.length === 0 ? (
              <p className="text-[var(--color-text-light)] text-sm">Niciun utilizator inregistrat.</p>
            ) : (
              <div className="space-y-3">
                {users.map((u: any) => (
                  <div key={u.id} className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-[var(--color-text-main)] font-medium">{u.name || '(fara nume)'}</span>
                        {u.is_premium === 1 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Premium</span>}
                      </div>
                      <p className="text-sm text-[var(--color-text-light)]">{u.email}</p>
                      {u.phone && <p className="text-xs text-[var(--color-text-light)]">{u.phone}</p>}
                      {u.listings && u.listings.length > 0 ? (
                        u.listings.map((l: any) => (
                          <p key={`${l.type}-${l.id}`} className="text-xs text-emerald-600 mt-1">🏢 {l.name}</p>
                        ))
                      ) : (
                        <p className="text-xs text-[var(--color-text-light)] mt-1">Fara listare asociata</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="shrink-0 px-3 py-1.5 bg-red-50 hover:bg-[var(--color-danger)] text-[var(--color-danger)] hover:text-white text-sm rounded-lg transition-colors border border-red-200 whitespace-nowrap"
                    >
                      Sterge cont
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'outreach' && (
          <OutreachTab
            outreachData={outreachData}
            outreachFilter={outreachFilter}
            setOutreachFilter={setOutreachFilter}
            loadOutreach={loadOutreach}
            updateOutreach={updateOutreach}
          />
        )}
        {activeTab === 'catering' && <CateringAdmin />}
        {activeTab === 'professionals' && <ProfessionalsAdmin />}
        {activeTab === 'kindergartens' && <KindergartensAdmin />}
        {activeTab === 'tutors' && <TutorsAdmin />}

        {activeTab === 'microsites' && <MicrositesAdmin />}

        {activeTab === 'fboutreach' && <FbOutreach />}
        {activeTab === 'fbautopost' && <FbAutoPost />}

        {activeTab === 'waoutreach' && <WaOutreach />}

        {activeTab === 'micrositepitch' && <MicrositePitchTab />}

        {activeTab === 'circschools' && <CircSchoolsTab />}
        {activeTab === 'adcalibration' && <AdCalibrationTab />}
      {msResult && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4" onClick={() => setMsResult(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">&#127760; Microsite creat!</h3>
              <button onClick={() => setMsResult(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Link site public</p>
                <div className="flex items-center gap-2">
                  <a href={msResult.microsite_url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-sm text-teal-600 font-medium bg-teal-50 px-3 py-2 rounded-lg truncate hover:underline">
                    {msResult.microsite_url}
                  </a>
                  <button onClick={() => navigator.clipboard.writeText(msResult.microsite_url)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium">Copy</button>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Link securizat dashboard (trimite clientului)</p>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-gray-600 bg-gray-50 border px-3 py-2 rounded-lg truncate font-mono">
                    {msResult.magic_link}
                  </span>
                  <button onClick={() => navigator.clipboard.writeText(msResult.magic_link)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium">Copy</button>
                </div>
              </div>
            </div>
            <button onClick={() => setMsResult(null)} className="mt-5 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold">
              Inchide
            </button>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
