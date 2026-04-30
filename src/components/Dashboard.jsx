import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import Calendar from './Calendar'
import Goals from './Goals'
import CompStats from './CompStats'

const Home = lazy(() => import('./Home'))
const Training = lazy(() => import('./Training'))
import Performance from './Performance'
import Chat from './Chat'
import Microcycles from './Microcycles'
import Backoffice from './Backoffice'
import HcpWagr from './HcpWagr'
import {
  getProfile,
  saveProfile as saveProfileSvc,
  uploadAvatar as uploadAvatarSvc,
  getTeamActivity,
  getProfilesByIds,
  getAvatarPublicUrl,
  changePassword as changePasswordSvc,
  signOut as signOutSvc,
} from '../services/profileService'
import {
  getMetrics,
  saveMetrics,
  getEntries,
  saveEntries as saveEntriesSvc,
  deleteEntries as deleteEntriesSvc,
} from '../services/dashboardService'
import { getEvents } from '../services/calendarService'
import { getTrainingPlans } from '../services/trainingService'

import { DEFAULT_METRICS } from '../constants/metrics'
import { COACH_ROLES } from '../constants/roles'

// All UI strings in both languages
const STRINGS = {
  en: {
    nav: ['home','Overview','performance','Performance','training','Plan','calendar','Calendar','competition','Competitions','chat','Chat / Team','backoffice','Admin'],
    registerBtn: '+ Register Performance',
    menu: {
      home: 'Home', editProfile: 'Edit Profile', team: 'Team', manageKpis: 'Edit Priorities',
      lightMode: 'Light Mode', darkMode: 'Dark Mode', exportExcel: 'Export Excel',
      language: 'Language', signOut: 'Sign Out',
    },
    register: {
      title: 'Register Performance', date: 'DATE', golf: 'GOLF', gym: 'GYM',
      notes: 'SESSION NOTES', notesPlaceholder: 'Observations, conditions, feelings...',
      save: 'Save Session', saving: 'Saving...',
    },
    profile: {
      title: 'Edit Profile', name: 'Name', role: 'Role', club: 'Club / Organisation',
      phone: 'Phone', email: 'EMAIL', cancel: 'Cancel', save: 'Save',
      roles: ['Athlete','Golf Coach','Putting Coach','Strength & Conditioning Coach','Parent','Federation'],
    },
    kpi: {
      title: 'EDIT PRIORITIES', unit: 'unit', target: 'target', add: '+ Add',
      nameHolder: 'KPI name', unitHolder: 'unit', targetHolder: 'target',
      golf: 'Golf', gym: 'Gym', saveBtn: 'Save KPIs to DB', saving: 'Saving...',
    },
    deleteModal: {
      title: 'Delete this entry?',
      body: (date) => `All data from ${date} will be permanently deleted. This action cannot be undone.`,
      cancel: 'Cancel', confirm: 'Delete',
    },
    chart: { chart: 'Chart', table: 'Table', evolution: 'EVOLUTION', target: 'Target: ', noData: 'No data — start logging to see progress' },
    table: { date: 'DATE', notes: 'NOTES', empty: 'No entries yet. Use the Register Performance button to start.' },
    ai: {
      desc: 'Claude analyses all registered data and returns an assessment of progression, trends and concrete recommendations.',
      btn: 'Analyse Data', loading: 'Analysing...',
    },
    loading: 'Loading...',
    saved: 'Saved ✓',
    kpiSaved: 'KPIs saved ✓',
    kpiError: 'Error: ',
    langModal: { title: 'Language', cancel: 'Cancel' },
  },
  pt: {
    nav: ['home','Overview','performance','Performance','training','Plan','calendar','Calendário','competition','Competições','chat','Chat / Team','backoffice','Admin'],
    registerBtn: '+ Registar Performance',
    menu: {
      home: 'Início', editProfile: 'Editar Perfil', team: 'Equipa', manageKpis: 'Editar Prioridades',
      lightMode: 'Modo Claro', darkMode: 'Modo Escuro', exportExcel: 'Exportar Excel',
      language: 'Idioma', signOut: 'Terminar Sessão',
    },
    register: {
      title: 'Registar Performance', date: 'DATA', golf: 'GOLFE', gym: 'GINÁSIO',
      notes: 'NOTAS DA SESSÃO', notesPlaceholder: 'Observações, condições, sensações...',
      save: 'Guardar Sessão', saving: 'A guardar...',
    },
    profile: {
      title: 'Editar Perfil', name: 'Nome', role: 'Função', club: 'Clube / Organização',
      phone: 'Telemóvel', email: 'EMAIL', cancel: 'Cancelar', save: 'Guardar',
      roles: ['Atleta','Treinador de Golfe','Treinador de Putting','Preparador Físico','Pai/Mãe','Federação'],
    },
    kpi: {
      title: 'EDITAR PRIORIDADES', unit: 'unidade', target: 'obj.', add: '+ Adicionar',
      nameHolder: 'Nome do KPI', unitHolder: 'unid.', targetHolder: 'obj.',
      golf: 'Golfe', gym: 'Ginásio', saveBtn: 'Guardar KPIs na BD', saving: 'A guardar...',
    },
    deleteModal: {
      title: 'Apagar este registo?',
      body: (date) => `Todos os dados de ${date} serão apagados permanentemente. Esta acção não pode ser desfeita.`,
      cancel: 'Cancelar', confirm: 'Apagar',
    },
    chart: { chart: 'Gráfico', table: 'Tabela', evolution: 'EVOLUÇÃO', target: 'Objectivo: ', noData: 'Sem dados — regista a primeira sessão para ver a evolução' },
    table: { date: 'DATA', notes: 'NOTAS', empty: 'Sem registos. Usa o botão "Registar Performance" para começar.' },
    ai: {
      desc: 'O Claude analisa todos os dados registados e devolve uma avaliação da progressão, tendências e recomendações concretas para os próximos treinos.',
      btn: 'Analisar Dados', loading: 'A analisar...',
    },
    loading: 'A carregar...',
    saved: 'Guardado ✓',
    kpiSaved: 'KPIs guardados ✓',
    kpiError: 'Erro: ',
    langModal: { title: 'Idioma', cancel: 'Cancelar' },
  },
}

