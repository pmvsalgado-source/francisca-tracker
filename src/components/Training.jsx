import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const COACH_GOLF = 'pmvsalgado@gmail.com'
const COACH_GYM = 'pmvsalgado@gmail.com'
const ADMIN = 'pmvsalgado@gmail.com'

const GOLF_CATS = ['Driving Range', 'Jogo Curto', 'Putt', 'Bunker', 'Campo']
const GYM_CATS = ['Pernas', 'Potência', 'Core', 'Braços', 'Mobilidade', 'Cardio', 'Prevenção']
const F = "'Inter', system-ui, sans-serif"
const golfColor = '#378ADD'
const gymColor = '#52E8A0'
const golfDark = '#0C447C'
const gymDark = '#27500A'

const GOLF_LIBRARY = [
  { id:'g0', name:'Aquecimento — pitch shots', cat:'Driving Range', desc:'9-ferro meio swing a crescer, foco em contacto e ritmo', default_qty:20 },
  { id:'g1', name:'Ladder drill — wedges', cat:'Driving Range', desc:'Mudar alvo a cada batimento: PW 60→80m, SW 50→70m, LW 40→60m', default_qty:30 },
  { id:'g2', name:'Wedge gapping', cat:'Driving Range', desc:'10 bolas por distância em incrementos de 10m (30→90m)', default_qty:40 },
  { id:'g3', name:'High shot vs low shot', cat:'Driving Range', desc:'Mesma distância, variar trajectória com cada wedge', default_qty:20 },
  { id:'g4', name:'Full finish vs cut-off', cat:'Driving Range', desc:'Alternar finish completo e finish curto com cada wedge', default_qty:20 },
  { id:'g5', name:'Clock-face drill', cat:'Driving Range', desc:'9h (curto), 12h (médio), 3h (longo) com wedge', default_qty:15 },
  { id:'g6', name:'3 fades + 3 draws por ferro', cat:'Driving Range', desc:'Chamada do tiro antes de bater, todos os ferros', default_qty:30 },
  { id:'g7', name:'Ferros pares', cat:'Driving Range', desc:'8, 6, 4 ferro — foco em ball flight consistente', default_qty:30 },
  { id:'g8', name:'Ferros ímpares', cat:'Driving Range', desc:'9, 7, 5, 3 ferro — foco em ball flight consistente', default_qty:30 },
  { id:'g9', name:'Same club, different targets', cat:'Driving Range', desc:'Ex: 5-ferro a 200, 175, 150, 125, 100m em escada', default_qty:25 },
  { id:'g10', name:'Gate drill — ferros', cat:'Driving Range', desc:'Dois tees como corredor para corrigir swing path', default_qty:20 },
  { id:'g11', name:'Coin drill', cat:'Driving Range', desc:'Moeda à frente da bola, bater a moeda no impact', default_qty:20 },
  { id:'g12', name:'9-shot drill', cat:'Driving Range', desc:'Baixo/médio/alto × fade/straight/draw — 9 combinações', default_qty:27 },
  { id:'g13', name:'Madeira 3 — fades altas', cat:'Driving Range', desc:'Bola ao chão, fade alta para parar suave no green', default_qty:15 },
  { id:'g14', name:'Madeira 3 — draws compridas', cat:'Driving Range', desc:'Tee baixo, virar a bola para maximizar distância', default_qty:15 },
  { id:'g15', name:'Driver — fairway imaginário', cat:'Driving Range', desc:'Fairway de 50m, registar: dentro / miss esq / miss dir', default_qty:20 },
  { id:'g16', name:'Driver — pontuação', cat:'Driving Range', desc:'1pt ferro, 2pt madeira, 3pt driver, -1pt fora', default_qty:15 },
  { id:'g17', name:'Driver — mock round', cat:'Driving Range', desc:'9 buracos do próximo torneio pelo scorecard no range', default_qty:9 },
  { id:'g18', name:'Stack speed — escada', cat:'Driving Range', desc:'50% → 75% → 100% velocidade, foco em equilíbrio no finish', default_qty:24 },
  { id:'g19', name:'Max speed', cat:'Driving Range', desc:'Série de velocidade máxima, finish completo obrigatório', default_qty:20 },
  { id:'g20', name:'Pause drill', cat:'Driving Range', desc:'Pausa 1-2s no topo do backswing antes de soltar', default_qty:20 },
  { id:'g21', name:'Weighted club swings', cat:'Driving Range', desc:'Aumentar velocidade de swing com clube mais pesado', default_qty:20 },
  { id:'g26', name:'Ladder drill — pitching', cat:'Jogo Curto', desc:'Mudar alvo a cada batimento, 30 a 80m', default_qty:30 },
  { id:'g27', name:'3 swing lengths', cat:'Jogo Curto', desc:'½ swing, ¾ swing, completo — medir distância de cada', default_qty:27 },
  { id:'g28', name:'Partial wedges aleatórios', cat:'Jogo Curto', desc:'Distâncias aleatórias, simular situações de campo', default_qty:20 },
  { id:'g29', name:'Landing zone drill', cat:'Jogo Curto', desc:'Toalha ou arco no green como zona de ateragem', default_qty:20 },
  { id:'g30', name:'Tee drill — pitching', cat:'Jogo Curto', desc:'Tee à frente da bola, bater bola e depois tee', default_qty:20 },
  { id:'g31', name:'Drop & repeat', cat:'Jogo Curto', desc:'Várias bolas no mesmo sítio, repetir mesmo chip até encaixar', default_qty:20 },
  { id:'g32', name:'Par 18', cat:'Jogo Curto', desc:'9 posições em redor do green, par 2 cada, contar score', default_qty:18 },
  { id:'g33', name:'Scoring game', cat:'Jogo Curto', desc:'1 bola, chip e putt fora, registar score', default_qty:9 },
  { id:'g34', name:'Clock drill — chip', cat:'Jogo Curto', desc:'12 posições em redor do buraco como horas de relógio', default_qty:12 },
  { id:'g35', name:'Hula hoop drill', cat:'Jogo Curto', desc:'Aro no green como zona alvo, contar bolas dentro', default_qty:20 },
  { id:'g36', name:'Horse — chip', cat:'Jogo Curto', desc:'Com parceiro: cada um propõe o chip, quem falha fica com letra', default_qty:10 },
  { id:'g37', name:'Bump-and-run com híbrido', cat:'Jogo Curto', desc:'Rolar a bola como se fosse putt longo', default_qty:15 },
  { id:'g38', name:'Lead arm only', cat:'Jogo Curto', desc:'Chip só com braço da frente, eliminar flip de pulso', default_qty:15 },
  { id:'g39', name:'Back foot up', cat:'Jogo Curto', desc:'Levantar pé de trás para forçar peso na frente', default_qty:15 },
  { id:'g46', name:'50 putts de 1m', cat:'Putt', desc:'Fazer 50 putts seguidos, não parar se falhar', default_qty:50 },
  { id:'g47', name:'Clock drill — putt', cat:'Putt', desc:'12 bolas em redor do buraco a 1m, fazer todas seguidas', default_qty:12 },
  { id:'g48', name:'5-in-a-row', cat:'Putt', desc:'5 bolas a 1m, fazer 5 seguidas — se falhar recomeça', default_qty:5 },
  { id:'g49', name:'100 straight putts', cat:'Putt', desc:'100 putts de 1m, contar quantas tentativas', default_qty:100 },
  { id:'g50', name:'Gate drill — putt', cat:'Putt', desc:'Dois tees como corredor para putter, treinar linha de saída', default_qty:20 },
  { id:'g51', name:'Birdie game', cat:'Putt', desc:'10 putts de 3m como birdie, se falha putt de par obrigatório', default_qty:10 },
  { id:'g52', name:'9-hole stroke play', cat:'Putt', desc:'9 buracos no green, registar putts por buraco', default_qty:9 },
  { id:'g53', name:'HORSE — putt', cat:'Putt', desc:'Com parceiro, alternância de putts difíceis', default_qty:10 },
  { id:'g54', name:'Ladder drill — lag', cat:'Putt', desc:'Tees a 3m, 4.5m, 6m, 9m — putt de cada, dentro de 30cm', default_qty:16 },
  { id:'g55', name:'2-putt challenge', cat:'Putt', desc:'9 putts acima de 6m, obrigação de fazer 2-putt em todos', default_qty:9 },
  { id:'g56', name:'Manilla folder', cat:'Putt', desc:'Parar a bola em cima de pasta a 2m do buraco', default_qty:15 },
  { id:'g57', name:'Drawback drill', cat:'Putt', desc:'Putt falhado → recuar um comprimento de clube e repetir', default_qty:10 },
  { id:'g58', name:'Tripwire drill', cat:'Putt', desc:'Flagstick atrás do buraco, chegar ao buraco sem tocar', default_qty:10 },
  { id:'g59', name:'One-handed putting', cat:'Putt', desc:'Mão dominante só, feel do putter e estabilidade', default_qty:20 },
  { id:'g60', name:'Eyes closed putting', cat:'Putt', desc:'Treinar feel e ritmo sem ver a linha', default_qty:10 },
  { id:'g61', name:'Look-at-hole putting', cat:'Putt', desc:'Olhar para o buraco em vez de para a bola', default_qty:10 },
  { id:'g40', name:'Lines in the sand', cat:'Bunker', desc:'Duas linhas paralelas, entrar na areia entre elas', default_qty:15 },
  { id:'g41', name:'Towel drill', cat:'Bunker', desc:'Toalha a 1m do buraco, aterrar dentro da toalha', default_qty:15 },
  { id:'g42', name:'15 saídas para pin variável', cat:'Bunker', desc:'Coach muda posição do pin após cada saída', default_qty:15 },
  { id:'g43', name:'Plugged lie drill', cat:'Bunker', desc:'Bola enterrada, praticar saída de lies difíceis', default_qty:10 },
  { id:'g44', name:'Trajectory drill', cat:'Bunker', desc:'Saídas altas vs baixas do mesmo bunker', default_qty:10 },
  { id:'g45', name:'Clock drill — bunker', cat:'Bunker', desc:'12 ângulos diferentes à volta do bunker', default_qty:12 },
  { id:'g22', name:'Ronda completa — score', cat:'Campo', desc:'18 buracos, jogar para resultado', default_qty:18 },
  { id:'g23', name:'9 buracos — score', cat:'Campo', desc:'9 buracos competitivo, pre-shot routine em cada batimento', default_qty:9 },
  { id:'g24', name:'Ronda prática', cat:'Campo', desc:'Bola extra onde necessário para trabalhar pontos fracos', default_qty:18 },
  { id:'g25', name:'Gestão de campo', cat:'Campo', desc:'Foco em decisões: clube, trajectória, quando arriscar', default_qty:9 },
]

