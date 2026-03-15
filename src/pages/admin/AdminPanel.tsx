import React, { useState, useRef, useEffect } from 'react';
import { AdminArticles } from './AdminArticles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Trash2, Eye, EyeOff, Loader2, Upload, X, ImagePlus, Pencil, ChevronLeft, ChevronRight, ArrowLeftRight, CheckCircle, XCircle, FileText, ExternalLink, Flag, Users, Star, Crown, MapPin as MapPinIcon, ClipboardList } from 'lucide-react';
import {
  AdminQueryParams,
  useAllPractitioners,
  useAllCenters,
  useAllCentersSimple,
  usePublishPractitioner,
  useDeletePractitioner,
  useInsertPractitioner,
  useUpdatePractitioner,
  usePublishCenter,
  useDeleteCenter,
  useInsertCenter,
  useUpdateCenter,
  useConvertPractitionerToCenter,
  useConvertCenterToPractitioner,
  useBatchPublish,
  useBatchDelete,
  uploadPractitionerImage,
  uploadCenterImage,
  useSetListingTier,
  useRecordCorrection,
} from '@/hooks/useAdmin';
import { useAdminFlags, useUpdateFlag, useDeleteFlag, type FlagStatus } from '@/hooks/useListingFlags';
import { useAdminAccounts, useSetAccountTier, useAdminFeaturedSlots, useRemoveFeaturedSlot, type AccountTier } from '@/hooks/useAccounts';
import type { PractitionerRow, CenterRow } from '@/types/database';
import { supabase } from '@/lib/supabase';

const CITIES_BY_ISLAND: Record<string, string[]> = {
  big_island: [
    'Hilo', 'Kailua-Kona', 'Waimea', 'Captain Cook', 'Pahoa', 'Holualoa',
    'Hawi', 'Honokaa', 'Volcano', 'Waikoloa', 'Keaau', 'Ocean View',
    'Kapaau', 'Kawaihae', 'Na Alehu', 'Milolii', 'Kealakekua',
  ],
  oahu: [
    'Honolulu', 'Waikiki', 'Kailua', 'Kaneohe', 'Pearl City', 'Aiea',
    'Mililani', 'Kapolei', 'Ewa Beach', 'Haleiwa', 'Waipahu', 'Hawaii Kai',
    'Manoa', 'Nuuanu',
  ],
  maui: [
    'Kahului', 'Wailuku', 'Lahaina', 'Kihei', 'Wailea', 'Hana',
    'Makawao', 'Paia', 'Haiku', 'Kula', 'Pukalani', 'Napili',
    'Kapalua', 'Kaanapali', 'Lanai City',
  ],
  kauai: [
    'Lihue', 'Kapaa', 'Hanalei', 'Princeville', 'Poipu', 'Koloa',
    'Hanapepe', 'Eleele', 'Kalaheo', 'Lawai', 'Anahola', 'Kilauea',
  ],
  molokai: ['Kaunakakai', 'Hoolehua', 'Maunaloa', 'Kualapuu', 'Halawa'],
};

const MODALITIES_LIST = [
  'Acupuncture', 'Alternative Therapy', 'Art Therapy', 'Astrology', 'Ayurveda',
  'Birth Doula', 'Breathwork', 'Chiropractic', 'Counseling',
  'Craniosacral', 'Dentistry', 'Energy Healing', 'Family Constellation', 'Fitness', 'Functional Medicine',
  'Hawaiian Healing', 'Herbalism', 'Hypnotherapy', 'IV Therapy', 'Life Coaching',
  'Lomilomi / Hawaiian Healing', 'Longevity', 'Massage', 'Meditation', 'Midwife',
  'Nature Therapy', 'Naturopathic', 'Nervous System Regulation', 'Network Chiropractic',
  'Nutrition', 'Osteopathic', 'Physical Therapy',
  'Psychic', 'Psychotherapy', 'Reiki', 'Ritualist', 'Somatic Therapy', 'Soul Guidance',
  'Sound Healing', 'TCM (Traditional Chinese Medicine)',
  'Trauma-Informed Care', 'Watsu / Water Therapy', "Women's Health", 'Yoga',
];

const ISLANDS = [
  { value: 'big_island', label: 'Big Island' },
  { value: 'oahu', label: 'Oahu' },
  { value: 'maui', label: 'Maui' },
  { value: 'kauai', label: 'Kauai' },
  { value: 'molokai', label: 'Molokai' },
];

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const DEFAULT_HOURS = { open: '9:00 AM', close: '5:00 PM' };

const PAGE_SIZE = 50;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Image preview strip ─────────────────────────────────────────────────────

interface ImageStripProps {
  urls: string[];
  onRemove?: (index: number) => void;
}
const ImageStrip = ({ urls, onRemove }: ImageStripProps) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {urls.map((url, i) => (
      <div key={url} className="relative">
        <img src={url} alt="" className="w-16 h-16 object-cover rounded border" />
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    ))}
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

interface ClaimRequest {
  id: string;
  practitioner_id: string;
  user_id: string;
  user_email: string;
  document_url: string | null;
  document_name: string | null;
  status: 'pending' | 'approved' | 'denied';
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  practitioners?: { name: string } | null;
}