const dark = {
  bg: '#080808', surface: '#0d0d0d', border: '#282828',
  accent: '#52E8A0', accentLight: '#ffffff', accentBg: '#0d1a12',
  text: '#ffffff', textMuted: '#888888', textFaint: '#444444',
  success: '#52E8A0', successBg: '#0a1a0a', danger: '#f87171', dangerBg: '#1a0808',
  navActive: '#0d0d0d',
  navBg: '#1a2744', navText: '#8aaed4', navTextActive: '#ffffff', navBorder: '#52E8A0',
}
const light = {
  bg: '#f0f4ff', surface: '#ffffff', border: '#d0d8f0',
  accent: '#378ADD', accentLight: '#0c447c', accentBg: '#e6f1fb',
  text: '#0f1e3d', textMuted: '#4a6ab5', textFaint: '#8aa0c8',
  success: '#52E8A0', successBg: '#e8fdf4', danger: '#dc2626', dangerBg: '#fef2f2',
  navActive: '#e6f1fb',
  navBg: '#1a2744', navText: '#8aaed4', navTextActive: '#ffffff', navBorder: '#52E8A0',
}

function TeamModal({ t, F, onClose }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const { msgs, entries, plans } = await getTeamActivity()

        const map = {}
        ;(msgs || []).forEach(r => {
          if (r.user_email && !map[r.user_email]) map[r.user_email] = { email: r.user_email, name: r.user_name || r.user_email.split('@')[0], userId: r.user_id || null }
        })
        ;(entries || []).forEach(r => {
          if (r.updated_by && !map[r.updated_by]) map[r.updated_by] = { email: r.updated_by, name: r.updated_by.split('@')[0], userId: null }
        })
        ;(plans || []).forEach(r => {
          if (r.created_by && !map[r.created_by]) map[r.created_by] = { email: r.created_by, name: r.created_by.split('@')[0], userId: null }
          if (r.updated_by && !map[r.updated_by]) map[r.updated_by] = { email: r.updated_by, name: r.updated_by.split('@')[0], userId: null }
        })

        const userIds = Object.values(map).map(m => m.userId).filter(Boolean)
        const profilesByUserId = {}
        if (userIds.length > 0) {
          const profs = await getProfilesByIds(userIds)
          ;(profs || []).forEach(p => { profilesByUserId[p.id] = p })
        }

        setMembers(Object.values(map).map(m => {
          const prof = m.userId ? profilesByUserId[m.userId] : null
          if (prof) return { ...m, name: prof.name || m.name, role: prof.role || null, phone: prof.phone || null, club: prof.athlete_club || null }
          return m
        }))
      } catch (err) {
        setError(err.message || 'Erro ao carregar a equipa.')
      } finally {
        setLoading(false)
      }
    }
    fetchTeam()
  }, [])

  const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)

  const bodyContent = () => {
    if (loading) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: t.border, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ height: '13px', borderRadius: '6px', background: t.border, width: '55%' }} />
              <div style={{ height: '11px', borderRadius: '6px', background: t.border, width: '75%' }} />
            </div>
            <div style={{ width: '60px', height: '22px', borderRadius: '10px', background: t.border }} />
          </div>
        ))}
      </div>
    )
    if (error) return (
      <div style={{ textAlign: 'center', padding: '30px 20px' }}>
        <div style={{ fontSize: '28px', marginBottom: '10px' }}>⚠️</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: t.danger, marginBottom: '6px' }}>Erro ao carregar</div>
        <div style={{ fontSize: '12px', color: t.textMuted, lineHeight: 1.5 }}>{error}</div>
        <button onClick={onClose} style={{ marginTop: '18px', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '8px', color: t.textMuted, padding: '7px 18px', cursor: 'pointer', fontSize: '12px', fontFamily: F }}>Fechar</button>
      </div>
    )
    if (members.length === 0) return (
      <div style={{ textAlign: 'center', padding: '30px 20px' }}>
        <div style={{ fontSize: '28px', marginBottom: '10px' }}>👥</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: t.text, marginBottom: '6px' }}>Sem membros ainda</div>
        <div style={{ fontSize: '12px', color: t.textMuted, lineHeight: 1.5 }}>A equipa aparece aqui assim que existirem mensagens ou registos partilhados.</div>
      </div>
    )
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {members.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${t.accent}, #4ade80)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {initials(m.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: t.text }}>{m.name}</div>
              <div style={{ fontSize: '12px', color: t.textMuted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
              {m.phone && <div style={{ fontSize: '11px', color: t.textFaint, marginTop: '1px' }}>{m.phone}</div>}
            </div>
            <div style={{ fontSize: '10px', letterSpacing: '1px', color: t.accent, fontWeight: 600, background: t.accentBg, padding: '3px 10px', borderRadius: '10px', flexShrink: 0 }}>
              {m.role || 'Utilizador'}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px', fontFamily: F }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.accent, marginBottom: '3px', fontWeight: 600 }}>TEAM</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: t.text }}>Equipa</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
        </div>
        {bodyContent()}
      </div>
    </div>
  )
}

function SparkChart({ data, metricId, unit, target, theme, noDataText, targetLabel }) {
  const canvasRef = useRef(null)
  const t = theme === 'dark' ? dark : light
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = rect.width, H = rect.height
    ctx.clearRect(0, 0, W, H)
    const pts = data.filter(d => d.metric_id === metricId && d.value && !isNaN(parseFloat(d.value)) && d.entry_date)
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    if (!pts.length) {
      ctx.fillStyle = t.textMuted; ctx.font = '13px Inter,system-ui'; ctx.textAlign = 'center'
      ctx.fillText(noDataText, W / 2, H / 2); return
    }
    const vals = pts.map(d => parseFloat(d.value))
    const allVals = target ? [...vals, target] : vals
    const minV = Math.min(...allVals) * 0.97, maxV = Math.max(...allVals) * 1.03
    const range = maxV - minV || 1
    const pad = { t: 28, r: 20, b: 48, l: 56 }
    const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b
    const xOf = i => pad.l + (pts.length > 1 ? (i / (pts.length - 1)) * cw : cw / 2)
    const yOf = v => pad.t + ch - ((v - minV) / range) * ch
    for (let i = 0; i <= 4; i++) {
      const v = minV + (range * i / 4), y = yOf(v)
      ctx.strokeStyle = t.border; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke()
      ctx.fillStyle = t.textMuted; ctx.font = '10px Inter,system-ui'; ctx.textAlign = 'right'
      ctx.fillText(v.toFixed(1) + (unit || ''), pad.l - 6, y + 4)
    }
    if (target) {
      const y = yOf(target)
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4])
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#4ade80'; ctx.font = 'bold 10px Inter,system-ui'; ctx.textAlign = 'left'
      ctx.fillText(targetLabel + target + (unit || ''), pad.l + 4, y - 5)
    }
    pts.forEach((d, i) => {
      const x = xOf(i)
      const lbl = new Date(d.entry_date + 'T12:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
      ctx.fillStyle = t.textMuted; ctx.font = '10px Inter,system-ui'; ctx.textAlign = 'center'
      ctx.fillText(lbl, x, pad.t + ch + 18)
    })
    ctx.beginPath()
    pts.forEach((d, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(parseFloat(d.value))) : ctx.lineTo(xOf(i), yOf(parseFloat(d.value))) })
    ctx.lineTo(xOf(pts.length - 1), pad.t + ch); ctx.lineTo(xOf(0), pad.t + ch); ctx.closePath()
    ctx.fillStyle = 'rgba(61,107,255,0.08)'; ctx.fill()
    ctx.beginPath()
    pts.forEach((d, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(parseFloat(d.value))) : ctx.lineTo(xOf(i), yOf(parseFloat(d.value))) })
    ctx.strokeStyle = t.accent; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke()
    pts.forEach((d, i) => {
      const x = xOf(i), y = yOf(parseFloat(d.value))
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = t.accent; ctx.fill()
      ctx.fillStyle = t.accentLight; ctx.font = 'bold 10px Inter,system-ui'; ctx.textAlign = 'center'
      ctx.fillText(d.value + (unit || ''), x, y - 10)
    })
  }, [data, metricId, theme, unit, target, noDataText, targetLabel])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '220px', display: 'block' }} />
}