const GYM_LIBRARY = [
  { id:'e1', name:'Trap Bar Deadlift', cat:'Pernas', desc:'Força máxima, técnica primeiro', default_sets:4, default_reps:5 },
  { id:'e2', name:'Squat', cat:'Pernas', desc:'Barra, goblet ou bodyweight', default_sets:4, default_reps:6 },
  { id:'e3', name:'Leg Press', cat:'Pernas', desc:'Bilateral, foco em amplitude', default_sets:3, default_reps:12 },
  { id:'e4', name:'Split Squat', cat:'Pernas', desc:'Cada perna em separado', default_sets:3, default_reps:10 },
  { id:'e5', name:'Single Leg Press', cat:'Pernas', desc:'Unilateral, 12 reps cada', default_sets:3, default_reps:12 },
  { id:'e6', name:'Pistol Squat', cat:'Pernas', desc:'Com suporte se necessário', default_sets:3, default_reps:6 },
  { id:'e7', name:'Hip Hinge / RDL', cat:'Pernas', desc:'Romanian deadlift, foco em glúteos', default_sets:3, default_reps:12 },
  { id:'e8', name:'Hip Thrust', cat:'Pernas', desc:'Barra ou banda, foco em glúteos', default_sets:3, default_reps:12 },
  { id:'e9', name:'Jump Squat', cat:'Pernas', desc:'Explosivo, aterragem suave e controlada', default_sets:3, default_reps:8 },
  { id:'e10', name:'Box Jump', cat:'Pernas', desc:'Altura progressiva, foco em aterragem', default_sets:3, default_reps:6 },
  { id:'e11', name:'Lunge', cat:'Pernas', desc:'À frente ou reverso, peso corporal ou halteres', default_sets:3, default_reps:12 },
  { id:'e12', name:'Bulgarian Split Squat', cat:'Pernas', desc:'Pé traseiro elevado, amplitude máxima', default_sets:3, default_reps:10 },
  { id:'e13', name:"Bowler's Squat", cat:'Pernas', desc:'Equilíbrio e força unilateral', default_sets:3, default_reps:10 },
  { id:'e14', name:'Lateral Band Walk', cat:'Pernas', desc:'Banda à volta dos joelhos, passo lateral', default_sets:3, default_reps:15 },
  { id:'e15', name:'Med Ball Slam', cat:'Potência', desc:'Slam no chão com força máxima', default_sets:3, default_reps:8 },
  { id:'e16', name:'Med Ball Rotational Throw', cat:'Potência', desc:'Throw rotacional contra parede, simular swing', default_sets:3, default_reps:8 },
  { id:'e17', name:'Med Ball Chest Pass', cat:'Potência', desc:'Passe explosivo contra parede', default_sets:3, default_reps:8 },
  { id:'e18', name:'Cable Chop', cat:'Potência', desc:'Alto para baixo, rotação do tronco', default_sets:3, default_reps:12 },
  { id:'e19', name:'Cable Lift', cat:'Potência', desc:'Baixo para alto, rotação do tronco', default_sets:3, default_reps:12 },
  { id:'e20', name:'Resistance Band Rotation', cat:'Potência', desc:'Simular padrão de swing com banda', default_sets:3, default_reps:12 },
  { id:'e21', name:'Kettlebell Swing', cat:'Potência', desc:'Hip hinge explosivo, não squat', default_sets:3, default_reps:10 },
  { id:'e22', name:'Landmine Rotation', cat:'Potência', desc:'Rotação com barra em landmine', default_sets:3, default_reps:10 },
  { id:'e23', name:'Plank', cat:'Core', desc:'Posição neutra, glúteos activos, respirar', default_sets:3, default_reps:45 },
  { id:'e24', name:'Side Plank', cat:'Core', desc:'Cada lado, corpo em linha recta', default_sets:3, default_reps:30 },
  { id:'e25', name:'Dead Bug', cat:'Core', desc:'Controlo motor, lento e preciso', default_sets:3, default_reps:10 },
  { id:'e26', name:'Bird Dog', cat:'Core', desc:'Estabilidade lombar, sem rotação da anca', default_sets:3, default_reps:10 },
  { id:'e27', name:'Pallof Press', cat:'Core', desc:'Anti-rotação, cada lado, cabo ou banda', default_sets:3, default_reps:12 },
  { id:'e28', name:'Ab Wheel Rollout', cat:'Core', desc:'Extensão controlada, não deixar a lombar cair', default_sets:3, default_reps:8 },
  { id:'e29', name:'Hanging Leg Raise', cat:'Core', desc:'Barra, elevar joelhos ou pernas', default_sets:3, default_reps:10 },
  { id:'e30', name:'McGill Big 3', cat:'Core', desc:'Modified curl-up + bird dog + side plank', default_sets:2, default_reps:10 },
  { id:'e31', name:'TRX Row', cat:'Braços', desc:'Costas e bíceps, corpo em linha', default_sets:3, default_reps:12 },
  { id:'e32', name:'Push-up', cat:'Braços', desc:'Tronco estável, ritmo controlado', default_sets:3, default_reps:15 },
  { id:'e33', name:'Dumbbell Press', cat:'Braços', desc:'Overhead ou peito, halteres', default_sets:3, default_reps:10 },
  { id:'e34', name:'Cable Row', cat:'Braços', desc:'Puxar para o cinto, cotovelos junto ao corpo', default_sets:3, default_reps:12 },
  { id:'e35', name:'Bicep Curl', cat:'Braços', desc:'Halteres ou barra, sem balanço', default_sets:3, default_reps:12 },
  { id:'e36', name:'Tricep Extension', cat:'Braços', desc:'Cabo ou haltere overhead', default_sets:3, default_reps:12 },
  { id:'e37', name:'1-Arm Overhead Press', cat:'Braços', desc:'Unilateral, estabilidade do core', default_sets:3, default_reps:10 },
  { id:'e38', name:'Scapular Strengthening', cat:'Braços', desc:'Exercício prone com banda ou haltere', default_sets:3, default_reps:15 },
  { id:'e39', name:"Golfer's Diagonal Pattern", cat:'Braços', desc:'Diagonal low-to-high e high-to-low com banda', default_sets:3, default_reps:12 },
  { id:'e40', name:'Rotação Torácica', cat:'Mobilidade', desc:'Cada lado, lento e controlado', default_sets:2, default_reps:15 },
  { id:'e41', name:'Hip 90/90', cat:'Mobilidade', desc:'Mobilidade da anca, cada posição 2 min', default_sets:1, default_reps:5 },
  { id:'e42', name:'Cat-Cow', cat:'Mobilidade', desc:'Mobilização coluna, em 4 apoios', default_sets:2, default_reps:15 },
  { id:'e43', name:'World Greatest Stretch', cat:'Mobilidade', desc:'Cada lado, 5 reps com pausa', default_sets:2, default_reps:5 },
  { id:'e44', name:'Half-Kneeling Thoracic Rotation', cat:'Mobilidade', desc:'X-factor, separação ombros-ancas', default_sets:2, default_reps:10 },
  { id:'e45', name:'Hip Flexor Stretch', cat:'Mobilidade', desc:'Cada lado, 60 seg', default_sets:2, default_reps:60 },
  { id:'e46', name:'Shoulder Rotation', cat:'Mobilidade', desc:'Círculos e rotação interna/externa', default_sets:2, default_reps:10 },
  { id:'e47', name:'Ankle Mobility', cat:'Mobilidade', desc:'Círculos e dorsiflexão contra parede', default_sets:2, default_reps:10 },
  { id:'e48', name:'Corrida', cat:'Cardio', desc:'Ritmo aeróbico contínuo', default_sets:1, default_reps:20 },
  { id:'e49', name:'Bicicleta', cat:'Cardio', desc:'Aquecimento ou capacidade aeróbica', default_sets:1, default_reps:20 },
  { id:'e50', name:'Remo (ergómetro)', cat:'Cardio', desc:'Full body, alternativa à corrida', default_sets:1, default_reps:20 },
  { id:'e51', name:'Jump Rope', cat:'Cardio', desc:'Coordenação e resistência', default_sets:3, default_reps:3 },
  { id:'e52', name:'HIIT', cat:'Cardio', desc:'Intervalos de alta intensidade, 20s on / 40s off', default_sets:6, default_reps:1 },
  { id:'e53', name:'Circuito funcional', cat:'Cardio', desc:'5-6 exercícios em sequência sem descanso', default_sets:3, default_reps:1 },
  { id:'e54', name:'Wall Hold', cat:'Prevenção', desc:'Estabilização activa, glúteo médio', default_sets:3, default_reps:30 },
  { id:'e55', name:'Banded External Rotation', cat:'Prevenção', desc:'Banda, rotação externa do ombro', default_sets:3, default_reps:15 },
  { id:'e56', name:'Clamshell', cat:'Prevenção', desc:'Banda acima dos joelhos, rotação externa da anca', default_sets:3, default_reps:15 },
  { id:'e57', name:'Single Leg Balance', cat:'Prevenção', desc:'30 seg cada perna, olhos abertos depois fechados', default_sets:3, default_reps:30 },
  { id:'e58', name:'Farmers Carry', cat:'Prevenção', desc:'40m cada mão, peso controlado', default_sets:3, default_reps:40 },
  { id:'e59', name:'Suitcase Carry', cat:'Prevenção', desc:'40m com peso num lado, anti-inclinação', default_sets:3, default_reps:40 },
  { id:'e60', name:'Leopard Crawl', cat:'Prevenção', desc:'20 passos cada mão, padrão contralateral', default_sets:3, default_reps:20 },
  { id:'e61', name:'Bear Crawl', cat:'Prevenção', desc:'Joelhos a 5cm do chão, core activo', default_sets:3, default_reps:20 },
]