const CLAIM_DOCS_BUCKET = 'claim-documents';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<'practitioners' | 'centers' | 'claims' | 'articles' | 'flags' | 'accounts' | 'leads'>('practitioners');
  const [isAddPractitionerOpen, setIsAddPractitionerOpen] = useState(false);
  const [isAddCenterOpen, setIsAddCenterOpen] = useState(false);

  // ── Search / sort / filter (shared across both tabs) ──────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<AdminQueryParams['sort']>('updated_desc');
  const [island, setIsland] = useState('all');
  const [statusFilter, setStatusFilter] = useState<AdminQueryParams['status']>('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [modalityFilter, setModalityFilter] = useState('all');
  // ── Centers-only filters ──────────────────────────────────────────────────
  const [centerTypeFilter, setCenterTypeFilter] = useState('all');
  const [missingDataFilter, setMissingDataFilter] = useState('all');

  // ── Batch selection ───────────────────────────────────────────────────────
  const [selectedPractitioners, setSelectedPractitioners] = useState<Set<string>>(new Set());
  const [selectedCenters, setSelectedCenters] = useState<Set<string>>(new Set());

  // Debounce search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPractitionerPage(0);
      setCenterPage(0);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchInput]);

  // ── Pagination (per tab) ──────────────────────────────────────────────────
  const [practitionerPage, setPractitionerPage] = useState(0);
  const [centerPage, setCenterPage] = useState(0);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editingPractitioner, setEditingPractitioner] = useState<PractitionerRow | null>(null);
  const [editingCenter, setEditingCenter] = useState<CenterRow | null>(null);
  const [convertingPractitioner, setConvertingPractitioner] = useState<PractitionerRow | null>(null);
  const [convertCenterType, setConvertCenterType] = useState<'spa' | 'wellness_center' | 'clinic' | 'retreat_center' | 'yoga_studio' | 'fitness_center'>('wellness_center');
  const [convertingCenter, setConvertingCenter] = useState<CenterRow | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  // ── Claims state ──────────────────────────────────────────────────────────
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimStatusFilter, setClaimStatusFilter] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [denyingClaimId, setDenyingClaimId] = useState<string | null>(null);
  const [denyNotes, setDenyNotes] = useState('');
  const [claimActionBusy, setClaimActionBusy] = useState<string | null>(null);

  // ── Practitioner form state ───────────────────────────────────────────────
  const [practitionerForm, setPractitionerForm] = useState({
    name: '',
    business_name: '' as string,
    modalities: [] as string[],
    bio: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    website_url: '',
    external_booking_url: '',
    booking_label: '',
    accepts_new_clients: true,
    status: 'published' as 'published' | 'draft',
    avatar_url: null as string | null,
    center_id: null as string | null,
    island: 'big_island' as string,
    session_type: 'in_person' as 'in_person' | 'online' | 'both',
    is_featured: false as boolean,
    social_links: {} as Record<string, string>,
    testimonials: [] as Array<{ author: string; text: string; date: string }>,
    working_hours: {} as Record<string, { open: string; close: string } | null>,
    lat: null as number | null,
    lng: null as number | null,
  });
  const [practitionerPhotoFile, setPractitionerPhotoFile] = useState<File | null>(null);
  const [practitionerPhotoPreview, setPractitionerPhotoPreview] = useState<string | null>(null);
  const [practitionerUploading, setPractitionerUploading] = useState(false);
  const practitionerFileRef = useRef<HTMLInputElement>(null);

  // ── Edit practitioner form state ──────────────────────────────────────────
  const [editPractitionerForm, setEditPractitionerForm] = useState({
    name: '',
    first_name: '' as string,
    last_name: '' as string,
    display_name: '' as string,
    business_name: '' as string,
    modalities: [] as string[],
    bio: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    website_url: '',
    external_booking_url: '',
    booking_label: '',
    accepts_new_clients: true,
    status: 'published' as 'published' | 'draft',
    avatar_url: null as string | null,
    center_id: null as string | null,
    island: 'big_island' as string,
    session_type: 'in_person' as 'in_person' | 'online' | 'both',
    is_featured: false as boolean,
    social_links: {} as Record<string, string>,
    testimonials: [] as Array<{ author: string; text: string; date: string }>,
    working_hours: {} as Record<string, { open: string; close: string } | null>,
    lat: null as number | null,
    lng: null as number | null,
  });
  const [editPractitionerPhotoFile, setEditPractitionerPhotoFile] = useState<File | null>(null);
  const [editPractitionerPhotoPreview, setEditPractitionerPhotoPreview] = useState<string | null>(null);
  const [editPractitionerUploading, setEditPractitionerUploading] = useState(false);
  const editPractitionerFileRef = useRef<HTMLInputElement>(null);

  // ── Center form state ─────────────────────────────────────────────────────
  const [centerForm, setCenterForm] = useState({
    name: '',
    description: '',
    center_type: 'wellness_center' as 'spa' | 'wellness_center' | 'clinic' | 'retreat_center' | 'yoga_studio' | 'fitness_center',
    city: '',
    address: '',
    phone: '',
    email: '',
    website_url: '',
    status: 'published' as 'published' | 'draft',
    avatar_url: null as string | null,
    photos: [] as string[],
    modalities: [] as string[],
    island: 'big_island' as string,
    session_type: 'in_person' as 'in_person' | 'online' | 'both',
    is_featured: false as boolean,
    social_links: {} as Record<string, string>,
    testimonials: [] as Array<{ author: string; text: string; date: string }>,
    working_hours: {} as Record<string, { open: string; close: string } | null>,
    lat: null as number | null,
    lng: null as number | null,
  });
  const [centerPhotoFiles, setCenterPhotoFiles] = useState<File[]>([]);
  const [centerPhotoPreviews, setCenterPhotoPreviews] = useState<string[]>([]);
  const [centerUploading, setCenterUploading] = useState(false);
  const centerFileRef = useRef<HTMLInputElement>(null);

  // ── Edit center form state ────────────────────────────────────────────────
  const [editCenterForm, setEditCenterForm] = useState({
    name: '',
    description: '',
    center_type: 'wellness_center' as 'spa' | 'wellness_center' | 'clinic' | 'retreat_center' | 'yoga_studio' | 'fitness_center',
    city: '',
    address: '',
    phone: '',
    email: '',
    website_url: '',
    status: 'published' as 'published' | 'draft',
    avatar_url: null as string | null,
    photos: [] as string[],
    modalities: [] as string[],
    island: 'big_island' as string,
    session_type: 'in_person' as 'in_person' | 'online' | 'both',
    is_featured: false as boolean,
    social_links: {} as Record<string, string>,
    testimonials: [] as Array<{ author: string; text: string; date: string }>,
    working_hours: {} as Record<string, { open: string; close: string } | null>,
    lat: null as number | null,
    lng: null as number | null,
  });
  const [editCenterPhotoFiles, setEditCenterPhotoFiles] = useState<File[]>([]);
  const [editCenterPhotoPreviews, setEditCenterPhotoPreviews] = useState<string[]>([]);
  const [editCenterUploading, setEditCenterUploading] = useState(false);
  const editCenterFileRef = useRef<HTMLInputElement>(null);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const practitionerParams: AdminQueryParams = {
    search,
    sort,
    island,
    status: statusFilter,
    tier: tierFilter,
    modality: modalityFilter,
    page: practitionerPage,
    pageSize: PAGE_SIZE,
  };
  const centerParams: AdminQueryParams = {
    search,
    sort,
    island,
    status: statusFilter,
    tier: tierFilter,
    modality: modalityFilter,
    centerType: centerTypeFilter,
    missingData: missingDataFilter,
    page: centerPage,
    pageSize: PAGE_SIZE,
  };

  const { data: practResult, isLoading: practitionersLoading } = useAllPractitioners(practitionerParams);
  const { data: centerResult, isLoading: centersLoading } = useAllCenters(centerParams);
  const { data: allCenters = [] } = useAllCentersSimple();

  const practitioners = practResult?.data ?? [];
  const practTotal = practResult?.total ?? 0;
  const centers = centerResult?.data ?? [];
  const centerTotal = centerResult?.total ?? 0;

  const publishPractitioner = usePublishPractitioner();
  const deletePractitioner = useDeletePractitioner();
  const insertPractitioner = useInsertPractitioner();
  const updatePractitioner = useUpdatePractitioner();
  const recordCorrection = useRecordCorrection();

  const publishCenter = usePublishCenter();
  const deleteCenter = useDeleteCenter();
  const insertCenter = useInsertCenter();
  const updateCenter = useUpdateCenter();
  const convertPractitionerToCenter = useConvertPractitionerToCenter();
  const convertCenterToPractitioner = useConvertCenterToPractitioner();
  const batchPublish = useBatchPublish();
  const batchDelete = useBatchDelete();
  const setListingTier = useSetListingTier();
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState<'practitioners' | 'centers' | null>(null);

  // ── Batch selection helpers ───────────────────────────────────────────────
  const toggleSelectPractitioner = (id: string) =>
    setSelectedPractitioners(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAllPractitioners = () =>
    setSelectedPractitioners(prev =>
      prev.size === practitioners.length
        ? new Set()
        : new Set(practitioners.map(p => p.id))
    );
  const toggleSelectCenter = (id: string) =>
    setSelectedCenters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleSelectAllCenters = () =>
    setSelectedCenters(prev =>
      prev.size === centers.length
        ? new Set()
        : new Set(centers.map(c => c.id))
    );

  const handleBatchPublish = async (table: 'practitioners' | 'centers', newStatus: 'published' | 'draft') => {
    const ids = table === 'practitioners'
      ? [...selectedPractitioners]
      : [...selectedCenters];
    if (!ids.length) return;
    try {
      await batchPublish.mutateAsync({ table, ids, status: newStatus });
      toast.success(`${ids.length} ${table} set to ${newStatus}`);
      table === 'practitioners' ? setSelectedPractitioners(new Set()) : setSelectedCenters(new Set());
    } catch {
      toast.error('Batch update failed');
    }
  };

  const handleBatchDelete = async (table: 'practitioners' | 'centers') => {
    const ids = table === 'practitioners'
      ? [...selectedPractitioners]
      : [...selectedCenters];
    if (!ids.length) return;
    try {
      await batchDelete.mutateAsync({ table, ids });
      toast.success(`${ids.length} ${table} deleted`);
      table === 'practitioners' ? setSelectedPractitioners(new Set()) : setSelectedCenters(new Set());
    } catch {
      toast.error('Batch delete failed');
    } finally {
      setBatchDeleteConfirm(null);
    }
  };

  // ── Practitioner form handlers ────────────────────────────────────────────
  const handlePractitionerChange = (field: string, value: unknown) =>
    setPractitionerForm(prev => ({ ...prev, [field]: value }));

  const toggleModality = (modality: string) =>
    setPractitionerForm(prev => ({
      ...prev,
      modalities: prev.modalities.includes(modality)
        ? prev.modalities.filter(m => m !== modality)
        : [...prev.modalities, modality],
    }));

  const handlePractitionerPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPractitionerPhotoFile(file);
    setPractitionerPhotoPreview(URL.createObjectURL(file));
  };

  const handlePractitionerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practitionerForm.name) { toast.error('Name is required'); return; }

    try {
      setPractitionerUploading(true);
      let avatarUrl: string | null = null;
      if (practitionerPhotoFile) {
        avatarUrl = await uploadPractitionerImage(practitionerPhotoFile);
      }
      await insertPractitioner.mutateAsync({
        ...practitionerForm,
        avatar_url: avatarUrl,
        island: 'big_island',
        tier: 'free',
        owner_id: null,
        region: null,
        lat: null,
        lng: null,
      } as never);
      toast.success('Practitioner added');
      setIsAddPractitionerOpen(false);
      setPractitionerForm({ name:'', modalities:[], bio:'', city:'', address:'',
        phone:'', email:'', website_url:'', external_booking_url:'',
        accepts_new_clients:true, status:'published', avatar_url:null, center_id:null });
      setPractitionerPhotoFile(null);
      setPractitionerPhotoPreview(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add practitioner');
    } finally {
      setPractitionerUploading(false);
    }
  };

  // ── Geocoding function ───────────────────────────────────────────────────────
  const geocodeAddress = async (
    address: string,
    city: string,
    onResult: (lat: number, lng: number) => void
  ) => {
    const query = [address, city, 'Hawaii'].filter(Boolean).join(', ');
    if (!query.trim()) { toast.error('Enter an address first'); return; }
    setGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AlohaHealthHub/1.0 (hello@alohahealthhub.com)' },
      });
      const data = await res.json();
      if (data && data[0]) {
        onResult(parseFloat(data[0].lat), parseFloat(data[0].lon));
        toast.success(`Found: ${data[0].display_name.split(',').slice(0, 2).join(', ')}`);
      } else {
        toast.error('No location found – try a more specific address');
      }
    } catch {
      toast.error('Geocoding failed – check your connection');
    } finally {
      setGeocoding(false);
    }
  };

  // ── Edit practitioner handlers ────────────────────────────────────────────
  const handleEditPractitionerChange = (field: string, value: unknown) =>
    setEditPractitionerForm(prev => ({ ...prev, [field]: value }));

  const toggleEditModality = (modality: string) =>
    setEditPractitionerForm(prev => ({
      ...prev,
      modalities: prev.modalities.includes(modality)
        ? prev.modalities.filter(m => m !== modality)
        : [...prev.modalities, modality],
    }));

  const handleEditPractitionerPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPractitionerPhotoFile(file);
    setEditPractitionerPhotoPreview(URL.createObjectURL(file));
  };

  const openEditPractitionerDialog = (p: PractitionerRow) => {
    setEditPractitionerForm({
      name: p.name,
      first_name: (p as any).first_name || '',
      last_name: (p as any).last_name || '',
      display_name: (p as any).display_name || '',
      business_name: p.business_name || '',
      modalities: [...(p.modalities || [])],
      bio: p.bio || '',
      city: p.city || '',
      address: p.address || '',
      phone: p.phone || '',
      email: p.email || '',
      website_url: p.website_url || '',
      external_booking_url: p.external_booking_url || '',
      booking_label: p.booking_label || '',
      accepts_new_clients: p.accepts_new_clients,
      status: p.status as 'published' | 'draft',
      avatar_url: p.avatar_url,
      center_id: (p as any).center_id ?? null,
      island: p.island || 'big_island',
      session_type: (p as any).session_type || 'in_person',
      is_featured: (p as any).is_featured || false,
      social_links: (p as any).social_links || {},
      testimonials: (p as any).testimonials || [],
      working_hours: (p as any).working_hours || {},
      lat: p.lat,
      lng: p.lng,
    });
    setEditPractitionerPhotoFile(null);
    setEditPractitionerPhotoPreview(null);
    setEditingPractitioner(p);
  };

  const handleEditPractitionerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPractitioner) return;
    if (!editPractitionerForm.name) { toast.error('Name is required'); return; }

    try {
      setEditPractitionerUploading(true);
      let avatarUrl = editPractitionerForm.avatar_url;
      if (editPractitionerPhotoFile) {
        avatarUrl = await uploadPractitionerImage(editPractitionerPhotoFile);
      }
      await updatePractitioner.mutateAsync({
        id: editingPractitioner.id,
        ...editPractitionerForm,
        avatar_url: avatarUrl,
      });

      // Record modality correction if this is a draft and modalities changed
      if (editingPractitioner.status === 'draft') {
        const originalModalities = editingPractitioner.modalities || [];
        const newModalities = editPractitionerForm.modalities || [];
        const modalitiesChanged = JSON.stringify(originalModalities.sort()) !== JSON.stringify(newModalities.sort());

        if (modalitiesChanged) {
          recordCorrection.mutate({
            listingId: editingPractitioner.id,
            listingType: 'practitioner',
            field: 'modalities',
            oldValue: originalModalities,
            newValue: newModalities,
          });
        }
      }

      toast.success('Saved');
      setEditingPractitioner(null);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to update practitioner';
      toast.error(msg);
    } finally {
      setEditPractitionerUploading(false);
    }
  };

  // ── Center form handlers ──────────────────────────────────────────────────
  const handleCenterChange = (field: string, value: unknown) =>
    setCenterForm(prev => ({ ...prev, [field]: value }));

  const MAX_PHOTOS = 5;
  const handleCenterPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setCenterPhotoFiles(prev => {
      const slots = MAX_PHOTOS - prev.length;
      return slots > 0 ? [...prev, ...files.slice(0, slots)] : prev;
    });
    setCenterPhotoPreviews(prev => {
      const slots = MAX_PHOTOS - prev.length;
      return slots > 0 ? [...prev, ...files.slice(0, slots).map(f => URL.createObjectURL(f))] : prev;
    });
    e.target.value = '';
  };

  const removeCenterPhoto = (index: number) => {
    setCenterPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setCenterPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleCenterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerForm.name) { toast.error('Name is required'); return; }

    try {
      setCenterUploading(true);
      const photoUrls: string[] = [];
      for (const file of centerPhotoFiles) {
        const url = await uploadCenterImage(file);
        photoUrls.push(url);
      }
      const avatarUrl = photoUrls[0] ?? null;
      await insertCenter.mutateAsync({
        ...centerForm,
        avatar_url: avatarUrl,
        photos: photoUrls,
        island: 'big_island',
        tier: 'free',
        owner_id: null,
        region: null,
        lat: null,
        lng: null,
        external_website_url: centerForm.website_url || null,
      } as never);
      toast.success('Center added');
      setIsAddCenterOpen(false);
      setCenterForm({ name:'', description:'', center_type:'wellness_center', city:'',
        address:'', phone:'', email:'', website_url:'', status:'published',
        avatar_url:null, photos:[] });
      setCenterPhotoFiles([]);
      setCenterPhotoPreviews([]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add center');
    } finally {
      setCenterUploading(false);
    }
  };

  // ── Edit center handlers ──────────────────────────────────────────────────
  const handleEditCenterChange = (field: string, value: unknown) =>
    setEditCenterForm(prev => ({ ...prev, [field]: value }));

  const handleEditCenterPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const existing = (editCenterForm.photos?.length ?? 0) + editCenterPhotoPreviews.length;
    const slots = MAX_PHOTOS - existing;
    if (slots <= 0) return;
    const allowed = files.slice(0, slots);
    setEditCenterPhotoFiles(prev => [...prev, ...allowed]);
    setEditCenterPhotoPreviews(prev => [...prev, ...allowed.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const openEditCenterDialog = (c: CenterRow) => {
    setEditCenterForm({
      name: c.name,
      description: c.description || '',
      center_type: c.center_type,
      city: c.city || '',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || '',
      website_url: c.website_url || '',
      status: c.status as 'published' | 'draft',
      avatar_url: c.avatar_url,
      photos: [...(c.photos || [])],
      modalities: [...(c.modalities || [])],
      island: c.island || 'big_island',
      session_type: (c as any).session_type || 'in_person',
      is_featured: (c as any).is_featured || false,
      social_links: (c as any).social_links || {},
      testimonials: (c as any).testimonials || [],
      working_hours: (c as any).working_hours || {},
      lat: c.lat,
      lng: c.lng,
    });
    setEditCenterPhotoFiles([]);
    setEditCenterPhotoPreviews([]);
    setEditingCenter(c);
  };

  const handleEditCenterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCenter) return;
    if (!editCenterForm.name) { toast.error('Name is required'); return; }

    try {
      setEditCenterUploading(true);
      const newPhotoUrls: string[] = [];
      for (const file of editCenterPhotoFiles) {
        const url = await uploadCenterImage(file);
        newPhotoUrls.push(url);
      }
      const allPhotos = [...(editCenterForm.photos || []), ...newPhotoUrls];
      const avatarUrl = editCenterForm.avatar_url || allPhotos[0] || null;
      await updateCenter.mutateAsync({
        id: editingCenter.id,
        ...editCenterForm,
        avatar_url: avatarUrl,
        photos: allPhotos,
        external_website_url: editCenterForm.website_url || null,
      });
      toast.success('Saved');
      setEditingCenter(null);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to update center';
      toast.error(msg);
    } finally {
      setEditCenterUploading(false);
    }
  };

  // ── Publish/delete handlers ───────────────────────────────────────────────
  const togglePractitionerPublish = async (id: string, status: 'published' | 'draft') => {
    try {
      await publishPractitioner.mutateAsync({ id, status: status === 'published' ? 'draft' : 'published' });
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
  };

  const handleDeletePractitioner = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await deletePractitioner.mutateAsync(id);
      toast.success('Practitioner deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleConvertToCenter = async () => {
    if (!convertingPractitioner) return;
    try {
      await convertPractitionerToCenter.mutateAsync({
        practitioner: convertingPractitioner,
        centerType: convertCenterType,
      });
      toast.success(`${convertingPractitioner.name} converted to center`);
      setConvertingPractitioner(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to convert');
    }
  };

  const handleConvertToPractitioner = async () => {
    if (!convertingCenter) return;
    try {
      await convertCenterToPractitioner.mutateAsync(convertingCenter);
      toast.success(`${convertingCenter.name} moved to practitioners`);
      setConvertingCenter(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to convert');
    }
  };

  const toggleCenterPublish = async (id: string, status: 'published' | 'draft') => {
    try {
      await publishCenter.mutateAsync({ id, status: status === 'published' ? 'draft' : 'published' });
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
  };

  const handleDeleteCenter = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await deleteCenter.mutateAsync(id);
      toast.success('Center deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // ── Pagination helpers ────────────────────────────────────────────────────
  const practitionerPages = Math.ceil(practTotal / PAGE_SIZE) || 1;
  const centerPages = Math.ceil(centerTotal / PAGE_SIZE) || 1;

  const practitionerPageDisplay = `Page ${practitionerPage + 1} of ${practitionerPages}  |  ${practTotal} total`;
  const centerPageDisplay = `Page ${centerPage + 1} of ${centerPages}  |  ${centerTotal} total`;

  // ── Row renderers ─────────────────────────────────────────────────────────
  const renderPractitionerRow = (p: PractitionerRow) => {
    const shown = (p.modalities || []).slice(0, 3);
    const extra = (p.modalities || []).length - 3;
    const quality = getPractitionerQuality(p);
    const qualityPct = Math.round((quality.filled / quality.total) * 100);
    const qualityColor =
      qualityPct >= 83 ? 'text-green-600 bg-green-50 border-green-200' :
      qualityPct >= 50 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                         'text-red-600 bg-red-50 border-red-200';
    return (
      <Card key={p.id} className={`mb-3 ${selectedPractitioners.has(p.id) ? 'ring-2 ring-blue-400' : ''}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex gap-3 flex-1 min-w-0">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer accent-blue-600"
                checked={selectedPractitioners.has(p.id)}
                onChange={() => toggleSelectPractitioner(p.id)}
              />
              {p.avatar_url
                ? <img src={p.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                : <div className="w-12 h-12 rounded-full flex-shrink-0 bg-gray-100 flex items-center justify-center text-gray-400 text-lg font-semibold">{p.name.charAt(0)}</div>
              }
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{p.name}</h3>
                <p className="text-sm text-gray-500">{p.city}</p>
                {(p as any).center?.name && (
                  <p className="text-xs text-blue-600 font-medium">
                    {(p as any).center.name}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {shown.map(m => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}
                  {extra > 0 && <Badge variant="outline" className="text-xs">+{extra} more</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-xs text-gray-400">Updated {formatDate(p.updated_at)}</p>
                  {quality.missing.length > 0 && (
                    <span className="text-xs text-orange-500" title={`Missing: ${quality.missing.join(', ')}`}>
                      Missing: {quality.missing.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
              {/* Completeness score */}
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium border ${qualityColor}`}
                title={quality.missing.length > 0 ? `Missing: ${quality.missing.join(', ')}` : 'Profile complete'}
              >
                {qualityPct}%
              </span>
              <Badge variant={p.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                {p.status}
              </Badge>
              {p.tier === 'featured' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  <Crown className="h-2.5 w-2.5" /> Featured
                </span>
              )}
              {p.tier === 'premium' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                  <Star className="h-2.5 w-2.5" /> Premium
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={() => openEditPractitionerDialog(p)}>
                <Pencil className="h-4 w-4 text-blue-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Convert to Center"
                onClick={() => { setConvertingPractitioner(p); setConvertCenterType('wellness_center'); }}
              >
                <ArrowLeftRight className="h-4 w-4 text-purple-500" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => togglePractitionerPublish(p.id, p.status as 'published' | 'draft')}>
                {p.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDeletePractitioner(p.id, p.name)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ── Practitioner completeness score ──────────────────────────────────────
  const PRACTITIONER_QUALITY_FIELDS = [
    { key: 'avatar_url',           label: 'Photo' },
    { key: 'bio',                  label: 'Bio' },
    { key: 'phone',                label: 'Phone' },
    { key: 'email',                label: 'Email' },
    { key: 'modalities',           label: 'Modalities' },
    { key: 'external_booking_url', label: 'Booking link' },
  ] as const;

  const getPractitionerQuality = (p: PractitionerRow) => {
    const filled = PRACTITIONER_QUALITY_FIELDS.filter(f => {
      const val = (p as Record<string, unknown>)[f.key];
      if (Array.isArray(val)) return val.length > 0;
      return val !== null && val !== undefined && val !== '';
    });
    const missing = PRACTITIONER_QUALITY_FIELDS.filter(f => {
      const val = (p as Record<string, unknown>)[f.key];
      if (Array.isArray(val)) return val.length === 0;
      return val === null || val === undefined || val === '';
    }).map(f => f.label);
    return { filled: filled.length, total: PRACTITIONER_QUALITY_FIELDS.length, missing };
  };

  // ── Center quality score (Part 2) ─────────────────────────────────────────
  const CENTER_QUALITY_FIELDS = [
    { key: 'description', label: 'Description' },
    { key: 'phone',       label: 'Phone' },
    { key: 'email',       label: 'Email' },
    { key: 'website_url', label: 'Website' },
    { key: 'avatar_url',  label: 'Photo' },
    { key: 'modalities',  label: 'Modalities' },
    { key: 'address',     label: 'Address' },
  ] as const;

  const getCenterQuality = (c: CenterRow) => {
    const filled = CENTER_QUALITY_FIELDS.filter(f => {
      const val = (c as Record<string, unknown>)[f.key];
      if (Array.isArray(val)) return val.length > 0;
      return val !== null && val !== undefined && val !== '';
    });
    return { filled: filled.length, total: CENTER_QUALITY_FIELDS.length, missing: CENTER_QUALITY_FIELDS.filter(f => {
      const val = (c as Record<string, unknown>)[f.key];
      if (Array.isArray(val)) return val.length === 0;
      return val === null || val === undefined || val === '';
    }).map(f => f.label) };
  };

  const renderCenterRow = (c: CenterRow) => {
    const quality = getCenterQuality(c);
    const qualityColor =
      quality.filled >= 6 ? 'text-green-600 bg-green-50 border-green-200' :
      quality.filled >= 4 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                            'text-red-600 bg-red-50 border-red-200';
    return (
    <Card key={c.id} className={`mb-3 ${selectedCenters.has(c.id) ? 'ring-2 ring-blue-400' : ''}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex gap-3 flex-1 min-w-0">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer accent-blue-600"
              checked={selectedCenters.has(c.id)}
              onChange={() => toggleSelectCenter(c.id)}
            />
            {c.avatar_url
              ? <img src={c.avatar_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
              : <div className="w-12 h-12 rounded flex-shrink-0 bg-gray-100 flex items-center justify-center text-gray-400 text-lg font-semibold">{c.name.charAt(0)}</div>
            }
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{c.name}</h3>
                <span className="text-xs text-gray-400 capitalize">{c.center_type?.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-sm text-gray-500">{c.city}{c.city && c.island ? ', ' : ''}{c.island?.replace(/_/g, ' ')}</p>
              <p className="text-sm text-gray-600 line-clamp-1 mt-0.5">{c.description || <span className="text-gray-300 italic">No description</span>}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-xs text-gray-400">Updated {formatDate(c.updated_at)}</p>
                {/* Missing data indicators */}
                {!c.phone && <span className="text-xs text-orange-500">No phone</span>}
                {!c.email && <span className="text-xs text-orange-500">No email</span>}
                {(!c.modalities || c.modalities.length === 0) && <span className="text-xs text-orange-500">No modalities</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
            {/* Quality score badge (Part 2) */}
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-medium ${qualityColor}`}
              title={quality.missing.length > 0 ? `Missing: ${quality.missing.join(', ')}` : 'Complete'}
            >
              {quality.filled}/{quality.total}
            </span>
            <Badge variant={c.status === 'published' ? 'default' : 'secondary'} className="text-xs">
              {c.status}
            </Badge>
            {c.tier === 'featured' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                <Crown className="h-2.5 w-2.5" /> Featured
              </span>
            )}
            {c.tier === 'premium' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                <Star className="h-2.5 w-2.5" /> Premium
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => openEditCenterDialog(c)}>
              <Pencil className="h-4 w-4 text-blue-500" />
            </Button>
            <Button
              variant="ghost" size="sm"
              title="Move to Practitioners"
              onClick={() => setConvertingCenter(c)}
            >
              <ArrowLeftRight className="h-4 w-4 text-purple-500" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => toggleCenterPublish(c.id, c.status as 'published' | 'draft')}>
              {c.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDeleteCenter(c.id, c.name)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  // ── Claims handlers ───────────────────────────────────────────────────────
  const fetchClaims = async (status: 'pending' | 'approved' | 'denied') => {
    if (!supabase) return;
    setClaimsLoading(true);
    try {
      const { data, error } = await supabase
        .from('claim_requests')
        .select('*, practitioners(name)')
        .eq('status', status)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClaimRequests((data as ClaimRequest[]) ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load claim requests');
    } finally {
      setClaimsLoading(false);
    }
  };

  const handleApproveClaim = async (claim: ClaimRequest) => {
    if (!supabase) return;
    setClaimActionBusy(claim.id);
    try {
      await supabase.rpc('approve_claim', { p_claim_id: claim.id });
      // Delete the document from storage
      if (claim.document_url) {
        await supabase.storage.from(CLAIM_DOCS_BUCKET).remove([claim.document_url]);
      }
      toast.success('Claim approved and listing assigned');
      setClaimRequests(prev => prev.filter(c => c.id !== claim.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve claim');
    } finally {
      setClaimActionBusy(null);
    }
  };

  const handleDenyClaim = async (claim: ClaimRequest) => {
    if (!supabase) return;
    setClaimActionBusy(claim.id);
    try {
      await supabase.rpc('deny_claim', { p_claim_id: claim.id, p_notes: denyNotes || null });
      // Delete the document from storage
      if (claim.document_url) {
        await supabase.storage.from(CLAIM_DOCS_BUCKET).remove([claim.document_url]);
      }
      toast.success('Claim denied');
      setDenyingClaimId(null);
      setDenyNotes('');
      setClaimRequests(prev => prev.filter(c => c.id !== claim.id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to deny claim');
    } finally {
      setClaimActionBusy(null);
    }
  };

  const getDocUrl = async (path: string) => {
    if (!supabase) return;
    const { data } = await supabase.storage
      .from(CLAIM_DOCS_BUCKET)
      .createSignedUrl(path, 60 * 5); // 5-minute signed URL
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('Could not generate document link');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-gray-600">Manage practitioners and wellness centers</p>
      </div>

      {/* ── Toolbar ── */}
      <div className="mb-4 flex gap-2 flex-wrap items-center">
        <Input
          type="text"
          placeholder="Search by name…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="h-8 flex-1 min-w-40 text-sm"
        />
        <Select value={sort} onValueChange={v => { setSort(v as AdminQueryParams['sort']); setPractitionerPage(0); setCenterPage(0); }}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_desc">Newest first</SelectItem>
            <SelectItem value="updated_asc">Oldest first</SelectItem>
            <SelectItem value="name_asc">A → Z</SelectItem>
            <SelectItem value="name_desc">Z → A</SelectItem>
          </SelectContent>
        </Select>
        <Select value={island} onValueChange={v => { setIsland(v); setPractitionerPage(0); setCenterPage(0); }}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Islands</SelectItem>
            {ISLANDS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as AdminQueryParams['status']); setPractitionerPage(0); setCenterPage(0); setSelectedPractitioners(new Set()); setSelectedCenters(new Set()); }}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={v => { setTierFilter(v); setPractitionerPage(0); setCenterPage(0); }}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="premium">⭐ Premium</SelectItem>
            <SelectItem value="featured">👑 Featured</SelectItem>
          </SelectContent>
        </Select>
        <Select value={modalityFilter} onValueChange={v => { setModalityFilter(v); setPractitionerPage(0); setCenterPage(0); }}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="All Modalities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modalities</SelectItem>
            {MODALITIES_LIST.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={v => {
        const tab = v as typeof activeTab;
        setActiveTab(tab);
        if (tab === 'claims') fetchClaims(claimStatusFilter);
      }}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="practitioners">
            Practitioners {practResult ? `(${practTotal})` : ''}
          </TabsTrigger>
          <TabsTrigger value="centers">
            Centers {centerResult ? `(${centerTotal})` : ''}
          </TabsTrigger>
          <TabsTrigger value="claims">
            Claims
          </TabsTrigger>
          <TabsTrigger value="articles">
            Articles
          </TabsTrigger>
          <TabsTrigger value="flags" className="gap-1.5">
            <Flag className="h-3.5 w-3.5" />
            Flags
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5">
            <Star className="h-3.5 w-3.5" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Queue
          </TabsTrigger>
        </TabsList>

        {/* ── PRACTITIONERS TAB ── */}
        <TabsContent value="practitioners" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">Practitioners</h2>
              {/* Review Queue quick-filter */}
              <Button
                variant={statusFilter === 'draft' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setStatusFilter(statusFilter === 'draft' ? 'all' : 'draft')}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Review Queue
                {statusFilter === 'draft' && <X className="h-3 w-3 ml-0.5" />}
              </Button>
            </div>
            <Dialog open={isAddPractitionerOpen} onOpenChange={setIsAddPractitionerOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Practitioner</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Practitioner</DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePractitionerSubmit} className="space-y-4">

                  {/* Photo upload */}
                  <div>
                    <Label>Profile Photo</Label>
                    <div className="mt-2 flex items-center gap-3">
                      {practitionerPhotoPreview ? (
                        <div className="relative">
                          <img src={practitionerPhotoPreview} alt="Preview"
                            className="w-20 h-20 rounded-full object-cover border" />
                          <button type="button"
                            onClick={() => { setPractitionerPhotoFile(null); setPractitionerPhotoPreview(null); }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <Button type="button" variant="outline" size="sm"
                        onClick={() => practitionerFileRef.current?.click()}>
                        Choose Photo
                      </Button>
                      <input ref={practitionerFileRef} type="file" accept="image/*"
                        className="hidden" onChange={handlePractitionerPhotoChange} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="p-name">Name *</Label>
                    <Input id="p-name" placeholder="Full name"
                      value={practitionerForm.name}
                      onChange={e => handlePractitionerChange('name', e.target.value)} required />
                  </div>

                  <div>
                    <Label htmlFor="p-business-name">Business Name</Label>
                    <Input id="p-business-name" placeholder="e.g. Hilo Healing Arts (optional)"
                      value={practitionerForm.business_name}
                      onChange={e => handlePractitionerChange('business_name', e.target.value)} />
                  </div>

                  <div>
                    <Label>Modalities</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mt-2 max-h-44 overflow-y-auto p-2 border rounded bg-gray-50">
                      {MODALITIES_LIST.map(m => (
                        <label key={m} className="flex items-center gap-1.5 cursor-pointer text-sm">
                          <input type="checkbox"
                            checked={practitionerForm.modalities.includes(m)}
                            onChange={() => toggleModality(m)}
                            className="w-3.5 h-3.5" />
                          {m}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="p-bio">Bio</Label>
                    <Textarea id="p-bio" placeholder="Brief bio"
                      value={practitionerForm.bio}
                      onChange={e => handlePractitionerChange('bio', e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>City</Label>
                      <Select value={practitionerForm.city}
                        onValueChange={v => handlePractitionerChange('city', v)}>
                        <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                        <SelectContent>
                          {(CITIES_BY_ISLAND[practitionerForm.island] || CITIES_BY_ISLAND.big_island).map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="p-phone">Phone</Label>
                      <Input id="p-phone" placeholder="(808) 555-0100"
                        value={practitionerForm.phone}
                        onChange={e => handlePractitionerChange('phone', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="p-address">Address</Label>
                    <Input id="p-address" placeholder="Street address"
                      value={practitionerForm.address}
                      onChange={e => handlePractitionerChange('address', e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="p-email">Email</Label>
                      <Input id="p-email" type="email" placeholder="email@example.com"
                        value={practitionerForm.email}
                        onChange={e => handlePractitionerChange('email', e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="p-website">Website</Label>
                      <Input id="p-website" placeholder="https://"
                        value={practitionerForm.website_url}
                        onChange={e => handlePractitionerChange('website_url', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="p-booking">Booking URL</Label>
                    <Input id="p-booking" placeholder="External booking link"
                      value={practitionerForm.external_booking_url}
                      onChange={e => handlePractitionerChange('external_booking_url', e.target.value)} />
                  </div>

                  <div>
                    <Label>Island</Label>
                    <Select value={practitionerForm.island || 'big_island'}
                      onValueChange={v => handlePractitionerChange('island', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ISLANDS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Session Type</Label>
                    <Select value={(practitionerForm as any).session_type || 'in_person'}
                      onValueChange={v => handlePractitionerChange('session_type', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_person">In-Person Only</SelectItem>
                        <SelectItem value="online">Online Only</SelectItem>
                        <SelectItem value="both">In-Person & Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Affiliated Center</Label>
                    <Select
                      value={(practitionerForm as any).center_id ?? 'none'}
                      onValueChange={v => setPractitionerForm(prev => ({
                        ...prev,
                        center_id: v === 'none' ? null : v,
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No affiliation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No affiliation</SelectItem>
                        {allCenters.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lat/Lng + Geocode */}
                  <div className="space-y-1">
                    <Label className="text-sm">Coordinates</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Latitude"
                        type="number"
                        step="any"
                        value={(practitionerForm as any).lat ?? ''}
                        onChange={e => handlePractitionerChange('lat', e.target.value ? parseFloat(e.target.value) : null)}
                        className="text-sm h-8 w-32"
                      />
                      <Input
                        placeholder="Longitude"
                        type="number"
                        step="any"
                        value={(practitionerForm as any).lng ?? ''}
                        onChange={e => handlePractitionerChange('lng', e.target.value ? parseFloat(e.target.value) : null)}
                        className="text-sm h-8 w-32"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={geocoding}
                        onClick={() => geocodeAddress(
                          practitionerForm.address,
                          practitionerForm.city,
                          (lat, lng) => {
                            handlePractitionerChange('lat', lat);
                            handlePractitionerChange('lng', lng);
                          }
                        )}
                        className="h-8 text-xs gap-1"
                      >
                        {geocoding ? <><Loader2 className="h-3 w-3 animate-spin" /> Finding…</> : '📍 Find Coords'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="p-accepts">Accepts New Clients</Label>
                    <Switch id="p-accepts"
                      checked={practitionerForm.accepts_new_clients}
                      onCheckedChange={v => handlePractitionerChange('accepts_new_clients', v)} />
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select value={practitionerForm.status}
                      onValueChange={v => handlePractitionerChange('status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Premium Features */}
                  <div className="border rounded-lg p-4 space-y-4 bg-amber-50 border-amber-200">
                    <h4 className="font-semibold text-amber-800 text-sm">⭐ Premium Features</h4>

                    {/* Featured toggle */}
                    <div className="flex items-center justify-between">
                      <Label>Featured on Homepage</Label>
                      <Switch
                        checked={(practitionerForm as any).is_featured || false}
                        onCheckedChange={v => handlePractitionerChange('is_featured', v)}
                      />
                    </div>

                    {/* Social Links */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Social Links</Label>
                      {(['instagram', 'facebook', 'linkedin', 'x', 'substack'] as const).map(platform => (
                        <div key={platform} className="flex items-center gap-2">
                          <span className="w-20 text-xs text-gray-500 capitalize">{platform === 'x' ? 'X / Twitter' : platform === 'substack' ? 'Substack' : platform}</span>
                          <Input
                            placeholder={
                              platform === 'x' ? 'https://x.com/...' :
                              platform === 'substack' ? 'https://yourname.substack.com' :
                              `https://${platform}.com/...`
                            }
                            value={((practitionerForm as any).social_links?.[platform]) || ''}
                            onChange={e => handlePractitionerChange('social_links', {
                              ...((practitionerForm as any).social_links || {}),
                              [platform]: e.target.value,
                            })}
                            className="text-sm h-8"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Working Hours */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Working Hours</Label>
                      <div className="space-y-1">
                        {DAYS.map(({ key, label }) => {
                          const dayHours = (practitionerForm as any).working_hours?.[key];
                          const isOpen = dayHours !== null && dayHours !== undefined;
                          return (
                            <div key={key} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={isOpen}
                                onChange={e => {
                                  const wh = { ...((practitionerForm as any).working_hours || {}) };
                                  wh[key] = e.target.checked ? DEFAULT_HOURS : null;
                                  handlePractitionerChange('working_hours', wh);
                                }}
                                className="w-3.5 h-3.5"
                              />
                              <span className="w-24 text-xs text-gray-600">{label}</span>
                              {isOpen && (
                                <>
                                  <Input
                                    type="text"
                                    value={dayHours?.open || ''}
                                    onChange={e => {
                                      const wh = { ...((practitionerForm as any).working_hours || {}) };
                                      wh[key] = { ...dayHours, open: e.target.value };
                                      handlePractitionerChange('working_hours', wh);
                                    }}
                                    placeholder="9:00 AM"
                                    className="h-7 text-xs w-24"
                                  />
                                  <span className="text-xs text-gray-400">–</span>
                                  <Input
                                    type="text"
                                    value={dayHours?.close || ''}
                                    onChange={e => {
                                      const wh = { ...((practitionerForm as any).working_hours || {}) };
                                      wh[key] = { ...dayHours, close: e.target.value };
                                      handlePractitionerChange('working_hours', wh);
                                    }}
                                    placeholder="5:00 PM"
                                    className="h-7 text-xs w-24"
                                  />
                                </>
                              )}
                              {!isOpen && <span className="text-xs text-gray-400 italic">Closed</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Testimonials */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Testimonials</Label>
                      {((practitionerForm as any).testimonials || []).map((t: {author: string; text: string; date: string}, idx: number) => (
                        <div key={idx} className="border rounded p-2 space-y-1 bg-white">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Author name"
                              value={t.author}
                              onChange={e => {
                                const ts = [...((practitionerForm as any).testimonials || [])];
                                ts[idx] = { ...ts[idx], author: e.target.value };
                                handlePractitionerChange('testimonials', ts);
                              }}
                              className="h-7 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const ts = ((practitionerForm as any).testimonials || []).filter((_: unknown, i: number) => i !== idx);
                                handlePractitionerChange('testimonials', ts);
                              }}
                              className="text-red-400 hover:text-red-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <Textarea
                            placeholder="Testimonial text"
                            value={t.text}
                            onChange={e => {
                              const ts = [...((practitionerForm as any).testimonials || [])];
                              ts[idx] = { ...ts[idx], text: e.target.value };
                              handlePractitionerChange('testimonials', ts);
                            }}
                            className="text-xs min-h-[60px]"
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const ts = [...((practitionerForm as any).testimonials || [])];
                          ts.push({ author: '', text: '', date: new Date().toISOString().slice(0, 10) });
                          handlePractitionerChange('testimonials', ts);
                        }}
                        className="text-xs h-7"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Testimonial
                      </Button>
                    </div>

                    {/* Retreat Links */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Retreat Links</Label>
                      {((practitionerForm as any).retreat_links || []).map((url: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            placeholder="https://example.com/retreat"
                            value={url}
                            onChange={e => {
                              const links = [...((practitionerForm as any).retreat_links || [])];
                              links[idx] = e.target.value;
                              handlePractitionerChange('retreat_links', links);
                            }}
                            className="h-7 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const links = ((practitionerForm as any).retreat_links || []).filter((_: unknown, i: number) => i !== idx);
                              handlePractitionerChange('retreat_links', links);
                            }}
                            className="text-red-400 hover:text-red-600 flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const links = [...((practitionerForm as any).retreat_links || [])];
                          links.push('');
                          handlePractitionerChange('retreat_links', links);
                        }}
                        className="text-xs h-7"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Retreat Link
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full"
                    disabled={insertPractitioner.isPending || practitionerUploading}>
                    {(insertPractitioner.isPending || practitionerUploading)
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                      : 'Save Practitioner'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Batch action bar — practitioners */}
          {practitioners.length > 0 && (
            <div className="flex items-center gap-3 mb-3 py-2 px-3 bg-gray-50 rounded-lg border text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue-600 cursor-pointer"
                  checked={practitioners.length > 0 && selectedPractitioners.size === practitioners.length}
                  onChange={toggleSelectAllPractitioners}
                />
                <span className="text-gray-600">
                  {selectedPractitioners.size > 0
                    ? `${selectedPractitioners.size} selected`
                    : 'Select all'}
                </span>
              </label>
              {selectedPractitioners.size > 0 && (
                <>
                  <div className="h-4 w-px bg-gray-300" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                    disabled={batchPublish.isPending}
                    onClick={() => handleBatchPublish('practitioners', 'published')}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                    disabled={batchPublish.isPending}
                    onClick={() => handleBatchPublish('practitioners', 'draft')}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Set Draft
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                    disabled={batchPublish.isPending || batchDelete.isPending}
                    onClick={() => setBatchDeleteConfirm('practitioners')}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                  {(batchPublish.isPending || batchDelete.isPending) && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                </>
              )}
            </div>
          )}

          {statusFilter === 'draft' && practitioners.length > 0 && (
            <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50/60 flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">⚠</span>
              <div className="text-sm">
                <span className="font-semibold text-amber-800">{practitioners.length} draft practitioners</span>
                <span className="text-amber-700"> awaiting review. Use controls below to publish, edit, or delete each one. Near-miss duplicates are in <code className="font-mono text-xs bg-amber-100 px-1 rounded">pipeline/output/gm_review.jsonl</code>.</span>
              </div>
            </div>
          )}

          {practitionersLoading
            ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
            : practitioners && practitioners.length > 0
              ? <>
                  {practitioners.map(renderPractitionerRow)}
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">{practitionerPageDisplay}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPractitionerPage(prev => Math.max(0, prev - 1))}
                        disabled={practitionerPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPractitionerPage(prev => Math.min(practitionerPages - 1, prev + 1))}
                        disabled={practitionerPage === practitionerPages - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </>
              : <p className="text-center text-gray-500 py-8">No practitioners found.</p>
          }
        </TabsContent>

        {/* ── CENTERS TAB ── */}
        <TabsContent value="centers" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Wellness Centers</h2>
            <Dialog open={isAddCenterOpen} onOpenChange={setIsAddCenterOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Center</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Wellness Center</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCenterSubmit} className="space-y-4">

                  {/* Multi-photo upload */}
                  <div>
                    <Label>Photos</Label>
                    <p className="text-xs text-gray-500 mb-1">First photo becomes the cover image</p>
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => centerFileRef.current?.click()}
                      disabled={centerPhotoPreviews.length >= MAX_PHOTOS}
                      className="flex items-center gap-1.5">
                      <ImagePlus className="w-4 h-4" />
                      Add Photos ({centerPhotoPreviews.length}/{MAX_PHOTOS})
                    </Button>
                    <input ref={centerFileRef} type="file" accept="image/*"
                      multiple className="hidden" onChange={handleCenterPhotosChange} />
                    {centerPhotoPreviews.length > 0 && (
                      <ImageStrip urls={centerPhotoPreviews} onRemove={removeCenterPhoto} />
                    )}
                  </div>

                  <div>
                    <Label htmlFor="c-name">Name *</Label>
                    <Input id="c-name" placeholder="Center name"
                      value={centerForm.name}
                      onChange={e => handleCenterChange('name', e.target.value)} required />
                  </div>

                  <div>
                    <Label htmlFor="c-desc">Description</Label>
                    <Textarea id="c-desc" placeholder="Brief description"
                      value={centerForm.description}
                      onChange={e => handleCenterChange('description', e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Select value={centerForm.center_type}
                        onValueChange={v => handleCenterChange('center_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spa">Spa</SelectItem>
                          <SelectItem value="wellness_center">Wellness Center</SelectItem>
                          <SelectItem value="yoga_studio">Yoga Studio</SelectItem>
                          <SelectItem value="clinic">Clinic</SelectItem>
                          <SelectItem value="retreat_center">Retreat Center</SelectItem>
                          <SelectItem value="fitness_center">Fitness Center</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>City</Label>
                      <Select value={centerForm.city}
                        onValueChange={v => handleCenterChange('city', v)}>
                        <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                        <SelectContent>
                          {(CITIES_BY_ISLAND[centerForm.island] || CITIES_BY_ISLAND.big_island).map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="c-address">Address</Label>
                    <Input id="c-address" placeholder="Street address"
                      value={centerForm.address}
                      onChange={e => handleCenterChange('address', e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="c-phone">Phone</Label>
                      <Input id="c-phone" placeholder="(808) 555-0100"
                        value={centerForm.phone}
                        onChange={e => handleCenterChange('phone', e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="c-email">Email</Label>
                      <Input id="c-email" type="email" placeholder="email@example.com"
                        value={centerForm.email}
                        onChange={e => handleCenterChange('email', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="c-website">Website</Label>
                    <Input id="c-website" placeholder="https://"
                      value={centerForm.website_url}
                      onChange={e => handleCenterChange('website_url', e.target.value)} />
                  </div>

                  <div>
                    <Label>Status</Label>
                    <Select value={centerForm.status}
                      onValueChange={v => handleCenterChange('status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full"
                    disabled={insertCenter.isPending || centerUploading}>
                    {(insertCenter.isPending || centerUploading)
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {centerUploading ? `Uploading photos…` : 'Saving…'}
                        </>
                      : 'Save Center'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Centers-specific filters (Part 1) */}
          <div className="flex flex-wrap gap-2 mb-3">
            <Select value={centerTypeFilter} onValueChange={v => { setCenterTypeFilter(v); setCenterPage(0); }}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="All center types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All center types</SelectItem>
                <SelectItem value="spa">Spa</SelectItem>
                <SelectItem value="wellness_center">Wellness Center</SelectItem>
                <SelectItem value="yoga_studio">Yoga Studio</SelectItem>
                <SelectItem value="clinic">Clinic</SelectItem>
                <SelectItem value="retreat_center">Retreat Center</SelectItem>
                <SelectItem value="fitness_center">Fitness Center</SelectItem>
              </SelectContent>
            </Select>
            <Select value={missingDataFilter} onValueChange={v => { setMissingDataFilter(v); setCenterPage(0); }}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="All records" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All records</SelectItem>
                <SelectItem value="phone">Missing phone</SelectItem>
                <SelectItem value="email">Missing email</SelectItem>
                <SelectItem value="phone_or_email">Missing phone or email</SelectItem>
                <SelectItem value="description">Missing description</SelectItem>
                <SelectItem value="photo">Missing photo</SelectItem>
              </SelectContent>
            </Select>
            {(centerTypeFilter !== 'all' || missingDataFilter !== 'all') && (
              <button
                className="text-xs text-blue-600 hover:underline px-2"
                onClick={() => { setCenterTypeFilter('all'); setMissingDataFilter('all'); setCenterPage(0); }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Batch action bar — centers */}
          {centers.length > 0 && (
            <div className="flex items-center gap-3 mb-3 py-2 px-3 bg-gray-50 rounded-lg border text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-blue-600 cursor-pointer"
                  checked={centers.length > 0 && selectedCenters.size === centers.length}
                  onChange={toggleSelectAllCenters}
                />
                <span className="text-gray-600">
                  {selectedCenters.size > 0
                    ? `${selectedCenters.size} selected`
                    : 'Select all'}
                </span>
              </label>
              {selectedCenters.size > 0 && (
                <>
                  <div className="h-4 w-px bg-gray-300" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                    disabled={batchPublish.isPending}
                    onClick={() => handleBatchPublish('centers', 'published')}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                    disabled={batchPublish.isPending}
                    onClick={() => handleBatchPublish('centers', 'draft')}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Set Draft
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                    disabled={batchPublish.isPending || batchDelete.isPending}
                    onClick={() => setBatchDeleteConfirm('centers')}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                  {(batchPublish.isPending || batchDelete.isPending) && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                </>
              )}
            </div>
          )}

          {centersLoading
            ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
            : centers && centers.length > 0
              ? <>
                  {centers.map(renderCenterRow)}
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">{centerPageDisplay}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCenterPage(prev => Math.max(0, prev - 1))}
                        disabled={centerPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCenterPage(prev => Math.min(centerPages - 1, prev + 1))}
                        disabled={centerPage === centerPages - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </>
              : <p className="text-center text-gray-500 py-8">No centers found.</p>
          }
        </TabsContent>

        {/* ── CLAIMS TAB ── */}
        <TabsContent value="claims" className="mt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-xl font-semibold">Claim Requests</h2>
            <div className="flex gap-2">
              {(['pending', 'approved', 'denied'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setClaimStatusFilter(s); fetchClaims(s); }}
                  className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-colors ${
                    claimStatusFilter === s
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                >
                  {s}
                </button>
              ))}
              <Button variant="outline" size="sm" onClick={() => fetchClaims(claimStatusFilter)}>
                Refresh
              </Button>
            </div>
          </div>

          {claimsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : claimRequests.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No {claimStatusFilter} claim requests.</p>
          ) : (
            <div className="space-y-3">
              {claimRequests.map(claim => (
                <Card key={claim.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {claim.practitioners?.name ?? claim.practitioner_id}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Submitted by <span className="font-medium">{claim.user_email}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(claim.created_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                        {claim.document_name && (
                          <button
                            onClick={() => claim.document_url && getDocUrl(claim.document_url)}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {claim.document_name}
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                        {claim.admin_notes && (
                          <p className="mt-1 text-xs text-muted-foreground italic">Note: {claim.admin_notes}</p>
                        )}
                      </div>

                      {claim.status === 'pending' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {denyingClaimId === claim.id ? (
                            <div className="flex flex-col gap-2 min-w-48">
                              <Input
                                placeholder="Reason (optional)"
                                value={denyNotes}
                                onChange={e => setDenyNotes(e.target.value)}
                                className="text-sm h-8"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={claimActionBusy === claim.id}
                                  onClick={() => handleDenyClaim(claim)}
                                >
                                  {claimActionBusy === claim.id
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : 'Confirm Deny'
                                  }
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { setDenyingClaimId(null); setDenyNotes(''); }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                disabled={!!claimActionBusy}
                                onClick={() => handleApproveClaim(claim)}
                                className="gap-1.5"
                              >
                                {claimActionBusy === claim.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <CheckCircle className="h-3.5 w-3.5" />
                                }
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!!claimActionBusy}
                                onClick={() => setDenyingClaimId(claim.id)}
                                className="gap-1.5 text-destructive hover:text-destructive"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Deny
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      {claim.status !== 'pending' && (
                        <Badge variant={claim.status === 'approved' ? 'default' : 'secondary'} className="capitalize">
                          {claim.status}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="articles" className="mt-6">
          <AdminArticles />
        </TabsContent>

        {/* ── FLAGS TAB ── */}
        <TabsContent value="flags" className="mt-6">
          <AdminFlags />
        </TabsContent>

        {/* ── ACCOUNTS TAB ── */}
        <TabsContent value="accounts" className="mt-6">
          <AdminAccounts />
        </TabsContent>

        {/* ── LEADS TAB ── */}
        <TabsContent value="leads" className="mt-6">
          <AdminLeads />
        </TabsContent>

        {/* ── QUEUE TAB ── */}
        <TabsContent value="queue" className="mt-6">
          <AdminQueue />
        </TabsContent>
      </Tabs>

      {/* ── Edit Practitioner Dialog ── */}
      <Dialog open={!!editingPractitioner} onOpenChange={open => !open && setEditingPractitioner(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Practitioner</DialogTitle>
          </DialogHeader>
          {editingPractitioner && (
            <form onSubmit={handleEditPractitionerSubmit} className="space-y-4">

              {/* Status + Tier — top row for quick admin triage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={editPractitionerForm.status}
                    onValueChange={v => handleEditPractitionerChange('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subscription Tier</Label>
                  <Select
                    value={(editingPractitioner as any)?.tier ?? 'free'}
                    onValueChange={v => {
                      if (!editingPractitioner) return;
                      setListingTier.mutate({
                        listingId: editingPractitioner.id,
                        listingType: 'practitioner',
                        tier: v as 'free' | 'premium' | 'featured',
                        island: editingPractitioner.island ?? 'big_island',
                        ownerId: (editingPractitioner as any).owner_id ?? null,
                        previousTier: (editingPractitioner as any).tier ?? null,
                      }, {
                        onSuccess: () => toast.success(`Tier set to ${v}`),
                        onError: (e: Error) => toast.error(e.message),
                      });
                    }}
                    disabled={setListingTier.isPending}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="premium">⭐ Premium</SelectItem>
                      <SelectItem value="featured">👑 Featured</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Featured claims one of 5 island slots.</p>
                </div>
              </div>

              {/* Photo upload */}
              <div>
                <Label>Profile Photo</Label>
                <div className="mt-2 flex items-center gap-3">
                  {editPractitionerPhotoPreview ? (
                    <div className="relative">
                      <img src={editPractitionerPhotoPreview} alt="Preview"
                        className="w-20 h-20 rounded-full object-cover border" />
                      <button type="button"
                        onClick={() => { setEditPractitionerPhotoFile(null); setEditPractitionerPhotoPreview(null); }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : editPractitionerForm.avatar_url ? (
                    <div className="relative">
                      <img src={editPractitionerForm.avatar_url} alt="Current"
                        className="w-20 h-20 rounded-full object-cover border" />
                      <button type="button"
                        onClick={() => handleEditPractitionerChange('avatar_url', null)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => editPractitionerFileRef.current?.click()}>
                    Choose Photo
                  </Button>
                  <input ref={editPractitionerFileRef} type="file" accept="image/*"
                    className="hidden" onChange={handleEditPractitionerPhotoChange} />
                </div>
              </div>

              <div>
                <Label htmlFor="ep-name">Name (pipeline / display fallback) *</Label>
                <Input id="ep-name" placeholder="Full name or business name from pipeline"
                  value={editPractitionerForm.name}
                  onChange={e => handleEditPractitionerChange('name', e.target.value)} required />
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shown only if First + Last Name are blank.
                </p>
              </div>

              {/* Personal name fields — highest display priority */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-md border border-blue-200 bg-blue-50/50">
                <div className="col-span-2">
                  <p className="text-xs font-medium text-blue-700 mb-2">
                    Personal Name <span className="font-normal text-blue-500">(shown on card instead of Name above)</span>
                  </p>
                </div>
                <div>
                  <Label htmlFor="ep-first-name">First Name</Label>
                  <Input id="ep-first-name" placeholder="Jane"
                    value={editPractitionerForm.first_name}
                    onChange={e => handleEditPractitionerChange('first_name', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ep-last-name">Last Name</Label>
                  <Input id="ep-last-name" placeholder="Doe"
                    value={editPractitionerForm.last_name}
                    onChange={e => handleEditPractitionerChange('last_name', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="ep-display-name">Display Name Override</Label>
                  <Input id="ep-display-name" placeholder="Leave blank to use First + Last"
                    value={editPractitionerForm.display_name}
                    onChange={e => handleEditPractitionerChange('display_name', e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-0.5">
                    e.g. "Jamie Belmarez" if legal name differs from preferred name.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="ep-business-name">Business Name</Label>
                <Input id="ep-business-name" placeholder="e.g. Hilo Healing Arts (optional)"
                  value={editPractitionerForm.business_name}
                  onChange={e => handleEditPractitionerChange('business_name', e.target.value)} />
              </div>

              <div>
                <Label>Modalities</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mt-2 max-h-44 overflow-y-auto p-2 border rounded bg-gray-50">
                  {MODALITIES_LIST.map(m => (
                    <label key={m} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input type="checkbox"
                        checked={editPractitionerForm.modalities.includes(m)}
                        onChange={() => toggleEditModality(m)}
                        className="w-3.5 h-3.5" />
                      {m}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="ep-bio">Bio</Label>
                <Textarea id="ep-bio" placeholder="Brief bio"
                  value={editPractitionerForm.bio}
                  onChange={e => handleEditPractitionerChange('bio', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Select value={editPractitionerForm.city}
                    onValueChange={v => handleEditPractitionerChange('city', v)}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {(CITIES_BY_ISLAND[editPractitionerForm.island] || CITIES_BY_ISLAND.big_island).map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ep-phone">Phone</Label>
                  <Input id="ep-phone" placeholder="(808) 555-0100"
                    value={editPractitionerForm.phone}
                    onChange={e => handleEditPractitionerChange('phone', e.target.value)} />
                </div>
              </div>

              <div>
                <Label>Island</Label>
                <Select value={editPractitionerForm.island || 'big_island'}
                  onValueChange={v => handleEditPractitionerChange('island', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ISLANDS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Session Type</Label>
                <Select value={(editPractitionerForm as any).session_type || 'in_person'}
                  onValueChange={v => handleEditPractitionerChange('session_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In-Person Only</SelectItem>
                    <SelectItem value="online">Online Only</SelectItem>
                    <SelectItem value="both">In-Person & Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Affiliated Center</Label>
                <Select
                  value={(editPractitionerForm as any).center_id ?? 'none'}
                  onValueChange={v => setEditPractitionerForm(prev => ({
                    ...prev,
                    center_id: v === 'none' ? null : v,
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No affiliation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No affiliation</SelectItem>
                    {allCenters.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ep-address">Address</Label>
                <Input id="ep-address" placeholder="Street address"
                  value={editPractitionerForm.address}
                  onChange={e => handleEditPractitionerChange('address', e.target.value)} />
              </div>

              {/* Lat/Lng + Geocode */}
              <div className="space-y-1">
                <Label className="text-sm">Coordinates</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Latitude"
                    type="number"
                    step="any"
                    value={(editPractitionerForm as any).lat ?? ''}
                    onChange={e => handleEditPractitionerChange('lat', e.target.value ? parseFloat(e.target.value) : null)}
                    className="text-sm h-8 w-32"
                  />
                  <Input
                    placeholder="Longitude"
                    type="number"
                    step="any"
                    value={(editPractitionerForm as any).lng ?? ''}
                    onChange={e => handleEditPractitionerChange('lng', e.target.value ? parseFloat(e.target.value) : null)}
                    className="text-sm h-8 w-32"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={geocoding}
                    onClick={() => geocodeAddress(
                      editPractitionerForm.address,
                      editPractitionerForm.city,
                      (lat, lng) => {
                        handleEditPractitionerChange('lat', lat);
                        handleEditPractitionerChange('lng', lng);
                      }
                    )}
                    className="h-8 text-xs gap-1"
                  >
                    {geocoding ? <><Loader2 className="h-3 w-3 animate-spin" /> Finding…</> : '📍 Find Coords'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ep-email">Email</Label>
                  <Input id="ep-email" type="email" placeholder="email@example.com"
                    value={editPractitionerForm.email}
                    onChange={e => handleEditPractitionerChange('email', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ep-website">Website</Label>
                  <Input id="ep-website" placeholder="https://"
                    value={editPractitionerForm.website_url}
                    onChange={e => handleEditPractitionerChange('website_url', e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="ep-accepts">Accepts New Clients</Label>
                <Switch id="ep-accepts"
                  checked={editPractitionerForm.accepts_new_clients}
                  onCheckedChange={v => handleEditPractitionerChange('accepts_new_clients', v)} />
              </div>

              {/* Premium Features */}
              <div className="border rounded-lg p-4 space-y-4 bg-amber-50 border-amber-200">
                <h4 className="font-semibold text-amber-800 text-sm">⭐ Premium Features</h4>

                {/* Featured toggle */}
                <div className="flex items-center justify-between">
                  <Label>Featured on Homepage</Label>
                  <Switch
                    checked={(editPractitionerForm as any).is_featured || false}
                    onCheckedChange={v => handleEditPractitionerChange('is_featured', v)}
                  />
                </div>

                {/* Booking Configuration */}
                <div className="space-y-3 border-t border-amber-200 pt-3">
                  <p className="text-sm font-medium text-amber-800">📅 Booking Configuration</p>
                  <div>
                    <Label htmlFor="ep-booking">Booking URL</Label>
                    <Input id="ep-booking" placeholder="e.g. https://calendly.com/your-name"
                      value={editPractitionerForm.external_booking_url}
                      onChange={e => handleEditPractitionerChange('external_booking_url', e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Supports Calendly and Acuity Scheduling</p>
                  </div>
                  <div>
                    <Label htmlFor="ep-booking-label">Button Label</Label>
                    <Select
                      value={editPractitionerForm.booking_label || 'Book Appointment'}
                      onValueChange={v => handleEditPractitionerChange('booking_label', v)}
                    >
                      <SelectTrigger id="ep-booking-label"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Book Appointment">Book Appointment</SelectItem>
                        <SelectItem value="Schedule Discovery Call">Schedule Discovery Call</SelectItem>
                        <SelectItem value="Book a Session">Book a Session</SelectItem>
                        <SelectItem value="Request a Consultation">Request a Consultation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editingPractitioner && (
                    <div className="flex items-center gap-2 text-xs">
                      {(() => {
                        const tier = (editingPractitioner as any).tier ?? 'free';
                        const hasUrl = !!editPractitionerForm.external_booking_url;
                        const embedActive = (tier === 'premium' || tier === 'featured') && hasUrl;
                        return embedActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 font-medium">
                            ✓ Embed active on profile
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {!hasUrl ? 'Add a booking URL to enable embed' : 'Upgrade to Premium to enable calendar embed'}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Social Links */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Social Links</Label>
                  {(['instagram', 'facebook', 'linkedin', 'x', 'substack'] as const).map(platform => (
                    <div key={platform} className="flex items-center gap-2">
                      <span className="w-20 text-xs text-gray-500 capitalize">{platform === 'x' ? 'X / Twitter' : platform === 'substack' ? 'Substack' : platform}</span>
                      <Input
                        placeholder={
                          platform === 'x' ? 'https://x.com/...' :
                          platform === 'substack' ? 'https://yourname.substack.com' :
                          `https://${platform}.com/...`
                        }
                        value={((editPractitionerForm as any).social_links?.[platform]) || ''}
                        onChange={e => handleEditPractitionerChange('social_links', {
                          ...((editPractitionerForm as any).social_links || {}),
                          [platform]: e.target.value,
                        })}
                        className="text-sm h-8"
                      />
                    </div>
                  ))}
                </div>

                {/* Working Hours */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Working Hours</Label>
                  <div className="space-y-1">
                    {DAYS.map(({ key, label }) => {
                      const dayHours = (editPractitionerForm as any).working_hours?.[key];
                      const isOpen = dayHours !== null && dayHours !== undefined;
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={isOpen}
                            onChange={e => {
                              const wh = { ...((editPractitionerForm as any).working_hours || {}) };
                              wh[key] = e.target.checked ? DEFAULT_HOURS : null;
                              handleEditPractitionerChange('working_hours', wh);
                            }}
                            className="w-3.5 h-3.5"
                          />
                          <span className="w-24 text-xs text-gray-600">{label}</span>
                          {isOpen && (
                            <>
                              <Input
                                type="text"
                                value={dayHours?.open || ''}
                                onChange={e => {
                                  const wh = { ...((editPractitionerForm as any).working_hours || {}) };
                                  wh[key] = { ...dayHours, open: e.target.value };
                                  handleEditPractitionerChange('working_hours', wh);
                                }}
                                placeholder="9:00 AM"
                                className="h-7 text-xs w-24"
                              />
                              <span className="text-xs text-gray-400">–</span>
                              <Input
                                type="text"
                                value={dayHours?.close || ''}
                                onChange={e => {
                                  const wh = { ...((editPractitionerForm as any).working_hours || {}) };
                                  wh[key] = { ...dayHours, close: e.target.value };
                                  handleEditPractitionerChange('working_hours', wh);
                                }}
                                placeholder="5:00 PM"
                                className="h-7 text-xs w-24"
                              />
                            </>
                          )}
                          {!isOpen && <span className="text-xs text-gray-400 italic">Closed</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Testimonials */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Testimonials</Label>
                  {((editPractitionerForm as any).testimonials || []).map((t: {author: string; text: string; date: string}, idx: number) => (
                    <div key={idx} className="border rounded p-2 space-y-1 bg-white">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Author name"
                          value={t.author}
                          onChange={e => {
                            const ts = [...((editPractitionerForm as any).testimonials || [])];
                            ts[idx] = { ...ts[idx], author: e.target.value };
                            handleEditPractitionerChange('testimonials', ts);
                          }}
                          className="h-7 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const ts = ((editPractitionerForm as any).testimonials || []).filter((_: unknown, i: number) => i !== idx);
                            handleEditPractitionerChange('testimonials', ts);
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Textarea
                        placeholder="Testimonial text"
                        value={t.text}
                        onChange={e => {
                          const ts = [...((editPractitionerForm as any).testimonials || [])];
                          ts[idx] = { ...ts[idx], text: e.target.value };
                          handleEditPractitionerChange('testimonials', ts);
                        }}
                        className="text-xs min-h-[60px]"
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const ts = [...((editPractitionerForm as any).testimonials || [])];
                      ts.push({ author: '', text: '', date: new Date().toISOString().slice(0, 10) });
                      handleEditPractitionerChange('testimonials', ts);
                    }}
                    className="text-xs h-7"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Testimonial
                  </Button>
                </div>

                {/* Retreat Links */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Retreat Links</Label>
                  {((editPractitionerForm as any).retreat_links || []).map((url: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="https://example.com/retreat"
                        value={url}
                        onChange={e => {
                          const links = [...((editPractitionerForm as any).retreat_links || [])];
                          links[idx] = e.target.value;
                          handleEditPractitionerChange('retreat_links', links);
                        }}
                        className="h-7 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const links = ((editPractitionerForm as any).retreat_links || []).filter((_: unknown, i: number) => i !== idx);
                          handleEditPractitionerChange('retreat_links', links);
                        }}
                        className="text-red-400 hover:text-red-600 flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const links = [...((editPractitionerForm as any).retreat_links || [])];
                      links.push('');
                      handleEditPractitionerChange('retreat_links', links);
                    }}
                    className="text-xs h-7"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Retreat Link
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full"
                disabled={updatePractitioner.isPending || editPractitionerUploading}>
                {(updatePractitioner.isPending || editPractitionerUploading)
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  : 'Save Changes'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit Center Dialog ── */}
      <Dialog open={!!editingCenter} onOpenChange={open => !open && setEditingCenter(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Wellness Center</DialogTitle>
          </DialogHeader>
          {editingCenter && (
            <form onSubmit={handleEditCenterSubmit} className="space-y-4">

              {/* Existing photos */}
              {editCenterForm.photos && editCenterForm.photos.length > 0 && (
                <div>
                  <Label>Current Photos ({editCenterForm.photos.length}/5)</Label>
                  <ImageStrip urls={editCenterForm.photos} onRemove={(i) =>
                    handleEditCenterChange('photos', editCenterForm.photos.filter((_, idx) => idx !== i))
                  } />
                </div>
              )}

              {/* New photos */}
              <div>
                <Label>Add More Photos</Label>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => editCenterFileRef.current?.click()}
                  disabled={(editCenterForm.photos?.length ?? 0) + editCenterPhotoPreviews.length >= MAX_PHOTOS}
                  className="flex items-center gap-1.5 mt-1">
                  <ImagePlus className="w-4 h-4" />
                  Add Photos ({(editCenterForm.photos?.length ?? 0) + editCenterPhotoPreviews.length}/{MAX_PHOTOS})
                </Button>
                <input ref={editCenterFileRef} type="file" accept="image/*"
                  multiple className="hidden" onChange={handleEditCenterPhotosChange} />
                {editCenterPhotoPreviews.length > 0 && (
                  <ImageStrip urls={editCenterPhotoPreviews} onRemove={(i) => {
                    setEditCenterPhotoFiles(prev => prev.filter((_, idx) => idx !== i));
                    setEditCenterPhotoPreviews(prev => prev.filter((_, idx) => idx !== i));
                  }} />
                )}
              </div>

              <div>
                <Label htmlFor="ec-name">Name *</Label>
                <Input id="ec-name" placeholder="Center name"
                  value={editCenterForm.name}
                  onChange={e => handleEditCenterChange('name', e.target.value)} required />
              </div>

              <div>
                <Label htmlFor="ec-desc">Description</Label>
                <Textarea id="ec-desc" placeholder="Brief description"
                  value={editCenterForm.description}
                  onChange={e => handleEditCenterChange('description', e.target.value)} />
              </div>

              <div>
                <Label>Modalities</Label>
                <div className="mt-1 max-h-40 overflow-y-auto rounded border border-input p-2">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {MODALITIES_LIST.map(m => (
                      <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(editCenterForm.modalities || []).includes(m)}
                          onChange={e => {
                            const current = editCenterForm.modalities || [];
                            handleEditCenterChange('modalities',
                              e.target.checked ? [...current, m] : current.filter(x => x !== m)
                            );
                          }}
                        />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={editCenterForm.center_type}
                    onValueChange={v => handleEditCenterChange('center_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spa">Spa</SelectItem>
                      <SelectItem value="wellness_center">Wellness Center</SelectItem>
                      <SelectItem value="yoga_studio">Yoga Studio</SelectItem>
                      <SelectItem value="clinic">Clinic</SelectItem>
                      <SelectItem value="retreat_center">Retreat Center</SelectItem>
                      <SelectItem value="fitness_center">Fitness Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>City</Label>
                  <Select value={editCenterForm.city}
                    onValueChange={v => handleEditCenterChange('city', v)}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {(CITIES_BY_ISLAND[editCenterForm.island] || CITIES_BY_ISLAND.big_island).map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Island</Label>
                <Select value={editCenterForm.island || 'big_island'}
                  onValueChange={v => handleEditCenterChange('island', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ISLANDS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Session Type</Label>
                <Select value={(editCenterForm as any).session_type || 'in_person'}
                  onValueChange={v => handleEditCenterChange('session_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In-Person Only</SelectItem>
                    <SelectItem value="online">Online Only</SelectItem>
                    <SelectItem value="both">In-Person & Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ec-address">Address</Label>
                <Input id="ec-address" placeholder="Street address"
                  value={editCenterForm.address}
                  onChange={e => handleEditCenterChange('address', e.target.value)} />
              </div>

              {/* Lat/Lng + Geocode */}
              <div className="space-y-1">
                <Label className="text-sm">Coordinates</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Latitude"
                    type="number"
                    step="any"
                    value={(editCenterForm as any).lat ?? ''}
                    onChange={e => handleEditCenterChange('lat', e.target.value ? parseFloat(e.target.value) : null)}
                    className="text-sm h-8 w-32"
                  />
                  <Input
                    placeholder="Longitude"
                    type="number"
                    step="any"
                    value={(editCenterForm as any).lng ?? ''}
                    onChange={e => handleEditCenterChange('lng', e.target.value ? parseFloat(e.target.value) : null)}
                    className="text-sm h-8 w-32"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={geocoding}
                    onClick={() => geocodeAddress(
                      editCenterForm.address,
                      editCenterForm.city,
                      (lat, lng) => {
                        handleEditCenterChange('lat', lat);
                        handleEditCenterChange('lng', lng);
                      }
                    )}
                    className="h-8 text-xs gap-1"
                  >
                    {geocoding ? <><Loader2 className="h-3 w-3 animate-spin" /> Finding…</> : '📍 Find Coords'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ec-phone">Phone</Label>
                  <Input id="ec-phone" placeholder="(808) 555-0100"
                    value={editCenterForm.phone}
                    onChange={e => handleEditCenterChange('phone', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ec-email">Email</Label>
                  <Input id="ec-email" type="email" placeholder="email@example.com"
                    value={editCenterForm.email}
                    onChange={e => handleEditCenterChange('email', e.target.value)} />
                </div>
              </div>

              <div>
                <Label htmlFor="ec-website">Website</Label>
                <Input id="ec-website" placeholder="https://"
                  value={editCenterForm.website_url}
                  onChange={e => handleEditCenterChange('website_url', e.target.value)} />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={editCenterForm.status}
                  onValueChange={v => handleEditCenterChange('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Subscription Tier */}
              <div>
                <Label>Subscription Tier</Label>
                <Select
                  value={(editingCenter as any).tier ?? 'free'}
                  onValueChange={v => {
                    setListingTier.mutate({
                      listingId: editingCenter.id,
                      listingType: 'center',
                      tier: v as 'free' | 'premium' | 'featured',
                      island: editingCenter.island ?? 'big_island',
                      ownerId: (editingCenter as any).owner_id ?? null,
                      previousTier: (editingCenter as any).tier ?? null,
                    }, {
                      onSuccess: () => toast.success(`Tier set to ${v}`),
                      onError: (e: Error) => toast.error(e.message),
                    });
                  }}
                  disabled={setListingTier.isPending}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">⭐ Premium</SelectItem>
                    <SelectItem value="featured">👑 Featured</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Premium Features */}
              <div className="border rounded-lg p-4 space-y-4 bg-amber-50 border-amber-200">
                <h4 className="font-semibold text-amber-800 text-sm">⭐ Premium Features</h4>

                {/* Featured toggle */}
                <div className="flex items-center justify-between">
                  <Label>Featured on Homepage</Label>
                  <Switch
                    checked={(editCenterForm as any).is_featured || false}
                    onCheckedChange={v => handleEditCenterChange('is_featured', v)}
                  />
                </div>

                {/* Social Links */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Social Links</Label>
                  {(['instagram', 'facebook', 'linkedin', 'x', 'substack'] as const).map(platform => (
                    <div key={platform} className="flex items-center gap-2">
                      <span className="w-20 text-xs text-gray-500 capitalize">{platform === 'x' ? 'X / Twitter' : platform === 'substack' ? 'Substack' : platform}</span>
                      <Input
                        placeholder={
                          platform === 'x' ? 'https://x.com/...' :
                          platform === 'substack' ? 'https://yourname.substack.com' :
                          `https://${platform}.com/...`
                        }
                        value={((editCenterForm as any).social_links?.[platform]) || ''}
                        onChange={e => handleEditCenterChange('social_links', {
                          ...((editCenterForm as any).social_links || {}),
                          [platform]: e.target.value,
                        })}
                        className="text-sm h-8"
                      />
                    </div>
                  ))}
                </div>

                {/* Working Hours */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Working Hours</Label>
                  <div className="space-y-1">
                    {DAYS.map(({ key, label }) => {
                      const dayHours = (editCenterForm as any).working_hours?.[key];
                      const isOpen = dayHours !== null && dayHours !== undefined;
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={isOpen}
                            onChange={e => {
                              const wh = { ...((editCenterForm as any).working_hours || {}) };
                              wh[key] = e.target.checked ? DEFAULT_HOURS : null;
                              handleEditCenterChange('working_hours', wh);
                            }}
                            className="w-3.5 h-3.5"
                          />
                          <span className="w-24 text-xs text-gray-600">{label}</span>
                          {isOpen && (
                            <>
                              <Input
                                type="text"
                                value={dayHours?.open || ''}
                                onChange={e => {
                                  const wh = { ...((editCenterForm as any).working_hours || {}) };
                                  wh[key] = { ...dayHours, open: e.target.value };
                                  handleEditCenterChange('working_hours', wh);
                                }}
                                placeholder="9:00 AM"
                                className="h-7 text-xs w-24"
                              />
                              <span className="text-xs text-gray-400">–</span>
                              <Input
                                type="text"
                                value={dayHours?.close || ''}
                                onChange={e => {
                                  const wh = { ...((editCenterForm as any).working_hours || {}) };
                                  wh[key] = { ...dayHours, close: e.target.value };
                                  handleEditCenterChange('working_hours', wh);
                                }}
                                placeholder="5:00 PM"
                                className="h-7 text-xs w-24"
                              />
                            </>
                          )}
                          {!isOpen && <span className="text-xs text-gray-400 italic">Closed</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Testimonials */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Testimonials</Label>
                  {((editCenterForm as any).testimonials || []).map((t: {author: string; text: string; date: string}, idx: number) => (
                    <div key={idx} className="border rounded p-2 space-y-1 bg-white">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Author name"
                          value={t.author}
                          onChange={e => {
                            const ts = [...((editCenterForm as any).testimonials || [])];
                            ts[idx] = { ...ts[idx], author: e.target.value };
                            handleEditCenterChange('testimonials', ts);
                          }}
                          className="h-7 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const ts = ((editCenterForm as any).testimonials || []).filter((_: unknown, i: number) => i !== idx);
                            handleEditCenterChange('testimonials', ts);
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Textarea
                        placeholder="Testimonial text"
                        value={t.text}
                        onChange={e => {
                          const ts = [...((editCenterForm as any).testimonials || [])];
                          ts[idx] = { ...ts[idx], text: e.target.value };
                          handleEditCenterChange('testimonials', ts);
                        }}
                        className="text-xs min-h-[60px]"
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const ts = [...((editCenterForm as any).testimonials || [])];
                      ts.push({ author: '', text: '', date: new Date().toISOString().slice(0, 10) });
                      handleEditCenterChange('testimonials', ts);
                    }}
                    className="text-xs h-7"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Testimonial
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full"
                disabled={updateCenter.isPending || editCenterUploading}>
                {(updateCenter.isPending || editCenterUploading)
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editCenterUploading ? `Uploading photos…` : 'Saving…'}
                    </>
                  : 'Save Changes'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Convert to Center Dialog ── */}
      <Dialog open={!!convertingPractitioner} onOpenChange={open => !open && setConvertingPractitioner(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert to Center</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Convert <strong>{convertingPractitioner?.name}</strong> from a practitioner listing to a center. This will move the record to the Centers table.
            </p>
            <div>
              <Label>Center Type</Label>
              <Select value={convertCenterType} onValueChange={v => setConvertCenterType(v as typeof convertCenterType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wellness_center">Wellness Center</SelectItem>
                  <SelectItem value="yoga_studio">Yoga Studio</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="spa">Spa</SelectItem>
                  <SelectItem value="retreat_center">Retreat Center</SelectItem>
                  <SelectItem value="fitness_center">Fitness Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConvertingPractitioner(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={convertPractitionerToCenter.isPending}
                onClick={handleConvertToCenter}
              >
                {convertPractitionerToCenter.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Converting...</>
                  : 'Convert'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* ── Convert Center → Practitioner Dialog ── */}
      <Dialog open={!!convertingCenter} onOpenChange={open => !open && setConvertingCenter(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move to Practitioners</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Move <strong>{convertingCenter?.name}</strong> from Centers to the Practitioners table. The record will keep all its existing data.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConvertingCenter(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={convertCenterToPractitioner.isPending}
                onClick={handleConvertToPractitioner}
              >
                {convertCenterToPractitioner.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Moving...</>
                  : 'Move to Practitioners'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Batch Delete Confirm Dialog ── */}
      <Dialog open={!!batchDeleteConfirm} onOpenChange={open => !open && setBatchDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-700">Delete {batchDeleteConfirm === 'practitioners' ? selectedPractitioners.size : selectedCenters.size} listing{(batchDeleteConfirm === 'practitioners' ? selectedPractitioners.size : selectedCenters.size) !== 1 ? 's' : ''}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              This will permanently delete{' '}
              <strong>{batchDeleteConfirm === 'practitioners' ? selectedPractitioners.size : selectedCenters.size}</strong>{' '}
              {batchDeleteConfirm} listing{(batchDeleteConfirm === 'practitioners' ? selectedPractitioners.size : selectedCenters.size) !== 1 ? 's' : ''}.
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setBatchDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={batchDelete.isPending}
                onClick={() => batchDeleteConfirm && handleBatchDelete(batchDeleteConfirm)}
              >
                {batchDelete.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
                  : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Admin Flags Component ────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  closed:     '🚫 Closed / Inactive',
  inaccurate: '✏️ Inaccurate Info',
  duplicate:  '📋 Duplicate',
};

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  reviewed:  'bg-blue-100 text-blue-800 border-blue-200',
  dismissed: 'bg-gray-100 text-gray-500 border-gray-200',
};

function AdminFlags() {
  const [flagStatusFilter, setFlagStatusFilter] = useState<FlagStatus | 'all'>('pending');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const { data: flags = [], isLoading: flagsLoading } = useAdminFlags(
    flagStatusFilter === 'all' ? undefined : flagStatusFilter
  );
  const updateFlag = useUpdateFlag();
  const deleteFlag = useDeleteFlag();

  const handleUpdateStatus = (id: string, status: FlagStatus) => {
    updateFlag.mutate({ id, status, admin_notes: adminNotes[id] });
  };

  const pendingCount = flags.filter(f => f.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Reported Listings</h2>
          {pendingCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              {pendingCount} pending
            </span>
          )}
        </div>
        <Select
          value={flagStatusFilter}
          onValueChange={v => setFlagStatusFilter(v as FlagStatus | 'all')}
        >
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All flags</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {flagsLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : flags.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <Flag className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p className="text-sm">No {flagStatusFilter !== 'all' ? flagStatusFilter : ''} flags</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map(flag => (
            <div key={flag.id} className="rounded-lg border bg-white p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{flag.listing_name || 'Unknown listing'}</span>
                    <span className="text-xs text-gray-400 capitalize">{flag.listing_type}</span>
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[flag.status]}`}>
                      {flag.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs font-medium text-gray-700">
                      {REASON_LABELS[flag.reason] ?? flag.reason}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(flag.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                    {flag.reporter_email && (
                      <span className="text-xs text-gray-400">{flag.reporter_email}</span>
                    )}
                  </div>
                  {flag.details && (
                    <p className="mt-1.5 text-xs text-gray-600 italic">"{flag.details}"</p>
                  )}
                </div>
                {flag.listing_type === 'practitioner' && (
                  <a
                    href={`/profile/${flag.listing_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> View
                  </a>
                )}
              </div>

              {/* Admin notes */}
              <Input
                placeholder="Admin notes (optional)"
                value={adminNotes[flag.id] ?? flag.admin_notes ?? ''}
                onChange={e => setAdminNotes(prev => ({ ...prev, [flag.id]: e.target.value }))}
                className="text-xs h-8"
              />

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {flag.status !== 'reviewed' && (
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
                    disabled={updateFlag.isPending}
                    onClick={() => handleUpdateStatus(flag.id, 'reviewed')}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark reviewed
                  </Button>
                )}
                {flag.status !== 'dismissed' && (
                  <Button
                    size="sm" variant="outline"
                    className="h-7 text-xs text-gray-600 border-gray-300 hover:bg-gray-50"
                    disabled={updateFlag.isPending}
                    onClick={() => handleUpdateStatus(flag.id, 'dismissed')}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Dismiss
                  </Button>
                )}
                <Button
                  size="sm" variant="ghost"
                  className="h-7 text-xs text-gray-400 hover:text-red-500 ml-auto"
                  disabled={deleteFlag.isPending}
                  onClick={() => deleteFlag.mutate(flag.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove flag
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Admin Accounts Component ────────────────────────────────────────────────

const TIER_LABELS: Record<AccountTier, { label: string; color: string; icon: React.ReactNode }> = {
  free:      { label: 'Free',      color: 'bg-gray-100 text-gray-600 border-gray-200',        icon: null },
  premium:   { label: 'Premium',   color: 'bg-blue-100 text-blue-700 border-blue-200',         icon: <Star className="h-3 w-3" /> },
  featured:  { label: 'Featured',  color: 'bg-amber-100 text-amber-700 border-amber-200',      icon: <Crown className="h-3 w-3" /> },
};

const ISLAND_LABELS: Record<string, string> = {
  big_island: 'Big Island',
  oahu:       'Oahu',
  maui:       'Maui',
  kauai:      'Kauai',
  molokai:    'Molokai',
};

function AdminAccounts() {
  const { data: accounts = [], isLoading: accountsLoading } = useAdminAccounts();
  const { data: featuredSlots, isLoading: slotsLoading } = useAdminFeaturedSlots();
  const setTier = useSetAccountTier();
  const removeSlot = useRemoveFeaturedSlot();
  const [activeSection, setActiveSection] = useState<'users' | 'featured'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<AccountTier | 'all'>('all');

  const filtered = accounts.filter(a => {
    const matchesTier = tierFilter === 'all' || a.tier === tierFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || a.email.toLowerCase().includes(q);
    return matchesTier && matchesSearch;
  });

  function handleSetTier(userId: string, tier: AccountTier) {
    setTier.mutate({ userId, tier }, {
      onSuccess: () => toast.success('Tier updated'),
      onError: (e: Error) => toast.error(e.message),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold flex-1">Account Management</h2>
        <div className="flex gap-2">
          <Button
            variant={activeSection === 'users' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('users')}
          >
            <Users className="h-4 w-4 mr-1.5" />
            Users
          </Button>
          <Button
            variant={activeSection === 'featured' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveSection('featured')}
          >
            <Crown className="h-4 w-4 mr-1.5" />
            Featured Slots
          </Button>
        </div>
      </div>

      {/* ── Users section ── */}
      {activeSection === 'users' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search by email…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="max-w-xs h-8 text-sm"
            />
            <div className="flex gap-1">
              {(['all', 'free', 'premium', 'featured'] as const).map(t => (
                <Button
                  key={t}
                  variant={tierFilter === t ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs capitalize"
                  onClick={() => setTierFilter(t)}
                >
                  {t === 'all' ? `All (${accounts.length})` : `${t} (${accounts.filter(a => a.tier === t).length})`}
                </Button>
              ))}
            </div>
          </div>

          {accountsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No accounts found.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map(account => {
                const tierMeta = TIER_LABELS[account.tier] ?? TIER_LABELS.free;
                return (
                  <Card key={account.id} className="p-0 overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4 flex-wrap">
                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm truncate">{account.email}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${tierMeta.color}`}>
                              {tierMeta.icon}
                              {tierMeta.label}
                            </span>
                            {account.subscription_status && (
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${
                                account.subscription_status === 'active'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              }`}>
                                {account.subscription_status}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>Joined {new Date(account.created_at).toLocaleDateString()}</span>
                            {account.subscription_period_end && (
                              <span>Renews {new Date(account.subscription_period_end).toLocaleDateString()}</span>
                            )}
                            <span>{account.practitioner_count} practitioner{account.practitioner_count !== 1 ? 's' : ''}</span>
                            <span>{account.center_count} center{account.center_count !== 1 ? 's' : ''}</span>
                          </div>
                          {/* Listings */}
                          {account.listings.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {account.listings.map(l => (
                                <span key={l.id} className="inline-flex items-center gap-1 text-xs bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                                  <MapPinIcon className="h-2.5 w-2.5 text-gray-400" />
                                  {l.name}
                                  <span className={`ml-0.5 ${l.status === 'published' ? 'text-green-600' : 'text-gray-400'}`}>
                                    ({l.status})
                                  </span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Tier override */}
                        <div className="flex-shrink-0">
                          <Select
                            value={account.tier}
                            onValueChange={(v) => handleSetTier(account.id, v as AccountTier)}
                            disabled={setTier.isPending}
                          >
                            <SelectTrigger className="h-8 text-xs w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="free">Free</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="featured">Featured</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-gray-400 mt-1 text-center">Override tier</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Featured Slots section ── */}
      {activeSection === 'featured' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Up to 5 featured listings per island. Featured listings rotate randomly on the homepage.
          </p>
          {slotsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(ISLAND_LABELS).map(([islandKey, islandLabel]) => {
                const islandData = featuredSlots?.[islandKey] ?? { slots: [], remaining: 5 };
                const occupancy = islandData.slots.length;
                const capacity = 5;
                const pct = Math.round((occupancy / capacity) * 100);

                return (
                  <Card key={islandKey} className="p-0 overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{islandLabel}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          occupancy >= capacity
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : occupancy > 0
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>
                          {occupancy}/{capacity} slots
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            occupancy >= capacity ? 'bg-red-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Slot list */}
                      {islandData.slots.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">No featured listings</p>
                      ) : (
                        <div className="space-y-1.5">
                          {islandData.slots.map(slot => (
                            <div key={slot.id} className="flex items-center gap-2 bg-amber-50 rounded px-2 py-1.5">
                              <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{slot.listing_name ?? slot.listing_id}</p>
                                <p className="text-[10px] text-gray-500 truncate">{slot.owner_email ?? 'unknown owner'}</p>
                              </div>
                              <span className="text-[10px] text-gray-400 flex-shrink-0 capitalize">{slot.listing_type}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-gray-400 hover:text-red-500 flex-shrink-0"
                                disabled={removeSlot.isPending}
                                onClick={() => {
                                  removeSlot.mutate(slot.id, {
                                    onSuccess: () => toast.success(`Removed ${slot.listing_name ?? 'slot'}`),
                                    onError: (e: Error) => toast.error(e.message),
                                  });
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Remaining indicator */}
                      {islandData.remaining > 0 && (
                        <p className="text-[11px] text-gray-400 text-center">
                          {islandData.remaining} slot{islandData.remaining !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Admin Leads Tab ──────────────────────────────────────────────────────────

function AdminLeads() {
  const [island, setIsland] = useState('all');
  const [minScore, setMinScore] = useState(50);
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeads = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const fetchTable = async (table: string) => {
        let q = supabase!
          .from(table)
          .select('id, name, first_name, last_name, island, city, email, phone, website_url, website_platform, website_score, no_website_lead, lead_score, tier, status, modalities')
          .gte('lead_score', minScore)
          .order('lead_score', { ascending: false })
          .limit(200);
        if (island !== 'all') q = q.eq('island', island);
        if (noWebsiteOnly) q = q.eq('no_website_lead', true);
        const { data } = await q;
        return (data || []).map(r => ({ ...r, _table: table }));
      };
      const [practs, centers] = await Promise.all([
        fetchTable('practitioners'),
        fetchTable('centers'),
      ]);
      // Merge and sort by lead_score
      const merged = [...practs, ...centers].sort(
        (a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0)
      );
      setLeads(merged);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [island, minScore, noWebsiteOnly]);

  const platformBadgeColor = (platform: string | null) => {
    if (!platform || platform === 'none') return 'bg-red-100 text-red-700';
    if (['godaddy', 'weebly', 'strikingly', 'jimdo'].includes(platform))
      return 'bg-orange-100 text-orange-700';
    if (['wix', 'wordpress'].includes(platform))
      return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
  };

  const scoreColor = (score: number | null) => {
    if (score === null || score === undefined) return 'text-gray-400';
    if (score >= 75) return 'text-red-600 font-bold';
    if (score >= 50) return 'text-orange-500 font-semibold';
    return 'text-green-600';
  };

  const displayName = (r: any) =>
    r.first_name ? `${r.first_name} ${r.last_name || ''}`.trim() : r.name;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Marketing Leads</h2>
        <p className="text-sm text-muted-foreground">{leads.length} listings</p>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Listings ranked by website staleness and missing contact info — best targets for selling website upgrades.
      </p>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4 items-center">
        <Select value={island} onValueChange={setIsland}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Islands</SelectItem>
            {ISLANDS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(minScore)} onValueChange={v => setMinScore(Number(v))}>
          <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Score ≥ 30 (all)</SelectItem>
            <SelectItem value="50">Score ≥ 50 (warm)</SelectItem>
            <SelectItem value="65">Score ≥ 65 (hot)</SelectItem>
            <SelectItem value="80">Score ≥ 80 (top)</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
          <input type="checkbox" checked={noWebsiteOnly}
            onChange={e => setNoWebsiteOnly(e.target.checked)} className="w-3.5 h-3.5" />
          No website only
        </label>
        <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Hot (75+)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Warm (50–74)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Cool (&lt;50)</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : leads.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No leads found. Run script 22 with <code>--score-leads --apply</code> to populate scores.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2 pr-3 font-medium">Name</th>
                <th className="text-left py-2 pr-3 font-medium">Island / City</th>
                <th className="text-left py-2 pr-3 font-medium">Platform</th>
                <th className="text-center py-2 pr-3 font-medium">Site Score</th>
                <th className="text-center py-2 pr-3 font-medium">Lead Score</th>
                <th className="text-left py-2 pr-3 font-medium">Contact</th>
                <th className="text-left py-2 font-medium">Website</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map(r => (
                <tr key={`${r._table}-${r.id}`} className="hover:bg-muted/30 group">
                  <td className="py-2 pr-3">
                    <div className="font-medium leading-tight">{displayName(r)}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {r._table === 'practitioners' ? 'practitioner' : 'center'}
                      {r.no_website_lead && (
                        <span className="ml-1.5 text-red-600 font-semibold">· no website</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    <div>{ISLANDS.find(i => i.value === r.island)?.label ?? r.island}</div>
                    <div className="text-muted-foreground">{r.city}</div>
                  </td>
                  <td className="py-2 pr-3">
                    {r.website_platform ? (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${platformBadgeColor(r.website_platform)}`}>
                        {r.website_platform}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={`py-2 pr-3 text-center text-sm ${scoreColor(r.website_score)}`}>
                    {r.website_score ?? '—'}
                  </td>
                  <td className={`py-2 pr-3 text-center text-sm font-bold ${scoreColor(r.lead_score)}`}>
                    {r.lead_score ?? '—'}
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {r.email ? (
                      <a href={`mailto:${r.email}`}
                        className="text-blue-600 hover:underline truncate block max-w-[160px]">
                        {r.email}
                      </a>
                    ) : (
                      <span className="text-red-500 text-xs">no email</span>
                    )}
                    {r.phone && (
                      <div className="text-muted-foreground">{r.phone}</div>
                    )}
                  </td>
                  <td className="py-2 text-xs">
                    {r.website_url ? (
                      <a href={r.website_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate max-w-[140px]">
                          {r.website_url.replace(/^https?:\/\/(www\.)?/, '')}
                        </span>
                      </a>
                    ) : (
                      <span className="text-red-500">no website</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Admin Queue Tab ──────────────────────────────────────────────────────────

function AdminQueue() {
  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-3 text-amber-900">Near-Miss Review Queue</h3>
          <p className="text-sm text-amber-800 mb-4">
            Near-miss review records are practitioners or wellness centers that score <strong>70–84% name similarity</strong> to existing database records during the deduplication step. They need manual review to decide:
          </p>
          <ul className="list-disc list-inside text-sm text-amber-800 space-y-1 ml-2">
            <li><strong>Accept as New</strong> — the match score is misleading; insert as a new record</li>
            <li><strong>Merge with Existing</strong> — confirm it's a duplicate and manually merge the data</li>
            <li><strong>Discard</strong> — it's spam or irrelevant; skip it</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3">How to Access Review Records</h4>
          <p className="text-sm text-gray-600 mb-4">
            Near-miss records are generated by the pipeline deduplication script and stored in <code className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">pipeline/output/gm_review.jsonl</code>. A future enhancement will load these directly into this admin panel. For now, use the workflow below:
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <h5 className="text-sm font-medium">1. Run the pipeline dedup script</h5>
              <div className="bg-gray-800 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                <pre>cd pipeline
python scripts/12_gm_dedup.py --island big_island</pre>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-sm font-medium">2. Preview the review queue (first 50 records)</h5>
              <div className="bg-gray-800 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                <pre>cd pipeline
{`jq '. | {"name", "_review_reason", "_possible_match_name"}' \\
  output/gm_review.jsonl | head -50`}</pre>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-sm font-medium">3. View full record details</h5>
              <div className="bg-gray-800 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                <pre>cd pipeline
jq '.' output/gm_review.jsonl | less</pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-2 text-blue-900">Future Enhancement</h4>
          <p className="text-sm text-blue-800">
            A future release will automatically import near-miss records into a Supabase <code className="font-mono bg-blue-100 px-1 rounded text-xs">pipeline_review_queue</code> table, and this tab will show an interactive review interface with accept/merge/discard buttons for each record.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminPanel;