export default function Dashboard({ user }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('fs_theme') || 'light')
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en')
  const [showLangModal, setShowLangModal] = useState(false)
  const s = STRINGS[lang]
  const t = theme === 'dark' ? dark : light
  const [view, setView] = useState('home')
  const [trainingFocusDate, setTrainingFocusDate] = useState(null)
  const [calendarFocusDate, setCalendarFocusDate] = useState(null)
  const [calendarInitSchedule, setCalendarInitSchedule] = useState(null)
  const clearCalendarInitSchedule = useCallback(() => setCalendarInitSchedule(null), [])
  const [entries, setEntries] = useState([])
  const [metrics, setMetrics] = useState(DEFAULT_METRICS)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], values: {}, notes: '' })
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [chartMetric, setChartMetric] = useState('swing_speed')
  const [chartView, setChartView] = useState('chart')
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showTeam, setShowTeam] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [showKpis, setShowKpis] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [perfTab, setPerfTab] = useState('focus')
  const [newMetric, setNewMetric] = useState({ label: '', unit: '', category: 'golfe', target: '' })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [profile, setProfile] = useState({ name: '', role: s.profile.roles[0], club: '', phone: '' })
  const [profileForm, setProfileForm] = useState({ ...profile })
  const [savingKpis, setSavingKpis] = useState(false)
  const [avatar, setAvatar] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const avatarInputRef = useRef(null)
  const [kpiMsg, setKpiMsg] = useState('')
  const [registerError, setRegisterError] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ newPw: '', confirmPw: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const menuRef = useRef(null)

  const changeLang = (l) => { setLang(l); localStorage.setItem('app_lang', l); setShowLangModal(false); setShowMenu(false) }

  useEffect(() => {
    if (!user?.id) return
    getProfile(user.id)
      .then(data => {
        const base = { name: user.email.split('@')[0], role: 'athlete', club: '', phone: '' }
        const p = data ? { name: data.name || base.name, role: data.role || base.role, club: data.athlete_club || base.club, phone: data.phone || base.phone } : base
        setProfile(p); setProfileForm(p)
        if (data?.avatar_url) {
          setAvatar(data.avatar_url + '?t=' + Date.now())
        }
      })
      .catch(() => {})
  }, [user])

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    window.history.replaceState({ appView: 'home' }, '')
    const handlePop = (e) => {
      if (e.state?.appView) setView(e.state.appView)
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const navigateToView = useCallback((v, opts) => {
    if (opts?.date) setTrainingFocusDate(opts.date)
    if (opts?.date && v === 'calendar') setCalendarFocusDate(opts.date)
    if (opts?.scheduleType) setCalendarInitSchedule(opts.scheduleType)
    setView(v)
    window.history.pushState({ appView: v }, '')
  }, [])

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await getMetrics()
      if (data && data.length > 0) {
        setMetrics(data.map(m => ({
          id: m.metric_id, label: m.label, unit: m.unit || '',
          category: m.category || 'golfe', target: m.target ? parseFloat(m.target) : null,
          db_id: m.id, sort_order: m.sort_order,
        })))
      }
    } catch (_) {}
  }, [])

  const saveKpis = async () => {
    setSavingKpis(true)
    try {
      const metricsData = metrics.map((m, i) => ({
        metric_id: m.id, label: m.label, unit: m.unit || '',
        category: m.category || 'golfe', target: m.target || null,
        sort_order: i, created_by: user.email,
      }))
      await saveMetrics(metricsData)
      setKpiMsg(s.kpiSaved); setTimeout(() => setKpiMsg(''), 3000)
    } catch (e) {
      setKpiMsg(s.kpiError + (e.message || '')); setTimeout(() => setKpiMsg(''), 4000)
    }
    setSavingKpis(false)
  }

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getEntries()
      setEntries(data || [])
    } catch (_) { setEntries([]) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchMetrics(); fetchEntries() }, [fetchMetrics, fetchEntries])

  const [events, setEvents] = useState([])
  const [trainingPlans, setTrainingPlans] = useState([])
  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents()
      setEvents(data || [])
    } catch (_) { setEvents([]) }
  }, [])
  const fetchTrainingPlans = useCallback(async () => {
    try {
      const data = await getTrainingPlans()
      setTrainingPlans(data || [])
    } catch (_) { setTrainingPlans([]) }
  }, [])
  useEffect(() => { fetchEvents(); fetchTrainingPlans() }, [fetchEvents, fetchTrainingPlans])

  useEffect(() => {
    const publicUrl = getAvatarPublicUrl(user.id)
    if (publicUrl) {
      const img = new Image()
      img.onload = () => setAvatar(publicUrl + '?t=' + Date.now())
      img.src = publicUrl
    }
  }, [user.id])

  const uploadAvatar = async (file) => {
    if (!file) return
    setAvatarError('')
    if (!file.type.startsWith('image/')) {
      setAvatarError(lang === 'pt' ? 'Ficheiro inválido. Selecciona uma imagem.' : 'Invalid file. Please select an image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(lang === 'pt' ? 'Ficheiro demasiado grande. Máximo 5 MB.' : 'File too large. Maximum 5 MB.')
      return
    }
    setUploadingAvatar(true)
    try {
      const url = await uploadAvatarSvc(user.id, file)
      setAvatar(url + '?t=' + Date.now())
    } catch (err) {
      setAvatarError((lang === 'pt' ? 'Erro ao carregar: ' : 'Upload error: ') + err.message)
    }
    setUploadingAvatar(false)
  }

  const saveEntry = async () => {
    setSaving(true)
    const rows = Object.entries(form.values)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([metric_id, value]) => ({ metric_id, value: String(value), entry_date: form.date, updated_by: user.email, updated_at: new Date().toISOString() }))
    if (form.notes) rows.push({ metric_id: '__notes__', value: form.notes, entry_date: form.date, updated_by: user.email, updated_at: new Date().toISOString() })
    if (!rows.length) { setSaving(false); return }
    try {
      await saveEntriesSvc(rows)
      setSavedMsg(s.saved); setTimeout(() => setSavedMsg(''), 3000)
      setForm(p => ({ ...p, values: {}, notes: '' }))
      setShowRegister(false)
      fetchEntries()
    } catch (err) { setRegisterError('Erro ao guardar: ' + err.message) }
    setSaving(false)
  }

  const doDelete = async (date) => {
    const ids = metrics.map(m => dateMap[date]?.[m.id]?.id).filter(Boolean)
    const noteEntry = entries.find(e => e.entry_date === date && e.metric_id === '__notes__')
    if (noteEntry) ids.push(noteEntry.id)
    await deleteEntriesSvc(ids)
    setDeleteConfirm(null); fetchEntries()
  }

  const saveProfile = async () => {
    setProfileSaving(true); setProfileError('')
    try {
      await saveProfileSvc(user.id, { name: profileForm.name, role: profileForm.role, phone: profileForm.phone, athlete_club: profileForm.club })
      setProfile({ ...profileForm, email: user.email })
      setShowProfile(false)
    } catch (err) { setProfileError('Erro: ' + err.message) }
    setProfileSaving(false)
  }

  const changePassword = async () => {
    if (pwForm.newPw.length < 6) { setPwMsg(lang === 'pt' ? 'Mínimo 6 caracteres.' : 'Minimum 6 characters.'); return }
    if (pwForm.newPw !== pwForm.confirmPw) { setPwMsg(lang === 'pt' ? 'As passwords não coincidem.' : 'Passwords do not match.'); return }
    setPwSaving(true); setPwMsg('')
    try {
      await changePasswordSvc(pwForm.newPw)
      setPwMsg(lang === 'pt' ? 'Password alterada ✓' : 'Password updated ✓')
      setPwForm({ newPw: '', confirmPw: '' })
    } catch (err) { setPwMsg((lang === 'pt' ? 'Erro: ' : 'Error: ') + err.message) }
    setPwSaving(false)
    setTimeout(() => setPwMsg(''), 4000)
  }

  const exportXLS = () => {
    const rows = [['Date', 'Notes', ...metrics.map(m => m.label + (m.unit ? ` (${m.unit})` : ''))]]
    const byDate = {}
    entries.forEach(e => { if (!e.entry_date) return; if (!byDate[e.entry_date]) byDate[e.entry_date] = {}; byDate[e.entry_date][e.metric_id] = e.value })
    Object.entries(byDate).sort().forEach(([date, vals]) => rows.push([date, vals['__notes__'] || '', ...metrics.map(m => vals[m.id] || '')]))
    const blob = new Blob(['\uFEFF' + rows.map(r => r.join('\t')).join('\n')], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'francisca_tracker.xls'; a.click()
  }

  const getAiAnalysis = async () => {
    setAiLoading(true); setAiAnalysis('')
    const allData = metrics.map(m => {
      const vals = entries.filter(e => e.metric_id === m.id && e.value && e.entry_date).map(e => `${e.entry_date}: ${e.value}${m.unit}`)
      return vals.length ? `${m.label}: ${vals.join(', ')}` : null
    }).filter(Boolean).join('\n')
    const prompt = `Analisa os dados de performance de Francisca Salgado, jogadora de golfe com objectivo de aumentar a velocidade de drive de 80 para 95 mph.\n\nDados:\n${allData || 'Sem dados ainda.'}\n\nFaz uma análise em português de Portugal:\n1. Evolução e tendências\n2. Pontos positivos\n3. Áreas a melhorar\n4. Recomendações concretas\n\nSê directo e técnico. Máximo 300 palavras.`
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      const json = await res.json()
      setAiAnalysis(json.text || json.error || 'No response.')
    } catch { setAiAnalysis('Error contacting AI.') }
    setAiLoading(false)
  }

  const dateMap = {}
  entries.forEach(e => { if (!e.entry_date) return; if (!dateMap[e.entry_date]) dateMap[e.entry_date] = {}; dateMap[e.entry_date][e.metric_id] = { value: e.value, id: e.id } })
  const sortedDates = Object.keys(dateMap).sort().reverse()

  const F = "'Inter', system-ui, -apple-system, sans-serif"
  const btn = (active, danger) => ({
    background: danger ? 'transparent' : active ? t.accent : 'transparent',
    border: `1px solid ${danger ? t.danger : active ? t.accent : t.border}`,
    borderRadius: '6px', color: danger ? t.danger : active ? '#fff' : t.textMuted,
    padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontFamily: F, fontWeight: 500, transition: 'all 0.15s'
  })
  const card = { background: t.surface, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '14px 16px' }
  const inp = { background: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.text, padding: '7px 10px', fontSize: '13px', fontFamily: F, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const isAdmin = COACH_ROLES.includes(profile.role)
  const displayName = profile.name || user.email.split('@')[0]
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  // Build nav from flat array pairs
  const navItems = []
  for (let i = 0; i < s.nav.length; i += 2) {
    const key = s.nav[i]
    if (key === 'backoffice' && !isAdmin) continue
    navItems.push([key, s.nav[i + 1]])
  }

  const SIDEBAR_NAV = [
    ['home',        lang === 'pt' ? 'Overview'       : 'Overview',      '▦'],
    ['calendar',    lang === 'pt' ? 'Calendário'     : 'Calendar',      '▦'],
    ['training',    lang === 'pt' ? 'Plano de Treino': 'Training Plan',  '▦'],
    ['performance', 'Track Progress',                                    '▦'],
    ['competition', lang === 'pt' ? 'Competições'    : 'Competitions',  '▦'],
    ...(isAdmin ? [['backoffice', lang === 'pt' ? 'Atletas' : 'Athletes', '▦']] : []),
    ['chat',        lang === 'pt' ? 'Mensagens'      : 'Messages',      '▦'],
  ]

  return (
    <div style={{ fontFamily: F, background: t.bg, minHeight: '100vh', color: t.text, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        input:focus, select:focus, textarea:focus { border-color: ${t.accent} !important; outline: none; }
        .menu-item { display: block; width: 100%; background: transparent; border: none; color: #aaa; padding: 12px 16px; cursor: pointer; font-size: 12px; font-family: ${F}; text-align: left; letter-spacing: 0.5px; transition: all 0.1s; }
        .menu-item:hover { background: ${t.navActive}; color: ${t.text}; }
        .menu-item.danger { color: ${t.danger}; }
        .snav-btn { display:flex; align-items:center; gap:12px; width:100%; background:transparent; border:none; border-left:3px solid transparent; padding:12px 20px; cursor:pointer; font-family:${F}; font-size:14px; font-weight:600; color:${t.textMuted}; text-align:left; transition:all 0.12s; }
        .snav-btn:hover:not(.snav-active) { background:${t.bg}; color:${t.text}; }
        .snav-active { color:#ef4444 !important; border-left-color:#ef4444 !important; background:${theme==='dark'?'rgba(239,68,68,0.08)':'#fef2f2'} !important; font-weight:700 !important; }
        @media(max-width:720px) { .g2 { grid-template-columns: 1fr; } }
        @media(max-width:768px) { .db-sidebar { display:none !important; } }
      `}</style>

      {/* Language modal */}
      {showLangModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px 32px', maxWidth: '320px', width: '90%' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', color: t.text }}>{s.langModal.title}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[['en', '🇬🇧  English'], ['pt', '🇵🇹  Português']].map(([code, label]) => (
                <button key={code} onClick={() => changeLang(code)}
                  style={{ background: lang === code ? t.accent : 'transparent', border: `1px solid ${lang === code ? t.accent : t.border}`, borderRadius: '8px', color: lang === code ? '#fff' : t.text, padding: '12px 16px', cursor: 'pointer', fontFamily: F, fontSize: '14px', fontWeight: lang === code ? 600 : 400, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {label} {lang === code && <span style={{ marginLeft: 'auto', fontSize: '12px' }}>✓</span>}
                </button>
              ))}
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowLangModal(false)} style={btn(false)}>{s.langModal.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px 32px', maxWidth: '380px', width: '90%' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: t.text }}>{s.deleteModal.title}</div>
            <div style={{ fontSize: '13px', color: t.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>
              {lang === 'pt'
                ? <>Todos os dados de <b style={{ color: t.text }}>{new Date(deleteConfirm + 'T12:00:00').toLocaleDateString('pt-PT')}</b> serão apagados permanentemente. Esta acção não pode ser desfeita.</>
                : <>All data from <b style={{ color: t.text }}>{new Date(deleteConfirm + 'T12:00:00').toLocaleDateString('pt-PT')}</b> will be permanently deleted. This action cannot be undone.</>
              }
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={btn(false)}>{s.deleteModal.cancel}</button>
              <button onClick={() => doDelete(deleteConfirm)}
                style={{ background: t.danger, border: 'none', borderRadius: '6px', color: t.text, padding: '8px 20px', fontFamily: F, fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                {s.deleteModal.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register modal */}
      {showRegister && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{s.register.title}</div>
              <button onClick={() => setShowRegister(false)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '20px', padding: '2px 8px' }}>×</button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>{s.register.date}</div>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ ...inp, width: 'auto' }} />
            </div>
            <div className="g2">
              {['golfe', 'ginasio'].map(cat => (
                <div key={cat}>
                  <div style={{ fontSize: '9px', letterSpacing: '3px', color: t.textMuted, marginBottom: '10px', borderBottom: `1px solid ${t.border}`, paddingBottom: '8px', fontWeight: 600 }}>{cat === 'golfe' ? s.register.golf : s.register.gym}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {metrics.filter(m => m.category === cat).map(metric => (
                      <div key={metric.id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
                        <span style={{ fontSize: '12px', color: t.textMuted, fontWeight: 500, flex: 1, marginRight: '8px' }}>
                          {metric.label}
                          {metric.unit ? <span style={{ color: t.textFaint, marginLeft: '4px', fontSize: '10px' }}>{metric.unit}</span> : ''}
                        </span>
                        <input type="number" step="0.01" placeholder="—" value={form.values[metric.id] || ''}
                          onChange={e => setForm(p => ({ ...p, values: { ...p.values, [metric.id]: e.target.value } }))}
                          style={{ width: '90px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', color: t.accentLight, padding: '5px 8px', fontSize: '15px', fontWeight: 700, fontFamily: F, outline: 'none', textAlign: 'right' }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '6px', fontWeight: 600 }}>{s.register.notes}</div>
              <textarea placeholder={s.register.notesPlaceholder} value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                style={{ ...inp, minHeight: '64px', resize: 'vertical' }} />
            </div>
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={saveEntry} disabled={saving}
                style={{ background: saving ? t.navActive : t.accent, border: 'none', borderRadius: '8px', color: saving ? t.textMuted : '#fff', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: F }}>
                {saving ? s.register.saving : s.register.save}
              </button>
              {savedMsg && <span style={{ fontSize: '13px', color: t.success, fontWeight: 600 }}>{savedMsg}</span>}
              {registerError && <span style={{ fontSize: '12px', color: t.danger, fontWeight: 600 }}>{registerError}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Profile modal */}
      {showProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{s.profile.title}</div>
              <button onClick={() => setShowProfile(false)} style={{ background: 'transparent', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: '20px', padding: '2px 8px' }}>×</button>
            </div>
            {/* Foto de perfil */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${t.border}` }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', background: '#243560', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#7eb8ff', flexShrink: 0 }}>
                {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (initials || '?')}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: t.text, marginBottom: '6px' }}>{displayName}</div>
                <button onClick={() => { setAvatarError(''); avatarInputRef.current?.click() }} disabled={uploadingAvatar}
                  style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '6px', color: t.textMuted, padding: '5px 12px', fontSize: '11px', cursor: 'pointer', fontFamily: F }}>
                  {uploadingAvatar ? 'A carregar...' : 'Alterar foto'}
                </button>
                {avatarError && (
                  <div style={{ fontSize: '11px', color: t.danger, marginTop: '4px' }}>{avatarError}</div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[['name', s.profile.name], ['role', s.profile.role], ['club', s.profile.club], ['phone', s.profile.phone]].map(([k, l]) => (
                <div key={k}>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '5px', fontWeight: 600 }}>{l.toUpperCase()}</div>
                  {k === 'role' ? (
                    <select value={profileForm[k]} onChange={e => setProfileForm(p => ({ ...p, [k]: e.target.value }))} style={{ ...inp }}>
                      {s.profile.roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <input value={profileForm[k] || ''} onChange={e => setProfileForm(p => ({ ...p, [k]: e.target.value }))} placeholder={l} style={inp} />
                  )}
                </div>
              ))}
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '5px', fontWeight: 600 }}>{s.profile.email}</div>
                <input value={user.email} disabled style={{ ...inp, opacity: 0.5 }} />
              </div>
            </div>

            {/* Change Password */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${t.border}` }}>
              <div style={{ fontSize: '9px', letterSpacing: '2px', color: t.textMuted, marginBottom: '10px', fontWeight: 600 }}>
                {lang === 'pt' ? 'ALTERAR PASSWORD' : 'CHANGE PASSWORD'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                  placeholder={lang === 'pt' ? 'Nova password (mín. 6 caracteres)' : 'New password (min. 6 chars)'}
                  style={inp} />
                {pwForm.newPw.length > 0 && (
                  <input type="password" value={pwForm.confirmPw} onChange={e => setPwForm(p => ({ ...p, confirmPw: e.target.value }))}
                    placeholder={lang === 'pt' ? 'Confirmar nova password' : 'Confirm new password'}
                    style={inp} />
                )}
                {pwForm.newPw.length >= 6 && (
                  <button onClick={changePassword} disabled={pwSaving}
                    style={{ background: pwSaving ? t.navActive : t.surface, border: `1px solid ${t.border}`, borderRadius: '6px', color: pwSaving ? t.textMuted : t.text, padding: '7px 14px', fontFamily: F, fontWeight: 600, fontSize: '12px', cursor: pwSaving ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}>
                    {pwSaving ? (lang === 'pt' ? 'A guardar...' : 'Saving...') : (lang === 'pt' ? 'Alterar Password' : 'Update Password')}
                  </button>
                )}
                {pwMsg && (
                  <div style={{ fontSize: '12px', fontWeight: 600, color: pwMsg.includes('✓') ? t.success : t.danger }}>{pwMsg}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowProfile(false); setProfileError('') }} style={btn(false)}>{s.profile.cancel}</button>
              <button onClick={saveProfile} disabled={profileSaving} style={{ background: t.accent, border: 'none', borderRadius: '6px', color: t.text, padding: '8px 20px', fontFamily: F, fontWeight: 600, fontSize: '13px', cursor: profileSaving ? 'not-allowed' : 'pointer', opacity: profileSaving ? 0.7 : 1 }}>{profileSaving ? (lang==='pt' ? 'A guardar...' : 'Saving...') : s.profile.save}</button>
            </div>
            {profileError && <div style={{ marginTop: '10px', fontSize: '12px', color: t.danger, fontWeight: 600, textAlign: 'right' }}>{profileError}</div>}
          </div>
        </div>
      )}

      {/* ── TOP HEADER ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', height:'64px', background:t.surface, borderBottom:`1px solid ${t.border}`, flexShrink:0, zIndex:10 }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:'#ef4444', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', color:'#fff', flexShrink:0 }}>⛳</div>
          <div>
            <div style={{ fontSize:'12px', fontWeight:900, color:t.text, lineHeight:1.15, letterSpacing:'0.3px', textTransform:'uppercase' }}>Performance Golf</div>
            <div style={{ fontSize:'11px', fontWeight:600, color:t.textMuted, lineHeight:1.1 }}>Francisca Salgado</div>
          </div>
        </div>
        {/* Right: avatar + menu */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => uploadAvatar(e.target.files[0])} />
          <div ref={menuRef} style={{ position:'relative' }}>
            <button onClick={() => setShowMenu(!showMenu)}
              style={{ display:'flex', alignItems:'center', gap:'10px', background:'transparent', border:`1px solid ${t.border}`, borderRadius:'10px', cursor:'pointer', padding:'6px 12px' }}>
              <div style={{ width:'32px', height:'32px', borderRadius:'50%', overflow:'hidden', background:'#1a2744', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:'#7eb8ff', flexShrink:0 }}>
                {avatar ? <img src={avatar} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : (initials || '?')}
              </div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:t.text, lineHeight:1.2 }}>{displayName}</div>
                <div style={{ fontSize:'11px', color:t.textMuted, lineHeight:1.2 }}>{profile.role || s.profile.roles[0]}</div>
              </div>
              <span style={{ color:t.textMuted, fontSize:'10px' }}>▾</span>
            </button>
            {showTeam && <TeamModal t={t} F={F} onClose={() => setShowTeam(false)} />}
            {showMenu && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:t.surface, border:`1px solid ${t.border}`, borderRadius:'12px', minWidth:'200px', zIndex:100, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.3)' }}>
                <div style={{ padding:'12px 16px', borderBottom:`1px solid ${t.border}` }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:t.text }}>{displayName}</div>
                  <div style={{ fontSize:'11px', color:t.textMuted, marginTop:'2px' }}>{profile.role || s.profile.roles[0]}</div>
                </div>
                {[
                  { label: s.menu.editProfile, action: () => { setProfileForm({...profile}); setPwForm({ newPw:'', confirmPw:'' }); setPwMsg(''); setShowProfile(true); setShowMenu(false) } },
                  { label: s.menu.team, action: () => { setShowTeam(true); setShowMenu(false) } },
                  { label: theme === 'dark' ? s.menu.lightMode : s.menu.darkMode, action: () => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); localStorage.setItem('fs_theme', next); setShowMenu(false) } },
                  { label: s.menu.exportExcel, action: () => { exportXLS(); setShowMenu(false) } },
                  { label: `${s.menu.language}: ${lang === 'en' ? '🇬🇧 EN' : '🇵🇹 PT'}`, action: () => { setShowLangModal(true); setShowMenu(false) } },
                  { label: s.menu.signOut, action: () => signOutSvc(), danger: true },
                ].map((item, i) => (
                  <button key={i} className={`menu-item${item.danger ? ' danger' : ''}`} onClick={item.action}
                    style={{ borderTop: i > 0 ? `1px solid ${t.border}` : 'none' }}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY: sidebar + content ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>

        {/* SIDEBAR */}
        <div className="db-sidebar" style={{ width:'220px', background:t.surface, borderRight:`1px solid ${t.border}`, display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto' }}>
          <nav style={{ flex:1, paddingTop:'8px' }}>
            {SIDEBAR_NAV.map(([key, label]) => (
              <button key={key} className={`snav-btn${view === key ? ' snav-active' : ''}`}
                onClick={() => { navigateToView(key); if (key !== 'performance') setPerfTab('focus') }}>
                <span>{label}</span>
              </button>
            ))}
            {/* Record what I did */}
            <button className="snav-btn" onClick={() => setShowRegister(true)}>
              <span>{lang === 'pt' ? 'Registar Performance' : 'Record what I did'}</span>
            </button>
          </nav>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex:1, overflowY:'auto', background: theme === 'dark' ? t.bg : '#f0f4f8', display:'flex', flexDirection:'column' }}>
          {/* KPI Panel */}
          {showKpis && (
            <div style={{ padding:'16px 32px 0' }}>
              <div style={{ ...card, position:'relative' }}>
                <button onClick={() => setShowKpis(false)} style={{ position:'absolute', top:'10px', right:'12px', background:'transparent', border:'none', color:t.textMuted, cursor:'pointer', fontSize:'18px', lineHeight:1 }}>×</button>
                <div style={{ fontSize:'10px', letterSpacing:'3px', color:t.textMuted, marginBottom:'12px', fontWeight:600 }}>{s.kpi.title}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'12px' }}>
                  {metrics.map((m, i) => (
                    <div key={m.id} style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
                      <input value={m.label} onChange={e => setMetrics(p => p.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                        style={{ flex:2, minWidth:'120px', background:t.bg, border:`1px solid ${t.border}`, borderRadius:'6px', color:t.text, padding:'5px 8px', fontSize:'12px', fontFamily:F, outline:'none' }} />
                      <input value={m.unit} placeholder={s.kpi.unitHolder} onChange={e => setMetrics(p => p.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))}
                        style={{ width:'60px', background:t.bg, border:`1px solid ${t.border}`, borderRadius:'6px', color:t.text, padding:'5px 8px', fontSize:'12px', fontFamily:F, outline:'none' }} />
                      <input value={m.target || ''} placeholder={s.kpi.targetHolder} onChange={e => setMetrics(p => p.map((x, j) => j === i ? { ...x, target: e.target.value ? parseFloat(e.target.value) : null } : x))}
                        style={{ width:'64px', background:t.bg, border:`1px solid ${t.border}`, borderRadius:'6px', color:t.text, padding:'5px 8px', fontSize:'12px', fontFamily:F, outline:'none' }} />
                      <button onClick={() => setMetrics(p => p.filter((_, j) => j !== i))} style={{ background:'transparent', border:'none', color:t.danger, cursor:'pointer', fontSize:'16px', padding:'2px 8px' }}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', paddingTop:'10px', borderTop:`1px solid ${t.border}` }}>
                  <input placeholder={s.kpi.nameHolder} value={newMetric.label} onChange={e => setNewMetric(p => ({ ...p, label: e.target.value }))}
                    style={{ flex:2, minWidth:'120px', background:t.bg, border:`1px solid ${t.border}`, borderRadius:'6px', color:t.text, padding:'5px 8px', fontSize:'12px', fontFamily:F, outline:'none' }} />
                  <input placeholder={s.kpi.unitHolder} value={newMetric.unit} onChange={e => setNewMetric(p => ({ ...p, unit: e.target.value }))}
                    style={{ width:'60px', background:t.bg, border:`1px solid ${t.border}`, borderRadius:'6px', color:t.text, padding:'5px 8px', fontSize:'12px', fontFamily:F, outline:'none' }} />
                  <input placeholder={s.kpi.targetHolder} value={newMetric.target} onChange={e => setNewMetric(p => ({ ...p, target: e.target.value }))}
                    style={{ width:'64px', background:t.bg, border:`1px solid ${t.border}`, borderRadius:'6px', color:t.text, padding:'5px 8px', fontSize:'12px', fontFamily:F, outline:'none' }} />
                  <select value={newMetric.category} onChange={e => setNewMetric(p => ({ ...p, category: e.target.value }))}
                    style={{ background:t.bg, border:`1px solid ${t.border}`, color:t.text, padding:'5px 8px', borderRadius:'6px', fontSize:'12px', fontFamily:F, outline:'none' }}>
                    <option value="golfe">{s.kpi.golf}</option><option value="ginasio">{s.kpi.gym}</option>
                  </select>
                  <button onClick={() => {
                    if (!newMetric.label) return
                    setMetrics(p => [...p, { ...newMetric, id: newMetric.label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(), target: newMetric.target ? parseFloat(newMetric.target) : null }])
                    setNewMetric({ label:'', unit:'', category:'golfe', target:'' })
                  }} style={{ ...btn(true), borderRadius:'6px' }}>{s.kpi.add}</button>
                </div>
                <div style={{ marginTop:'12px', display:'flex', alignItems:'center', gap:'12px' }}>
                  <button onClick={saveKpis} disabled={savingKpis}
                    style={{ background: savingKpis ? t.navActive : t.accent, border:'none', borderRadius:'6px', color: savingKpis ? t.textMuted : '#fff', padding:'7px 18px', fontFamily:F, fontWeight:600, fontSize:'12px', cursor: savingKpis ? 'not-allowed' : 'pointer' }}>
                    {savingKpis ? s.kpi.saving : s.kpi.saveBtn}
                  </button>
                  {kpiMsg && <span style={{ fontSize:'12px', color: kpiMsg.startsWith('Erro') || kpiMsg.startsWith('Error') ? t.danger : t.success, fontWeight:600 }}>{kpiMsg}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Views */}
          {loading && <div style={{ padding:'60px', textAlign:'center', color:t.textMuted, fontSize:'14px' }}>{s.loading}</div>}

          {!loading && view === 'home' && (
            <Suspense fallback={<div style={{ padding:'60px', textAlign:'center', color:t.textMuted, fontSize:'14px' }}>{s.loading}</div>}>
              <Home theme={theme} t={t} onNavigate={(v, opts) => navigateToView(v, opts)} onRegister={() => setShowRegister(true)} user={user} profile={profile} lang={lang} events={events} trainingPlans={trainingPlans} />
            </Suspense>
          )}

          <div style={{ padding: view === 'home' ? '0' : '24px 32px', flex:1 }}>
            {!loading && view === 'performance' && <Performance theme={theme} t={t} user={user} lang={lang} initialTab={perfTab} trainingPlans={trainingPlans} />}

            {!loading && view === 'history' && (
              <div>
                <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
                  <button onClick={() => setChartView('chart')} style={btn(chartView === 'chart')}>{s.chart.chart}</button>
                  <button onClick={() => setChartView('table')} style={btn(chartView === 'table')}>{s.chart.table}</button>
                  {chartView === 'chart' && (
                    <select value={chartMetric} onChange={e => setChartMetric(e.target.value)}
                      style={{ background:t.surface, border:`1px solid ${t.border}`, color:t.text, padding:'6px 10px', borderRadius:'6px', fontSize:'12px', fontFamily:F, outline:'none' }}>
                      {metrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  )}
                </div>
                {chartView === 'chart' && (
                  <div style={card}>
                    <div style={{ fontSize:'10px', letterSpacing:'2px', color:t.textMuted, marginBottom:'12px', fontWeight:600 }}>
                      {metrics.find(m => m.id === chartMetric)?.label?.toUpperCase()} — {s.chart.evolution}
                    </div>
                    <SparkChart data={entries} metricId={chartMetric} unit={metrics.find(m => m.id === chartMetric)?.unit} target={metrics.find(m => m.id === chartMetric)?.target} theme={theme} noDataText={s.chart.noData} targetLabel={s.chart.target} />
                  </div>
                )}
                {chartView === 'table' && (
                  <div style={{ overflowX:'auto', border:`1px solid ${t.border}`, borderRadius:'10px' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px', minWidth:'500px' }}>
                      <thead>
                        <tr style={{ background:t.surface }}>
                          <th style={{ padding:'10px 14px', textAlign:'left', color:t.textMuted, fontWeight:600, fontSize:'10px', letterSpacing:'2px', borderBottom:`1px solid ${t.border}` }}>{s.table.date}</th>
                          {metrics.map(m => <th key={m.id} style={{ padding:'10px 8px', textAlign:'center', color:t.textMuted, fontWeight:600, fontSize:'10px', letterSpacing:'1px', borderBottom:`1px solid ${t.border}` }}>{m.label.toUpperCase()}</th>)}
                          <th style={{ padding:'10px 8px', textAlign:'center', color:t.textMuted, fontWeight:600, fontSize:'10px', borderBottom:`1px solid ${t.border}` }}>{s.table.notes}</th>
                          <th style={{ borderBottom:`1px solid ${t.border}`, width:'40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedDates.map(date => (
                          <tr key={date} style={{ borderTop:`1px solid ${t.border}` }}>
                            <td style={{ padding:'10px 14px', color:t.textMuted, whiteSpace:'nowrap' }}>{new Date(date + 'T12:00:00').toLocaleDateString('pt-PT')}</td>
                            {metrics.map(m => {
                              const entry = dateMap[date]?.[m.id]
                              return <td key={m.id} style={{ padding:'10px 8px', textAlign:'center', color: entry ? t.accentLight : t.textFaint, fontWeight: entry ? 700 : 400 }}>{entry ? `${entry.value}${m.unit}` : '·'}</td>
                            })}
                            <td style={{ padding:'10px 8px', textAlign:'center', color:t.textMuted, fontSize:'12px', maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {dateMap[date]?.['__notes__']?.value || '·'}
                            </td>
                            <td style={{ padding:'10px 8px', textAlign:'center' }}>
                              <button onClick={() => setDeleteConfirm(date)}
                                style={{ background:'transparent', border:'none', color:t.textFaint, cursor:'pointer', fontSize:'16px', padding:'2px 6px', lineHeight:1 }}
                                onMouseEnter={e => e.target.style.color = t.danger}
                                onMouseLeave={e => e.target.style.color = t.textFaint}>×</button>
                            </td>
                          </tr>
                        ))}
                        {!sortedDates.length && (
                          <tr><td colSpan={metrics.length + 3} style={{ padding:'48px', textAlign:'center', color:t.textMuted, fontStyle:'italic' }}>{s.table.empty}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {!loading && view === 'goals'       && <Goals       theme={theme} t={t} user={user} />}
            {!loading && view === 'training' && (
              <Suspense fallback={<div style={{ padding:'60px', textAlign:'center', color:t.textMuted, fontSize:'14px' }}>{s.loading}</div>}>
                <Training theme={theme} t={t} user={user} userRole={profile.role} lang={lang} focusDate={trainingFocusDate} onFocusConsumed={() => setTrainingFocusDate(null)} events={events} onPlansChanged={fetchTrainingPlans} />
              </Suspense>
            )}
            {!loading && view === 'competition' && <CompStats   theme={theme} t={t} user={user} events={events} />}
            {!loading && view === 'calendar'    && <Calendar    theme={theme} t={t} user={user} lang={lang} onNavigate={(v, opts) => navigateToView(v, opts)} events={events} trainingPlans={trainingPlans} onEventsChanged={fetchEvents} onPlansChanged={fetchTrainingPlans} initScheduleType={calendarInitSchedule} onInitConsumed={clearCalendarInitSchedule} focusDate={calendarFocusDate} onFocusConsumed={() => setCalendarFocusDate(null)} />}
            {!loading && view === 'chat'        && <Chat        theme={theme} t={t} user={user} profile={profile} lang={lang} />}
            {!loading && view === 'hcpwagr'     && <HcpWagr     theme={theme} t={t} user={user} />}
            {!loading && view === 'microcycles' && <Microcycles theme={theme} t={t} user={user} lang={lang} />}
            {!loading && view === 'backoffice'  && <Backoffice  theme={theme} t={t} user={user} userRole={profile.role} />}
          </div>
        </div>
      </div>
    </div>
  )
}