const DAYS_PT = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
const DAYS_EN = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DAYS_SHORT_PT = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM']
const DAYS_SHORT_EN = ['MON','TUE','WED','THU','FRI','SAT','SUN']

export default function Training({ theme, t, user, lang = 'en', events = [] }) {
  const [subTab, setSubTab] = useState('plan')
  const [planMode, setPlanMode] = useState(null) // null | 'golf' | 'gym'
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(() => { const d=new Date().getDay(); return d===0?6:d-1 })

  // Wizard state
  const [wizard, setWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardType, setWizardType] = useState('golf')
  const [wizardPeriod, setWizardPeriod] = useState('week')
  const [wizardWeeks, setWizardWeeks] = useState(1)
  const [wizardActiveDays, setWizardActiveDays] = useState([0,2,4])
  const [wizardDayPlans, setWizardDayPlans] = useState({})
  const [wizardCurrentDay, setWizardCurrentDay] = useState(0)
  const [wizardOpenCat, setWizardOpenCat] = useState(null)
  const [wizardNote, setWizardNote] = useState('')
  const [wizardCustom, setWizardCustom] = useState({ name:'', cat:'', desc:'' })
  const [wizardUserLib, setWizardUserLib] = useState([])
  const [saving, setSaving] = useState(false)

  // Athlete log state
  const [showFreeSession, setShowFreeSession] = useState(false)
  const [freeSession, setFreeSession] = useState({ date:new Date().toISOString().split('T')[0], notes:'', score:'', holes:'' })
  const [savingFree, setSavingFree] = useState(false)
  const [athleteNote, setAthleteNote] = useState('')

  const email = (user?.email||'').toLowerCase()
  const isCoachGolf = email === COACH_GOLF
  const isCoachGym = email === COACH_GYM
  const isAdmin = email === ADMIN
  const isAthlete = !isAdmin
  const isCoach = isCoachGolf || isCoachGym || isAdmin

  const DAYS_LONG = lang==='pt' ? DAYS_PT : DAYS_EN
  const DAYS_SHORT = lang==='pt' ? DAYS_SHORT_PT : DAYS_SHORT_EN

  const getWeekStart = useCallback((offset=0) => {
    const today = new Date()
    const day = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (day===0?6:day-1) + offset*7)
    monday.setHours(12,0,0,0)
    return monday.toISOString().split('T')[0]
  }, [])

  const weekStart = getWeekStart(weekOffset)
  const isCurrentWeek = weekOffset === 0
  const getWeekEnd = (s) => { const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+6); return d.toISOString().split('T')[0] }
  const formatWeek = (s) => {
    if (!s) return ''
    const d = new Date(s+'T12:00:00'), e = new Date(s+'T12:00:00')
    e.setDate(e.getDate()+6)
    return `${d.toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})} – ${e.toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}`
  }

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('training_plans').select('*').order('week_start',{ascending:false})
    setPlans(data||[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const golfPlan = plans.find(p => p.week_start===weekStart && p.plan_type==='golf')
  const gymPlan  = plans.find(p => p.week_start===weekStart && p.plan_type==='gym')

  // Check if a day has a competition
  const dayHasComp = (dayIdx) => {
    const ws = new Date(weekStart+'T12:00:00')
    const d = new Date(ws)
    d.setDate(ws.getDate() + dayIdx)
    const dateStr = d.toISOString().split('T')[0]
    return (events||[]).some(e => dateStr >= e.start_date && dateStr <= (e.end_date || e.start_date))
  }

  const savePlan = async (newDays, type, ws=weekStart) => {
    setSaving(true)
    const existing = plans.find(p=>p.week_start===ws && p.plan_type===type)
    const payload = { week_start:ws, week_end:getWeekEnd(ws), plan_type:type, days:newDays, updated_at:new Date().toISOString(), updated_by:email }
    if (existing) await supabase.from('training_plans').update(payload).eq('id',existing.id)
    else await supabase.from('training_plans').insert({...payload, created_by:email, status:'active', title:`${type==='golf'?'Golf':'Gym'} Plan`})
    setSaving(false)
    fetchPlans()
  }

  // Toggle drill in wizard day plan
  const toggleDrill = (ex) => {
    const key = wizardCurrentDay
    const current = wizardDayPlans[key] || []
    const exists = current.find(i=>i.id===ex.id)
    if (exists) {
      setWizardDayPlans(p=>({...p,[key]:current.filter(i=>i.id!==ex.id)}))
    } else {
      const item = wizardType==='golf'
        ? { ...ex, qty: ex.default_qty || 20 }
        : { ...ex, sets: ex.default_sets || 3, reps: ex.default_reps || 10, load: '' }
      setWizardDayPlans(p=>({...p,[key]:[...current,item]}))
    }
  }

  const isDrillSelected = (exId) => (wizardDayPlans[wizardCurrentDay]||[]).some(i=>i.id===exId)

  const updateItem = (exId, field, value) => {
    const key = wizardCurrentDay
    setWizardDayPlans(p=>({...p,[key]:(p[key]||[]).map(i=>i.id===exId?{...i,[field]:value}:i)}))
  }

  const removeItem = (exId) => {
    const key = wizardCurrentDay
    setWizardDayPlans(p=>({...p,[key]:(p[key]||[]).filter(i=>i.id!==exId)}))
  }

  const moveItem = (exId, dir) => {
    const key = wizardCurrentDay
    const items = [...(wizardDayPlans[key]||[])]
    const idx = items.findIndex(i=>i.id===exId)
    if (dir==='up' && idx>0) { [items[idx-1],items[idx]]=[items[idx],items[idx-1]] }
    if (dir==='down' && idx<items.length-1) { [items[idx],items[idx+1]]=[items[idx+1],items[idx]] }
    setWizardDayPlans(p=>({...p,[key]:items}))
  }

  const copyToAll = () => {
    const src = wizardDayPlans[wizardCurrentDay] || []
    const newPlans = {}
    wizardActiveDays.forEach(d => { newPlans[d] = JSON.parse(JSON.stringify(src)) })
    setWizardDayPlans(newPlans)
  }

  const copyToDay = (targetDay) => {
    const src = wizardDayPlans[wizardCurrentDay] || []
    setWizardDayPlans(p=>({...p,[targetDay]:JSON.parse(JSON.stringify(src))}))
  }

  const addCustom = () => {
    if (!wizardCustom.name) return
    const ex = { id:'c_'+Date.now(), ...wizardCustom, cat: wizardCustom.cat || (wizardType==='golf'?'Driving Range':'Pernas'),
      default_qty: 20, default_sets: 3, default_reps: 10 }
    setWizardUserLib(p=>[...p,ex])
    toggleDrill(ex)
    setWizardCustom({name:'',cat:'',desc:''})
  }

  const saveWizard = async () => {
    setSaving(true)
    // Build days array for each week
    const numWeeks = wizardPeriod==='month' ? 4 : wizardPeriod==='2weeks' ? 2 : wizardWeeks
    for (let w=0; w<numWeeks; w++) {
      const ws = getWeekStart(weekOffset + w)
      const newDays = Array(7).fill(null).map((_,i)=>({sessions:[]}))
      wizardActiveDays.forEach(dayIdx => {
        const items = wizardDayPlans[dayIdx] || []
        if (items.length > 0) {
          newDays[dayIdx].sessions.push({
            id: Date.now()+dayIdx+w,
            cat: wizardType==='golf' ? 'Driving Range' : 'Ginásio',
            notes: wizardNote,
            items: items
          })
        }
      })
      await savePlan(newDays, wizardType, ws)
    }
    setSaving(false)
    setWizard(false)
    setWizardStep(1)
    setWizardDayPlans({})
    setWizardNote('')
    fetchPlans()
  }

  const toggleDone = async (si, ii, type) => {
    const plan = type==='golf' ? golfPlan : gymPlan
    const newDays = JSON.parse(JSON.stringify(plan?.days||[]))
    const item = newDays[selectedDay]?.sessions?.[si]?.items?.[ii]
    if (!item) return
    item.done = !item.done
    await savePlan(newDays, type)
  }

  const addFreeSession = async () => {
    setSavingFree(true)
    const dateObj = new Date(freeSession.date+'T12:00:00')
    const day = dateObj.getDay()
    const dayIdx = day===0?6:day-1
    const existing = golfPlan
    const baseDays = existing?.days || Array(7).fill(null).map(()=>({sessions:[]}))
    const newDays = JSON.parse(JSON.stringify(baseDays))
    if (!newDays[dayIdx]) newDays[dayIdx]={sessions:[]}
    if (!newDays[dayIdx].sessions) newDays[dayIdx].sessions=[]
    newDays[dayIdx].sessions.push({ id:Date.now(), cat:'Campo', free:true, athlete:email, notes:freeSession.notes, score:freeSession.score, holes:freeSession.holes, items:[] })
    if (existing) await supabase.from('training_plans').update({days:newDays,updated_at:new Date().toISOString(),updated_by:email}).eq('id',existing.id)
    else await supabase.from('training_plans').insert({week_start:weekStart,week_end:getWeekEnd(weekStart),plan_type:'golf',days:newDays,created_by:email,status:'active',title:'Golf Plan'})
    setSavingFree(false)
    setShowFreeSession(false)
    fetchPlans()
  }

  const cats = wizardType==='golf' ? GOLF_CATS : GYM_CATS
  const baseLib = wizardType==='golf' ? GOLF_LIBRARY : GYM_LIBRARY
  const allLib = [...baseLib, ...wizardUserLib.filter(e=>cats.includes(e.cat))]

  // Combined view
  const combinedDays = Array(7).fill(null).map((_,i) => {
    const g = (golfPlan?.days||[])[i]||{sessions:[]}
    const gy = (gymPlan?.days||[])[i]||{sessions:[]}
    return {sessions:[...(g.sessions||[]).map(s=>({...s,_type:'golf'})), ...(gy.sessions||[]).map(s=>({...s,_type:'gym'}))]}
  })
  const todayIdx = (() => { const d=new Date().getDay(); return d===0?6:d-1 })()

  const prog = (() => {
    let done=0,total=0
    combinedDays.forEach(d=>d?.sessions?.forEach(s=>s.items?.forEach(i=>{total++;if(i.done)done++})))
    return {done,total,pct:total>0?Math.round((done/total)*100):0}
  })()

  // styles
  const inp = {background:t.bg,border:`1px solid ${t.border}`,borderRadius:'6px',color:t.text,padding:'7px 10px',fontSize:'13px',fontFamily:F,outline:'none',width:'100%',boxSizing:'border-box'}
  const smInp = {...inp,padding:'5px 8px',fontSize:'12px',width:'auto'}
  const card = {background:t.surface,border:`1px solid ${t.border}`,borderRadius:'12px',padding:'16px 20px'}

  const subLabels = [
    { key:'plan', role: lang==='pt'?'COACH':'COACH', label: lang==='pt'?'Set the Plan':'Set the Plan',
      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      bg:'#E6F1FB', color:'#185FA5' },
    { key:'log', role: lang==='pt'?'ATHLETE':'ATHLETE', label: lang==='pt'?'Record What You Did':'Record What You Did',
      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
      bg:'#EAF3DE', color:'#27500A' },
    { key:'progress', role:'', label: lang==='pt'?'Track Progress':'Track Progress',
      icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
      bg:'var(--color-background-secondary)' || t.navActive, color:t.textMuted },
  ]

  // ── WIZARD RENDER ─────────────────────────────────────────────────────────
  if (wizard) {
    const currentItems = wizardDayPlans[wizardCurrentDay] || []
    const dayDone = (d) => (wizardDayPlans[d]||[]).length > 0
    const totalBalls = currentItems.reduce((a,i)=>a+(parseInt(i.qty)||0),0)

    return (
      <div style={{fontFamily:F,color:t.text}}>
        {/* Wizard header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <div>
            <div style={{fontSize:'9px',letterSpacing:'2px',color:wizardType==='golf'?golfColor:gymColor,fontWeight:600,marginBottom:'3px'}}>
              {wizardType==='golf'?'COACH GOLF':'COACH GYM'} · {lang==='pt'?'CRIAR PLANO':'CREATE PLAN'}
            </div>
            <div style={{fontSize:'20px',fontWeight:800,color:t.text}}>{lang==='pt'?'Criar Plano':'Create Plan'}</div>
          </div>
          <button onClick={()=>{setWizard(false);setWizardStep(1)}}
            style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'8px 16px',cursor:'pointer',fontSize:'13px',fontFamily:F}}>
            {lang==='pt'?'Cancelar':'Cancel'}
          </button>
        </div>

        {/* Step indicator */}
        <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:'24px'}}>
          {[1,2].map((s,i)=>(
            <div key={s} style={{display:'flex',alignItems:'center',gap:0,flex:i<1?'0 0 auto':1}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{width:'28px',height:'28px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,
                  background:wizardStep>s?gymColor:wizardStep===s?(wizardType==='golf'?golfColor:gymColor):t.border,
                  color:wizardStep>=s?'#fff':t.textMuted}}>
                  {wizardStep>s?'✓':s}
                </div>
                <span style={{fontSize:'13px',fontWeight:600,color:wizardStep>=s?t.text:t.textMuted}}>
                  {s===1?(lang==='pt'?'Quando?':'When?'):(lang==='pt'?'Definir sessões':'Define sessions')}
                </span>
              </div>
              {i<1 && <div style={{flex:1,height:'1px',background:t.border,margin:'0 12px',minWidth:'40px'}}/>}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {wizardStep===1 && (
          <div style={card}>
            {/* Period */}
            <div style={{marginBottom:'20px'}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'10px'}}>{lang==='pt'?'PERÍODO':'PERIOD'}</div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {[['week',lang==='pt'?'Esta semana':'This week'],['2weeks',lang==='pt'?'2 semanas':'2 weeks'],['month',lang==='pt'?'1 mês':'1 month']].map(([val,lbl])=>(
                  <button key={val} onClick={()=>setWizardPeriod(val)}
                    style={{padding:'8px 18px',borderRadius:'20px',border:`1px solid ${wizardPeriod===val?(wizardType==='golf'?golfColor:gymColor):t.border}`,
                      background:wizardPeriod===val?wizardType==='golf'?'#eaf4ff':'#eafff0':'transparent',
                      color:wizardPeriod===val?wizardType==='golf'?golfDark:gymDark:t.textMuted,
                      cursor:'pointer',fontSize:'13px',fontWeight:wizardPeriod===val?700:400,fontFamily:F}}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* Active days */}
            <div style={{marginBottom:'20px'}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'10px'}}>{lang==='pt'?'DIAS ACTIVOS':'ACTIVE DAYS'}</div>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                {DAYS_SHORT.map((d,i)=>{
                  const isActive = wizardActiveDays.includes(i)
                  const hasComp = dayHasComp(i)
                  return (
                    <button key={i} onClick={()=>{ if(hasComp)return; setWizardActiveDays(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i].sort()) }}
                      style={{padding:'8px 14px',borderRadius:'20px',
                        border:`1px solid ${hasComp?'#BA7517':isActive?(wizardType==='golf'?golfColor:gymColor):t.border}`,
                        background:hasComp?'#FAEEDA':isActive?wizardType==='golf'?'#eaf4ff':'#eafff0':'transparent',
                        color:hasComp?'#633806':isActive?wizardType==='golf'?golfDark:gymDark:t.textMuted,
                        cursor:hasComp?'not-allowed':'pointer',fontSize:'12px',fontWeight:isActive?700:400,fontFamily:F}}>
                      {d}{hasComp?` · comp`:''}
                    </button>
                  )
                })}
              </div>
              <div style={{fontSize:'11px',color:t.textMuted,marginTop:'8px'}}>
                {wizardActiveDays.length} {lang==='pt'?'dias seleccionados':'days selected'}
                {(events||[]).length>0 && <span style={{color:'#854F0B',marginLeft:'8px'}}>· {lang==='pt'?'Dias de competição bloqueados':'Competition days blocked'}</span>}
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button onClick={()=>{ setWizardCurrentDay(wizardActiveDays[0]??0); setWizardStep(2) }} disabled={wizardActiveDays.length===0}
                style={{background:wizardType==='golf'?golfColor:gymColor,border:'none',borderRadius:'8px',color:'#fff',padding:'10px 24px',cursor:wizardActiveDays.length===0?'not-allowed':'pointer',fontSize:'13px',fontWeight:700,fontFamily:F,opacity:wizardActiveDays.length===0?0.5:1}}>
                {lang==='pt'?'Próximo →':'Next →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {wizardStep===2 && (
          <div style={card}>
            {/* Day tabs */}
            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'10px'}}>{lang==='pt'?'DIA':'DAY'}</div>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap',alignItems:'center'}}>
                {wizardActiveDays.map(d=>(
                  <button key={d} onClick={()=>{setWizardCurrentDay(d);setWizardOpenCat(null)}}
                    style={{padding:'7px 14px',borderRadius:'20px',display:'flex',alignItems:'center',gap:'6px',
                      border:`1px solid ${wizardCurrentDay===d?(wizardType==='golf'?golfColor:gymColor):t.border}`,
                      background:wizardCurrentDay===d?wizardType==='golf'?'#eaf4ff':'#eafff0':'transparent',
                      color:wizardCurrentDay===d?wizardType==='golf'?golfDark:gymDark:t.textMuted,
                      cursor:'pointer',fontSize:'12px',fontWeight:wizardCurrentDay===d?700:400,fontFamily:F}}>
                    {dayDone(d) && <span style={{color:gymColor,fontSize:'11px'}}>✓</span>}
                    {DAYS_LONG[d]}
                  </button>
                ))}
                <div style={{marginLeft:'auto',display:'flex',gap:'6px'}}>
                  <button onClick={copyToAll}
                    style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'6px 12px',cursor:'pointer',fontSize:'11px',fontFamily:F}}>
                    {lang==='pt'?'Copiar para todos':'Copy to all'}
                  </button>
                </div>
              </div>
            </div>

            {/* Category buttons */}
            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'10px'}}>{lang==='pt'?'CATEGORIAS':'CATEGORIES'}</div>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                {cats.map(cat=>{
                  const count = currentItems.filter(i=>i.cat===cat).length
                  const isOpen = wizardOpenCat===cat
                  return (
                    <button key={cat} onClick={()=>setWizardOpenCat(isOpen?null:cat)}
                      style={{padding:'8px 16px',borderRadius:'20px',display:'flex',alignItems:'center',gap:'6px',
                        border:`1px solid ${isOpen?(wizardType==='golf'?golfColor:gymColor):count>0?(wizardType==='golf'?golfColor:gymColor)+88:t.border}`,
                        background:isOpen?wizardType==='golf'?'#eaf4ff':'#eafff0':count>0?wizardType==='golf'?'#f0f8ff':'#f0fff4':'transparent',
                        color:isOpen||count>0?wizardType==='golf'?golfDark:gymDark:t.textMuted,
                        cursor:'pointer',fontSize:'12px',fontWeight:isOpen||count>0?700:400,fontFamily:F}}>
                      {cat}
                      {count>0 && <span style={{background:wizardType==='golf'?golfColor:gymColor,color:'#fff',borderRadius:'10px',padding:'1px 7px',fontSize:'10px',fontWeight:700}}>{count}</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Drill buttons for open category */}
            {wizardOpenCat && (
              <div style={{background:t.bg,borderRadius:'10px',padding:'14px',marginBottom:'16px',border:`1px solid ${t.border}`}}>
                <div style={{fontSize:'9px',letterSpacing:'2px',color:wizardType==='golf'?golfColor:gymColor,fontWeight:600,marginBottom:'10px'}}>{wizardOpenCat.toUpperCase()}</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:'7px',marginBottom:'14px'}}>
                  {allLib.filter(e=>e.cat===wizardOpenCat).map(ex=>{
                    const on = isDrillSelected(ex.id)
                    return (
                      <button key={ex.id} onClick={()=>toggleDrill(ex)}
                        style={{padding:'7px 14px',borderRadius:'20px',display:'flex',alignItems:'center',gap:'5px',
                          border:`1px solid ${on?(wizardType==='golf'?golfColor:gymColor):t.border}`,
                          background:on?wizardType==='golf'?'#eaf4ff':'#eafff0':t.surface,
                          color:on?wizardType==='golf'?golfDark:gymDark:t.textMuted,
                          cursor:'pointer',fontSize:'12px',fontWeight:on?700:400,fontFamily:F}}>
                        {on && <span style={{fontSize:'10px',fontWeight:800}}>✓</span>}
                        {ex.name}
                      </button>
                    )
                  })}
                </div>
                {/* Custom exercise */}
                <div style={{borderTop:`1px solid ${t.border}`,paddingTop:'10px'}}>
                  <div style={{fontSize:'9px',color:t.textMuted,marginBottom:'7px',letterSpacing:'1px',fontWeight:600}}>{lang==='pt'?'+ EXERCÍCIO PERSONALIZADO':'+ CUSTOM EXERCISE'}</div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    <input value={wizardCustom.name} onChange={e=>setWizardCustom(p=>({...p,name:e.target.value}))}
                      placeholder={lang==='pt'?'Nome do exercício':'Exercise name'} style={{...smInp,flex:2,minWidth:'140px',width:'auto'}}/>
                    <input value={wizardCustom.desc||''} onChange={e=>setWizardCustom(p=>({...p,desc:e.target.value}))}
                      placeholder={lang==='pt'?'Descrição (opcional)':'Description (optional)'} style={{...smInp,flex:2,minWidth:'140px',width:'auto'}}/>
                    <button onClick={()=>{ setWizardCustom(p=>({...p,cat:wizardOpenCat})); addCustom() }}
                      style={{background:wizardType==='golf'?golfColor:gymColor,border:'none',borderRadius:'7px',color:'#fff',padding:'7px 14px',cursor:'pointer',fontSize:'12px',fontWeight:700,fontFamily:F}}>
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selected items list */}
            {currentItems.length > 0 && (
              <div style={{marginBottom:'16px'}}>
                <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'10px'}}>
                  {lang==='pt'?'SESSÃO DE':'SESSION —'} {DAYS_LONG[wizardCurrentDay].toUpperCase()}
                </div>
                <div style={{border:`1px solid ${t.border}`,borderRadius:'10px',overflow:'hidden'}}>
                  {currentItems.map((item,idx)=>(
                    <div key={item.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 14px',borderBottom:idx<currentItems.length-1?`1px solid ${t.border}`:'none',background:t.surface}}>
                      {/* Reorder */}
                      <div style={{display:'flex',flexDirection:'column',gap:'1px'}}>
                        <button onClick={()=>moveItem(item.id,'up')} style={{background:'transparent',border:'none',color:t.textFaint,cursor:'pointer',fontSize:'11px',lineHeight:1,padding:'1px 3px'}}>▲</button>
                        <button onClick={()=>moveItem(item.id,'down')} style={{background:'transparent',border:'none',color:t.textFaint,cursor:'pointer',fontSize:'11px',lineHeight:1,padding:'1px 3px'}}>▼</button>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'13px',fontWeight:600,color:t.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div>
                        <div style={{fontSize:'10px',color:t.textMuted}}>{item.cat}</div>
                      </div>
                      {wizardType==='golf' ? (
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <input value={item.qty||''} onChange={e=>updateItem(item.id,'qty',e.target.value)}
                            style={{...smInp,width:'70px',textAlign:'center'}}/>
                          <span style={{fontSize:'11px',color:t.textMuted,whiteSpace:'nowrap'}}>{lang==='pt'?'bolas':'balls'}</span>
                        </div>
                      ) : (
                        <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                          <input value={item.sets||''} onChange={e=>updateItem(item.id,'sets',e.target.value)} style={{...smInp,width:'46px',textAlign:'center'}} placeholder='sets'/>
                          <span style={{fontSize:'11px',color:t.textFaint}}>×</span>
                          <input value={item.reps||''} onChange={e=>updateItem(item.id,'reps',e.target.value)} style={{...smInp,width:'46px',textAlign:'center'}} placeholder='reps'/>
                          <input value={item.load||''} onChange={e=>updateItem(item.id,'load',e.target.value)} style={{...smInp,width:'52px',textAlign:'center'}} placeholder='kg'/>
                        </div>
                      )}
                      <button onClick={()=>removeItem(item.id)} style={{background:'transparent',border:'none',color:t.textFaint,cursor:'pointer',fontSize:'16px',padding:'0 3px'}} onMouseEnter={e=>e.target.style.color='#f87171'} onMouseLeave={e=>e.target.style.color=t.textFaint}>×</button>
                    </div>
                  ))}
                </div>
                {wizardType==='golf' && totalBalls>0 && (
                  <div style={{fontSize:'11px',color:t.textMuted,marginTop:'6px'}}>
                    {lang==='pt'?'Total:':'Total:'} {totalBalls} {lang==='pt'?'bolas':'balls'}
                  </div>
                )}
              </div>
            )}

            {/* Session note */}
            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'6px'}}>{lang==='pt'?'NOTA DA SESSÃO (OPCIONAL)':'SESSION NOTE (OPTIONAL)'}</div>
              <input value={wizardNote} onChange={e=>setWizardNote(e.target.value)}
                placeholder={lang==='pt'?'Ex: Foco em velocidade esta semana':'Ex: Focus on speed this week'}
                style={inp}/>
            </div>

            {/* Actions */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:'8px',borderTop:`1px solid ${t.border}`}}>
              <button onClick={()=>setWizardStep(1)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'8px 16px',cursor:'pointer',fontSize:'13px',fontFamily:F}}>
                ← {lang==='pt'?'Anterior':'Back'}
              </button>
              <button onClick={saveWizard} disabled={saving}
                style={{background:saving?t.border:wizardType==='golf'?golfColor:gymColor,border:'none',borderRadius:'8px',color:'#fff',padding:'10px 28px',cursor:saving?'not-allowed':'pointer',fontSize:'13px',fontWeight:700,fontFamily:F}}>
                {saving?'...':(lang==='pt'?'Guardar Plano ✓':'Save Plan ✓')}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── MAIN VIEW ─────────────────────────────────────────────────────────────
  const planDays = (t_) => (t_==='golf' ? golfPlan : gymPlan)?.days || Array(7).fill(null).map(()=>({sessions:[]}))
  const dayData = (type) => planDays(type)[selectedDay]||{sessions:[]}

  return (
    <div style={{fontFamily:F,color:t.text}}>

      {/* Free session modal */}
      {showFreeSession && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:'20px'}}>
          <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:'14px',padding:'24px',width:'100%',maxWidth:'420px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
              <div style={{fontSize:'15px',fontWeight:800,color:t.text}}>{lang==='pt'?'Fui ao Campo':'Course Session'}</div>
              <button onClick={()=>setShowFreeSession(false)} style={{background:'transparent',border:'none',color:t.textMuted,cursor:'pointer',fontSize:'22px'}}>×</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,marginBottom:'5px',fontWeight:600}}>{lang==='pt'?'DATA':'DATE'}</div>
                <input type="date" value={freeSession.date} onChange={e=>setFreeSession(p=>({...p,date:e.target.value}))} style={inp}/>
              </div>
              <div>
                <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,marginBottom:'5px',fontWeight:600}}>{lang==='pt'?'BURACOS':'HOLES'}</div>
                <select value={freeSession.holes} onChange={e=>setFreeSession(p=>({...p,holes:e.target.value}))} style={{...inp,padding:'7px 8px'}}>
                  <option value=''>—</option><option value='9'>9</option><option value='18'>18</option>
                </select>
              </div>
            </div>
            <div style={{marginBottom:'12px'}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,marginBottom:'5px',fontWeight:600}}>SCORE</div>
              <input value={freeSession.score} onChange={e=>setFreeSession(p=>({...p,score:e.target.value}))} placeholder='Ex: 78' style={inp}/>
            </div>
            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,marginBottom:'5px',fontWeight:600}}>{lang==='pt'?'NOTAS':'NOTES'}</div>
              <textarea value={freeSession.notes} onChange={e=>setFreeSession(p=>({...p,notes:e.target.value}))} placeholder={lang==='pt'?'Como correu?':'How did it go?'} style={{...inp,minHeight:'70px',resize:'vertical'}}/>
            </div>
            <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
              <button onClick={()=>setShowFreeSession(false)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'8px 16px',cursor:'pointer',fontSize:'13px',fontFamily:F}}>{lang==='pt'?'Cancelar':'Cancel'}</button>
              <button onClick={addFreeSession} disabled={savingFree} style={{background:savingFree?t.border:golfColor,border:'none',borderRadius:'8px',color:'#fff',padding:'8px 20px',cursor:'pointer',fontSize:'13px',fontWeight:700,fontFamily:F}}>{savingFree?'...':(lang==='pt'?'Guardar':'Save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{display:'flex',gap:'6px',marginBottom:'24px',flexWrap:'wrap'}}>
        {subLabels.map(({key,role,label,icon,bg,color})=>{
          const active = subTab===key
          return (
            <button key={key} onClick={()=>setSubTab(key)}
              style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 16px',borderRadius:'10px',
                border:`1px solid ${active?color:t.border}`,background:active?bg:'transparent',cursor:'pointer',fontFamily:F,
                flex:'1 1 auto',minWidth:'160px',textAlign:'left'}}>
              <div style={{width:'30px',height:'30px',borderRadius:'50%',background:active?color+'22':t.navActive,display:'flex',alignItems:'center',justifyContent:'center',color:active?color:t.textMuted,flexShrink:0}}>
                {icon}
              </div>
              <div>
                {role && <div style={{fontSize:'9px',letterSpacing:'1px',color:active?color:t.textMuted,fontWeight:600,marginBottom:'1px'}}>{role}</div>}
                <div style={{fontSize:'12px',fontWeight:active?700:400,color:active?color==='#185FA5'?'#0C447C':color==='#27500A'?'#27500A':t.text:t.textMuted}}>{label}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── SET THE PLAN ── */}
      {subTab==='plan' && (
        <div>
          {/* Two big entry buttons */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'24px'}}>
            {/* Golf */}
            <div style={{background:'#eaf4ff',border:`2px solid ${golfColor}`,borderRadius:'14px',padding:'24px',cursor:'pointer'}}
              onClick={()=>{setWizardType('golf');setWizard(true);setWizardStep(1);setWizardActiveDays([0,2,4]);setWizardDayPlans({});setWizardNote('')}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'50%',background:golfColor,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                </div>
                <div>
                  <div style={{fontSize:'9px',letterSpacing:'2px',color:golfColor,fontWeight:700,marginBottom:'2px'}}>COACH GOLF</div>
                  <div style={{fontSize:'16px',fontWeight:800,color:golfDark}}>Golf Plan</div>
                </div>
              </div>
              <div style={{fontSize:'13px',color:'#185FA5',lineHeight:1.5}}>{lang==='pt'?'Define os drills, séries de bolas e o plano semanal de golfe':'Define drills, ball counts and the weekly golf plan'}</div>
              <div style={{marginTop:'14px',display:'inline-flex',alignItems:'center',gap:'6px',background:golfColor,color:'#fff',padding:'8px 18px',borderRadius:'8px',fontSize:'12px',fontWeight:700}}>
                + {lang==='pt'?'Criar Plano de Golfe':'Create Golf Plan'}
              </div>
            </div>

            {/* Gym */}
            <div style={{background:'#eafff0',border:`2px solid ${gymColor}`,borderRadius:'14px',padding:'24px',cursor:'pointer'}}
              onClick={()=>{setWizardType('gym');setWizard(true);setWizardStep(1);setWizardActiveDays([1,3]);setWizardDayPlans({});setWizardNote('')}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'50%',background:gymColor,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M6 4v16M18 4v16M3 9h3M18 9h3M3 15h3M18 15h3M6 9h12v6H6z"/></svg>
                </div>
                <div>
                  <div style={{fontSize:'9px',letterSpacing:'2px',color:gymColor,fontWeight:700,marginBottom:'2px'}}>COACH GYM</div>
                  <div style={{fontSize:'16px',fontWeight:800,color:gymDark}}>Gym Plan</div>
                </div>
              </div>
              <div style={{fontSize:'13px',color:'#27500A',lineHeight:1.5}}>{lang==='pt'?'Define exercícios, séries, reps e carga do plano de ginásio':'Define exercises, sets, reps and load for the gym plan'}</div>
              <div style={{marginTop:'14px',display:'inline-flex',alignItems:'center',gap:'6px',background:gymColor,color:'#fff',padding:'8px 18px',borderRadius:'8px',fontSize:'12px',fontWeight:700}}>
                + {lang==='pt'?'Criar Plano de Ginásio':'Create Gym Plan'}
              </div>
            </div>
          </div>

          {/* Current week plan overview */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
            <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
              <button onClick={()=>setWeekOffset(w=>w-1)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'6px 10px',cursor:'pointer',fontFamily:F}}>‹</button>
              <div style={{fontSize:'13px',fontWeight:600,color:t.text,minWidth:'150px',textAlign:'center'}}>{formatWeek(weekStart)}</div>
              <button onClick={()=>setWeekOffset(w=>w+1)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'6px 10px',cursor:'pointer',fontFamily:F}}>›</button>
              <button onClick={()=>setWeekOffset(0)} style={{background:isCurrentWeek?'#eaf4ff':'transparent',border:`1px solid ${isCurrentWeek?golfColor:t.border}`,borderRadius:'6px',color:isCurrentWeek?golfColor:t.textMuted,padding:'6px 10px',cursor:'pointer',fontFamily:F,fontSize:'11px'}}>
                {lang==='pt'?'HOJE':'TODAY'}
              </button>
            </div>
          </div>

          {/* Day grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'5px',marginBottom:'16px'}}>
            {DAYS_SHORT.map((d,i)=>{
              const gSess = (golfPlan?.days||[])[i]?.sessions||[]
              const gymSess = (gymPlan?.days||[])[i]?.sessions||[]
              const hasComp = dayHasComp(i)
              const isSelected = selectedDay===i
              const isToday = i===todayIdx
              return (
                <div key={i} onClick={()=>setSelectedDay(i)}
                  style={{background:isSelected?'#eaf4ff':t.surface,border:`1px solid ${isSelected?golfColor:hasComp?'#BA7517':t.border}`,borderRadius:'8px',padding:'9px 4px',textAlign:'center',cursor:'pointer'}}>
                  <div style={{fontSize:'9px',letterSpacing:'2px',color:isSelected?golfColor:isToday?t.text:t.textMuted,marginBottom:'5px',fontWeight:600}}>{d}</div>
                  {hasComp && <div style={{fontSize:'8px',color:'#854F0B',fontWeight:700}}>comp</div>}
                  {!hasComp && !gSess.length && !gymSess.length && <div style={{fontSize:'9px',color:t.border}}>—</div>}
                  {gSess.length>0 && <div style={{fontSize:'8px',color:golfColor,fontWeight:700,marginBottom:'1px'}}>Golf ×{gSess.length}</div>}
                  {gymSess.length>0 && <div style={{fontSize:'8px',color:gymColor,fontWeight:700}}>Gym ×{gymSess.length}</div>}
                </div>
              )
            })}
          </div>

          {/* Selected day detail */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <div style={{fontSize:'15px',fontWeight:800,color:t.text}}>{DAYS_LONG[selectedDay]}</div>
            {selectedDay===todayIdx && <div style={{fontSize:'9px',color:golfColor,letterSpacing:'2px',fontWeight:600}}>{lang==='pt'?'HOJE':'TODAY'}</div>}
          </div>

          {/* Golf sessions */}
          {(dayData('golf').sessions||[]).map((session,si)=>(
            <div key={si} style={{...card,borderLeft:`3px solid ${golfColor}`,marginBottom:'10px'}}>
              <div style={{fontSize:'8px',letterSpacing:'3px',color:golfColor,marginBottom:'8px',fontWeight:600}}>GOLF · {session.cat?.toUpperCase()}</div>
              {session.notes && <div style={{fontSize:'12px',color:t.textMuted,marginBottom:'8px'}}>{session.notes}</div>}
              {(session.items||[]).map((item,ii)=>(
                <div key={ii} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:ii<session.items.length-1?`1px solid ${t.border}`:'none'}}>
                  <div style={{fontSize:'13px',fontWeight:600,color:t.text}}>{item.name}</div>
                  <div style={{fontSize:'12px',color:t.textMuted}}>{item.qty||'—'} {lang==='pt'?'bolas':'balls'}</div>
                </div>
              ))}
            </div>
          ))}
          {/* Gym sessions */}
          {(dayData('gym').sessions||[]).map((session,si)=>(
            <div key={si} style={{...card,borderLeft:`3px solid ${gymColor}`,marginBottom:'10px'}}>
              <div style={{fontSize:'8px',letterSpacing:'3px',color:gymColor,marginBottom:'8px',fontWeight:600}}>GYM · {session.cat?.toUpperCase()}</div>
              {session.notes && <div style={{fontSize:'12px',color:t.textMuted,marginBottom:'8px'}}>{session.notes}</div>}
              {(session.items||[]).map((item,ii)=>(
                <div key={ii} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:ii<session.items.length-1?`1px solid ${t.border}`:'none'}}>
                  <div style={{fontSize:'13px',fontWeight:600,color:t.text}}>{item.name}</div>
                  <div style={{fontSize:'12px',color:t.textMuted}}>{item.sets||'—'}×{item.reps||'—'}{item.load?' @ '+item.load+'kg':''}</div>
                </div>
              ))}
            </div>
          ))}
          {!dayData('golf').sessions?.length && !dayData('gym').sessions?.length && !dayHasComp(selectedDay) && (
            <div style={{...card,textAlign:'center',padding:'40px',color:t.textMuted,fontSize:'13px'}}>{lang==='pt'?'Sem sessões planeadas para este dia.':'No sessions planned for this day.'}</div>
          )}
          {dayHasComp(selectedDay) && (
            <div style={{...card,borderLeft:'3px solid #BA7517',padding:'14px 18px'}}>
              <div style={{fontSize:'8px',letterSpacing:'3px',color:'#854F0B',fontWeight:600}}>{lang==='pt'?'COMPETIÇÃO':'COMPETITION'}</div>
            </div>
          )}
        </div>
      )}

      {/* ── RECORD WHAT YOU DID ── */}
      {subTab==='log' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'8px'}}>
            <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
              <button onClick={()=>setWeekOffset(w=>w-1)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'6px 10px',cursor:'pointer',fontFamily:F}}>‹</button>
              <div style={{fontSize:'13px',fontWeight:600,color:t.text,minWidth:'150px',textAlign:'center'}}>{formatWeek(weekStart)}</div>
              <button onClick={()=>setWeekOffset(w=>w+1)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'6px 10px',cursor:'pointer',fontFamily:F}}>›</button>
              <button onClick={()=>setWeekOffset(0)} style={{background:isCurrentWeek?'#eaf4ff':'transparent',border:`1px solid ${isCurrentWeek?golfColor:t.border}`,borderRadius:'6px',color:isCurrentWeek?golfColor:t.textMuted,padding:'6px 10px',cursor:'pointer',fontFamily:F,fontSize:'11px'}}>{lang==='pt'?'HOJE':'TODAY'}</button>
            </div>
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              {prog.total>0 && (
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <div style={{height:'3px',width:'80px',background:t.border,borderRadius:'2px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${prog.pct}%`,background:prog.pct===100?gymColor:golfColor,borderRadius:'2px'}}/>
                  </div>
                  <div style={{fontSize:'12px',fontWeight:900,color:prog.pct===100?gymColor:golfColor}}>{prog.pct}%</div>
                </div>
              )}
              <button onClick={()=>setShowFreeSession(true)}
                style={{background:'transparent',border:`1px solid ${golfColor}`,borderRadius:'8px',color:golfColor,padding:'7px 14px',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:F}}>
                + {lang==='pt'?'Fui ao campo':'Course session'}
              </button>
            </div>
          </div>

          {/* Day grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'5px',marginBottom:'16px'}}>
            {DAYS_SHORT.map((d,i)=>{
              const dayD = combinedDays[i]||{sessions:[]}
              const doneEx = dayD.sessions?.reduce((a,s)=>a+(s.items?.filter(e=>e.done).length||0),0)||0
              const totalEx = dayD.sessions?.reduce((a,s)=>a+(s.items?.length||0),0)||0
              const isSelected = selectedDay===i
              const isToday = i===todayIdx
              return (
                <div key={i} onClick={()=>setSelectedDay(i)}
                  style={{background:isSelected?'#eaf4ff':t.surface,border:`1px solid ${isSelected?golfColor:dayD.sessions?.length?golfColor+'44':t.border}`,borderRadius:'8px',padding:'9px 4px',textAlign:'center',cursor:'pointer'}}>
                  <div style={{fontSize:'9px',letterSpacing:'2px',color:isSelected?golfColor:isToday?t.text:t.textMuted,marginBottom:'5px',fontWeight:600}}>{d}</div>
                  {!dayD.sessions?.length && <div style={{fontSize:'9px',color:t.border}}>—</div>}
                  {totalEx>0 && <div style={{fontSize:'14px',fontWeight:900,color:doneEx===totalEx?gymColor:t.text,lineHeight:1}}>{doneEx}/{totalEx}</div>}
                  {dayD.sessions?.length>0 && totalEx===0 && <div style={{fontSize:'9px',color:golfColor,fontWeight:600}}>{lang==='pt'?'livre':'free'}</div>}
                </div>
              )
            })}
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <div style={{fontSize:'15px',fontWeight:800,color:t.text}}>{DAYS_LONG[selectedDay]}</div>
            {selectedDay===todayIdx && <div style={{fontSize:'9px',color:golfColor,letterSpacing:'2px',fontWeight:600}}>{lang==='pt'?'HOJE':'TODAY'}</div>}
          </div>

          {!combinedDays[selectedDay]?.sessions?.length ? (
            <div style={{...card,textAlign:'center',padding:'40px',color:t.textMuted,fontSize:'13px',marginBottom:'12px'}}>
              {lang==='pt'?'Sem sessões planeadas. Podes registar uma sessão de campo.':'No sessions planned. You can log a course session.'}
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'12px'}}>
              {(combinedDays[selectedDay]?.sessions||[]).map((session,si)=>{
                const type = session._type||(GOLF_CATS.includes(session.cat)?'golf':'gym')
                const color = type==='golf'?golfColor:gymColor
                const plan = type==='golf'?golfPlan:gymPlan
                const realSi = plan?.days?.[selectedDay]?.sessions?.findIndex(s=>s.id===session.id)??si
                return (
                  <div key={si} style={{...card,borderLeft:`3px solid ${color}`}}>
                    <div style={{marginBottom:'10px'}}>
                      <div style={{fontSize:'8px',letterSpacing:'3px',color:color,marginBottom:'2px',fontWeight:600}}>{type.toUpperCase()}{session.free?' · '+(lang==='pt'?'CAMPO':'COURSE'):''}</div>
                      {session.notes && <div style={{fontSize:'12px',color:t.textMuted}}>{session.notes}</div>}
                      {session.score && <div style={{fontSize:'13px',fontWeight:700,color:t.text,marginTop:'2px'}}>Score: {session.score}{session.holes?' ('+session.holes+'h)':''}</div>}
                    </div>
                    {(!session.items||!session.items.length) && <div style={{fontSize:'12px',color:t.textMuted,fontStyle:'italic'}}>{lang==='pt'?'Sessão registada.':'Session logged.'}</div>}
                    <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                      {(session.items||[]).map((item,ii)=>(
                        <div key={ii} style={{background:t.bg,border:`1px solid ${item.done?gymColor+'44':t.border}`,borderRadius:'8px',padding:'9px 12px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:(!item.done&&type==='gym')?'8px':'0'}}>
                            <button onClick={()=>toggleDone(realSi,ii,type)}
                              style={{width:'26px',height:'26px',borderRadius:'6px',border:`2px solid ${item.done?gymColor:t.border}`,background:item.done?gymColor:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#000',fontWeight:900,fontSize:'13px',flexShrink:0}}>
                              {item.done?'✓':''}
                            </button>
                            <div style={{flex:1}}>
                              <div style={{fontSize:'13px',fontWeight:600,color:item.done?t.textMuted:t.text,textDecoration:item.done?'line-through':'none'}}>{item.name}</div>
                              <div style={{fontSize:'10px',color:t.textMuted,marginTop:'1px'}}>
                                {type==='golf' ? `${item.qty||'—'} ${lang==='pt'?'bolas':'balls'}` : `${item.sets||'—'}×${item.reps||'—'}${item.load?' @ '+item.load+'kg':''}`}
                              </div>
                            </div>
                            {item.done && <div style={{fontSize:'9px',fontWeight:700,color:gymColor,letterSpacing:'1px'}}>{lang==='pt'?'FEITO':'DONE'}</div>}
                          </div>
                          {!item.done && type==='gym' && (
                            <div style={{display:'flex',gap:'6px',paddingLeft:'36px'}}>
                              <input placeholder={`Sets (${item.sets})`} value={item.sets_actual||''} onChange={async e=>{const d=JSON.parse(JSON.stringify(gymPlan?.days||[]));const it=d[selectedDay]?.sessions?.[realSi]?.items?.[ii];if(it){it.sets_actual=e.target.value;await savePlan(d,'gym')}}} style={{...smInp,width:'100px'}}/>
                              <input placeholder={`Reps (${item.reps})`} value={item.reps_actual||''} onChange={async e=>{const d=JSON.parse(JSON.stringify(gymPlan?.days||[]));const it=d[selectedDay]?.sessions?.[realSi]?.items?.[ii];if(it){it.reps_actual=e.target.value;await savePlan(d,'gym')}}} style={{...smInp,width:'100px'}}/>
                              <input placeholder={`kg (${item.load||'—'})`} value={item.load_actual||''} onChange={async e=>{const d=JSON.parse(JSON.stringify(gymPlan?.days||[]));const it=d[selectedDay]?.sessions?.[realSi]?.items?.[ii];if(it){it.load_actual=e.target.value;await savePlan(d,'gym')}}} style={{...smInp,width:'90px'}}/>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={card}>
            <div style={{fontSize:'8px',letterSpacing:'3px',color:t.textMuted,marginBottom:'8px',fontWeight:600}}>{lang==='pt'?'NOTA DO DIA':'DAY NOTE'}</div>
            <textarea value={athleteNote} onChange={e=>setAthleteNote(e.target.value)} placeholder={lang==='pt'?'Como correu? Como te sentiste?':'How did it go? How did you feel?'} style={{...inp,minHeight:'64px',resize:'vertical'}}/>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:'8px'}}>
              <button onClick={async()=>{const p=golfPlan||gymPlan;if(p)await supabase.from('training_plans').update({athlete_notes:athleteNote,updated_at:new Date().toISOString()}).eq('id',p.id)}}
                style={{background:golfColor,border:'none',borderRadius:'8px',color:'#fff',padding:'8px 20px',cursor:'pointer',fontSize:'13px',fontWeight:700,fontFamily:F}}>
                {lang==='pt'?'Guardar':'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TRACK PROGRESS ── */}
      {subTab==='progress' && (() => {
        const allSessions = plans.flatMap(p=>(p.days||[]).flatMap((d,di)=>(d?.sessions||[]).map(s=>({...s,plan_type:p.plan_type}))))
        const catCounts = {}
        allSessions.forEach(s=>{ if(s.cat) catCounts[s.cat]=(catCounts[s.cat]||0)+1 })
        const gTotal = GOLF_CATS.reduce((a,c)=>a+(catCounts[c]||0),0)
        const gymTotal = GYM_CATS.reduce((a,c)=>a+(catCounts[c]||0),0)
        const weekCounts = Array(12).fill(0).map((_,i)=>{
          const ws = getWeekStart(-(11-i))
          return plans.filter(p=>p.week_start===ws).reduce((a,p)=>a+(p.days||[]).reduce((b,d)=>b+(d?.sessions?.length||0),0),0)
        })
        return (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'14px'}}>
              {[{l:'TOTAL',v:allSessions.length,c:t.text},{l:'GOLF',v:allSessions.filter(s=>s.plan_type==='golf').length,c:golfColor},{l:lang==='pt'?'GINÁSIO':'GYM',v:allSessions.filter(s=>s.plan_type==='gym').length,c:gymColor},{l:lang==='pt'?'SEMANAS':'WEEKS',v:plans.length,c:t.textMuted}].map(item=>(
                <div key={item.l} style={card}>
                  <div style={{fontSize:'8px',letterSpacing:'2px',color:t.textMuted,marginBottom:'8px',fontWeight:600}}>{item.l}</div>
                  <div style={{fontSize:'28px',fontWeight:900,color:item.c,lineHeight:1,letterSpacing:'-1px'}}>{item.v}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
              {[[lang==='pt'?'GOLFE':'GOLF',GOLF_CATS,gTotal,golfColor],[lang==='pt'?'GINÁSIO':'GYM',GYM_CATS,gymTotal,gymColor]].map(([title,catList,total,color])=>(
                <div key={title} style={card}>
                  <div style={{fontSize:'8px',letterSpacing:'3px',color:color,marginBottom:'12px',fontWeight:600}}>{title}</div>
                  {catList.map(cat=>{
                    const count=catCounts[cat]||0
                    const pct=total>0?Math.round((count/total)*100):0
                    return <div key={cat} style={{marginBottom:'8px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                        <div style={{fontSize:'11px',color:t.textMuted}}>{cat}</div>
                        <div style={{fontSize:'11px',color:color,fontWeight:700}}>{count}</div>
                      </div>
                      <div style={{height:'3px',background:t.border,borderRadius:'2px',overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:'2px'}}/>
                      </div>
                    </div>
                  })}
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{fontSize:'8px',letterSpacing:'3px',color:t.textMuted,marginBottom:'12px',fontWeight:600}}>{lang==='pt'?'VOLUME — ÚLTIMAS 12 SEMANAS':'VOLUME — LAST 12 WEEKS'}</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:'4px',height:'70px'}}>
                {weekCounts.map((n,i)=>(
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
                    {n>0 && <div style={{fontSize:'9px',color:t.textMuted}}>{n}</div>}
                    <div style={{width:'100%',height:`${Math.max(n*12,n>0?4:0)}px`,minHeight:n>0?'4px':'1px',background:n>=5?golfColor:n>=3?golfColor+'66':n>0?golfColor+'33':t.border,borderRadius:'3px 3px 0 0'}}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
