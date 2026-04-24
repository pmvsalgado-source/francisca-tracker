import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const COACH_GOLF = 'pmvsalgado@gmail.com'
const COACH_GYM  = 'pmvsalgado@gmail.com'
const ADMIN      = 'pmvsalgado@gmail.com'

const GOLF_CATS = ['Driving Range', 'Jogo Curto', 'Putt', 'Bunker', 'Campo']
const GYM_CATS  = ['Pernas', 'Potência', 'Core', 'Braços', 'Mobilidade', 'Cardio', 'Prevenção']
const F = "'Inter', system-ui, sans-serif"
const golfColor = '#378ADD'
const gymColor  = '#52E8A0'
const golfDark  = '#0C447C'
const gymDark   = '#27500A'

const GOLF_LIBRARY = [
  { id:'g0',  name:'Aquecimento — pitch shots',   cat:'Driving Range', desc:'9-ferro meio swing a crescer, foco em contacto e ritmo', default_qty:20 },
  { id:'g1',  name:'Ladder drill — wedges',        cat:'Driving Range', desc:'Mudar alvo a cada batimento: PW 60→80m, SW 50→70m, LW 40→60m', default_qty:30 },
  { id:'g2',  name:'Wedge gapping',               cat:'Driving Range', desc:'10 bolas por distância em incrementos de 10m (30→90m)', default_qty:40 },
  { id:'g3',  name:'Tiro alto vs tiro baixo',     cat:'Driving Range', desc:'Mesma distância, variar trajectória com cada wedge', default_qty:20 },
  { id:'g4',  name:'Finish completo vs curto',    cat:'Driving Range', desc:'Alternar finish completo e finish curto com cada wedge', default_qty:20 },
  { id:'g5',  name:'Clock-face drill',            cat:'Driving Range', desc:'9h (curto), 12h (médio), 3h (longo) com wedge', default_qty:15 },
  { id:'g6',  name:'3 fades + 3 draws por ferro', cat:'Driving Range', desc:'Chamada do tiro antes de bater, todos os ferros', default_qty:30 },
  { id:'g7',  name:'Ferros pares',                cat:'Driving Range', desc:'8, 6, 4 ferro — foco em ball flight consistente', default_qty:30 },
  { id:'g8',  name:'Ferros ímpares',              cat:'Driving Range', desc:'9, 7, 5, 3 ferro — foco em ball flight consistente', default_qty:30 },
  { id:'g9',  name:'Mesmo clube, alvos diferentes', cat:'Driving Range', desc:'Ex: 5-ferro a 200, 175, 150, 125, 100m em escada', default_qty:25 },
  { id:'g10', name:'Gate drill — ferros',         cat:'Driving Range', desc:'Dois tees como corredor para corrigir swing path', default_qty:20 },
  { id:'g11', name:'Coin drill',                  cat:'Driving Range', desc:'Moeda à frente da bola, bater a moeda no impact', default_qty:20 },
  { id:'g12', name:'9-shot drill',                cat:'Driving Range', desc:'Baixo/médio/alto × fade/straight/draw — 9 combinações', default_qty:27 },
  { id:'g13', name:'Madeira 3 — fades altas',     cat:'Driving Range', desc:'Bola ao chão, fade alta para parar suave no green', default_qty:15 },
  { id:'g14', name:'Madeira 3 — draws compridas', cat:'Driving Range', desc:'Tee baixo, virar a bola para maximizar distância', default_qty:15 },
  { id:'g15', name:'Driver — fairway imaginário',  cat:'Driving Range', desc:'Fairway de 50m, registar: dentro / miss esq / miss dir', default_qty:20 },
  { id:'g16', name:'Driver — pontuação',           cat:'Driving Range', desc:'1pt ferro, 2pt madeira, 3pt driver, -1pt fora', default_qty:15 },
  { id:'g17', name:'Driver — simulação de volta',  cat:'Driving Range', desc:'9 buracos do próximo torneio pelo scorecard no range', default_qty:9 },
  { id:'g18', name:'Escada de velocidade',         cat:'Driving Range', desc:'50% → 75% → 100% velocidade, foco em equilíbrio no finish', default_qty:24 },
  { id:'g19', name:'Velocidade máxima',            cat:'Driving Range', desc:'Série de velocidade máxima, finish completo obrigatório', default_qty:20 },
  { id:'g20', name:'Pause drill',                  cat:'Driving Range', desc:'Pausa 1-2s no topo do backswing antes de soltar', default_qty:20 },
  { id:'g21', name:'Clube com peso',               cat:'Driving Range', desc:'Aumentar velocidade de swing com clube mais pesado', default_qty:20 },
  { id:'g26', name:'Ladder drill — pitching',      cat:'Jogo Curto', desc:'Mudar alvo a cada batimento, 30 a 80m', default_qty:30 },
  { id:'g27', name:'3 comprimentos de swing',      cat:'Jogo Curto', desc:'½ swing, ¾ swing, completo — medir distância de cada', default_qty:27 },
  { id:'g28', name:'Wedges parciais aleatórios',   cat:'Jogo Curto', desc:'Distâncias aleatórias, simular situações de campo', default_qty:20 },
  { id:'g29', name:'Landing zone drill',           cat:'Jogo Curto', desc:'Toalha ou arco no green como zona de ateragem', default_qty:20 },
  { id:'g30', name:'Tee drill — pitching',         cat:'Jogo Curto', desc:'Tee à frente da bola, bater bola e depois tee', default_qty:20 },
  { id:'g31', name:'Drop & repeat',               cat:'Jogo Curto', desc:'Várias bolas no mesmo sítio, repetir mesmo chip até encaixar', default_qty:20 },
  { id:'g32', name:'Par 18',                       cat:'Jogo Curto', desc:'9 posições em redor do green, par 2 cada, contar score', default_qty:18 },
  { id:'g33', name:'Jogo de pontuação',            cat:'Jogo Curto', desc:'1 bola, chip e putt fora, registar score', default_qty:9 },
  { id:'g34', name:'Clock drill — chip',           cat:'Jogo Curto', desc:'12 posições em redor do buraco como horas de relógio', default_qty:12 },
  { id:'g35', name:'Hula hoop drill',              cat:'Jogo Curto', desc:'Aro no green como zona alvo, contar bolas dentro', default_qty:20 },
  { id:'g36', name:'HORSE — chip',                cat:'Jogo Curto', desc:'Com parceiro: cada um propõe o chip, quem falha fica com letra', default_qty:10 },
  { id:'g37', name:'Bump-and-run com híbrido',     cat:'Jogo Curto', desc:'Rolar a bola como se fosse putt longo', default_qty:15 },
  { id:'g38', name:'Braço líder — chip',           cat:'Jogo Curto', desc:'Chip só com braço da frente, eliminar flip de pulso', default_qty:15 },
  { id:'g39', name:'Pé traseiro elevado',          cat:'Jogo Curto', desc:'Levantar pé de trás para forçar peso na frente', default_qty:15 },
  { id:'g46', name:'50 putts de 1m',              cat:'Putt', desc:'Fazer 50 putts seguidos, não parar se falhar', default_qty:50 },
  { id:'g47', name:'Clock drill — putt',           cat:'Putt', desc:'12 bolas em redor do buraco a 1m, fazer todas seguidas', default_qty:12 },
  { id:'g48', name:'5 seguidos',                   cat:'Putt', desc:'5 bolas a 1m, fazer 5 seguidas — se falhar recomeça', default_qty:5 },
  { id:'g49', name:'100 putts diretos',            cat:'Putt', desc:'100 putts de 1m, contar quantas tentativas', default_qty:100 },
  { id:'g50', name:'Gate drill — putt',            cat:'Putt', desc:'Dois tees como corredor para putter, treinar linha de saída', default_qty:20 },
  { id:'g51', name:'Jogo de birdie',               cat:'Putt', desc:'10 putts de 3m como birdie, se falha putt de par obrigatório', default_qty:10 },
  { id:'g52', name:'9 buracos no green',           cat:'Putt', desc:'9 buracos no green, registar putts por buraco', default_qty:9 },
  { id:'g53', name:'HORSE — putt',                cat:'Putt', desc:'Com parceiro, alternância de putts difíceis', default_qty:10 },
  { id:'g54', name:'Ladder drill — lag',           cat:'Putt', desc:'Tees a 3m, 4.5m, 6m, 9m — putt de cada, dentro de 30cm', default_qty:16 },
  { id:'g55', name:'Desafio 2-putt',              cat:'Putt', desc:'9 putts acima de 6m, obrigação de fazer 2-putt em todos', default_qty:9 },
  { id:'g56', name:'Manilla folder',              cat:'Putt', desc:'Parar a bola em cima de pasta a 2m do buraco', default_qty:15 },
  { id:'g57', name:'Drawback drill',              cat:'Putt', desc:'Putt falhado → recuar um comprimento de clube e repetir', default_qty:10 },
  { id:'g58', name:'Tripwire drill',              cat:'Putt', desc:'Flagstick atrás do buraco, chegar ao buraco sem tocar', default_qty:10 },
  { id:'g59', name:'Putt com uma mão',            cat:'Putt', desc:'Mão dominante só, feel do putter e estabilidade', default_qty:20 },
  { id:'g60', name:'Putt de olhos fechados',      cat:'Putt', desc:'Treinar feel e ritmo sem ver a linha', default_qty:10 },
  { id:'g61', name:'Olhar para o buraco',         cat:'Putt', desc:'Olhar para o buraco em vez de para a bola', default_qty:10 },
  { id:'g40', name:'Linhas na areia',             cat:'Bunker', desc:'Duas linhas paralelas, entrar na areia entre elas', default_qty:15 },
  { id:'g41', name:'Towel drill — bunker',        cat:'Bunker', desc:'Toalha a 1m do buraco, aterrar dentro da toalha', default_qty:15 },
  { id:'g42', name:'15 saídas para pin variável', cat:'Bunker', desc:'Coach muda posição do pin após cada saída', default_qty:15 },
  { id:'g43', name:'Bola enterrada — saída',      cat:'Bunker', desc:'Bola enterrada, praticar saída de lies difíceis', default_qty:10 },
  { id:'g44', name:'Trajectória alta vs baixa',   cat:'Bunker', desc:'Saídas altas vs baixas do mesmo bunker', default_qty:10 },
  { id:'g45', name:'Clock drill — bunker',        cat:'Bunker', desc:'12 ângulos diferentes à volta do bunker', default_qty:12 },
  { id:'g22', name:'Ronda completa — score',      cat:'Campo', desc:'18 buracos, jogar para resultado', default_qty:18 },
  { id:'g23', name:'9 buracos — score',           cat:'Campo', desc:'9 buracos competitivo, pre-shot routine em cada batimento', default_qty:9 },
  { id:'g24', name:'Ronda prática',               cat:'Campo', desc:'Bola extra onde necessário para trabalhar pontos fracos', default_qty:18 },
  { id:'g25', name:'Gestão de campo',             cat:'Campo', desc:'Foco em decisões: clube, trajectória, quando arriscar', default_qty:9 },
]

const GYM_LIBRARY = [
  { id:'e1',  name:'Trap Bar Deadlift',           cat:'Pernas',     desc:'Força máxima, técnica primeiro', default_sets:4, default_reps:5 },
  { id:'e2',  name:'Squat',                       cat:'Pernas',     desc:'Barra, goblet ou peso corporal', default_sets:4, default_reps:6 },
  { id:'e3',  name:'Leg Press',                   cat:'Pernas',     desc:'Bilateral, foco em amplitude total', default_sets:3, default_reps:12 },
  { id:'e4',  name:'Split Squat',                 cat:'Pernas',     desc:'Cada perna em separado', default_sets:3, default_reps:10 },
  { id:'e5',  name:'Single Leg Press',            cat:'Pernas',     desc:'Unilateral, 12 reps cada perna', default_sets:3, default_reps:12 },
  { id:'e6',  name:'Pistol Squat',                cat:'Pernas',     desc:'Com suporte se necessário', default_sets:3, default_reps:6 },
  { id:'e7',  name:'Hip Hinge / RDL',             cat:'Pernas',     desc:'Romanian deadlift, foco em glúteos e isquiotibiais', default_sets:3, default_reps:12 },
  { id:'e8',  name:'Hip Thrust',                  cat:'Pernas',     desc:'Barra ou banda, foco em glúteos', default_sets:3, default_reps:12 },
  { id:'e9',  name:'Jump Squat',                  cat:'Pernas',     desc:'Explosivo, aterragem suave e controlada', default_sets:3, default_reps:8 },
  { id:'e10', name:'Box Jump',                    cat:'Pernas',     desc:'Altura progressiva, foco em aterragem estável', default_sets:3, default_reps:6 },
  { id:'e11', name:'Lunge',                       cat:'Pernas',     desc:'À frente ou reverso, peso corporal ou halteres', default_sets:3, default_reps:12 },
  { id:'e12', name:'Bulgarian Split Squat',       cat:'Pernas',     desc:'Pé traseiro elevado, amplitude máxima', default_sets:3, default_reps:10 },
  { id:'e13', name:"Bowler's Squat",              cat:'Pernas',     desc:'Equilíbrio e força unilateral', default_sets:3, default_reps:10 },
  { id:'e14', name:'Lateral Band Walk',           cat:'Pernas',     desc:'Banda à volta dos joelhos, passo lateral', default_sets:3, default_reps:15 },
  { id:'e15', name:'Med Ball Slam',               cat:'Potência',   desc:'Slam no chão com força máxima, reset controlado', default_sets:3, default_reps:8 },
  { id:'e16', name:'Med Ball Rotational Throw',   cat:'Potência',   desc:'Throw rotacional contra parede, simular padrão de swing', default_sets:3, default_reps:8 },
  { id:'e17', name:'Med Ball Chest Pass',         cat:'Potência',   desc:'Passe explosivo contra parede', default_sets:3, default_reps:8 },
  { id:'e18', name:'Cable Chop',                  cat:'Potência',   desc:'Alto para baixo, rotação do tronco', default_sets:3, default_reps:12 },
  { id:'e19', name:'Cable Lift',                  cat:'Potência',   desc:'Baixo para alto, rotação do tronco', default_sets:3, default_reps:12 },
  { id:'e20', name:'Resistance Band Rotation',    cat:'Potência',   desc:'Simular padrão de swing com banda elástica', default_sets:3, default_reps:12 },
  { id:'e21', name:'Kettlebell Swing',            cat:'Potência',   desc:'Hip hinge explosivo, não squat — foco em glúteos', default_sets:3, default_reps:10 },
  { id:'e22', name:'Landmine Rotation',           cat:'Potência',   desc:'Rotação com barra em landmine', default_sets:3, default_reps:10 },
  { id:'e23', name:'Plank',                       cat:'Core',       desc:'Posição neutra, glúteos activos, respirar', default_sets:3, default_reps:45 },
  { id:'e24', name:'Side Plank',                  cat:'Core',       desc:'Cada lado, corpo em linha recta', default_sets:3, default_reps:30 },
  { id:'e25', name:'Dead Bug',                    cat:'Core',       desc:'Controlo motor, lento e preciso', default_sets:3, default_reps:10 },
  { id:'e26', name:'Bird Dog',                    cat:'Core',       desc:'Estabilidade lombar, sem rotação da anca', default_sets:3, default_reps:10 },
  { id:'e27', name:'Pallof Press',                cat:'Core',       desc:'Anti-rotação, cada lado, cabo ou banda', default_sets:3, default_reps:12 },
  { id:'e28', name:'Ab Wheel Rollout',            cat:'Core',       desc:'Extensão controlada, não deixar a lombar ceder', default_sets:3, default_reps:8 },
  { id:'e29', name:'Hanging Leg Raise',           cat:'Core',       desc:'Barra, elevar joelhos ou pernas estendidas', default_sets:3, default_reps:10 },
  { id:'e30', name:'McGill Big 3',                cat:'Core',       desc:'Modified curl-up + bird dog + side plank', default_sets:2, default_reps:10 },
  { id:'e31', name:'TRX Row',                     cat:'Braços',     desc:'Costas e bíceps, corpo em linha recta', default_sets:3, default_reps:12 },
  { id:'e32', name:'Push-up',                     cat:'Braços',     desc:'Tronco estável, ritmo controlado', default_sets:3, default_reps:15 },
  { id:'e33', name:'Dumbbell Press',              cat:'Braços',     desc:'Overhead ou peito, halteres', default_sets:3, default_reps:10 },
  { id:'e34', name:'Cable Row',                   cat:'Braços',     desc:'Puxar para o cinto, cotovelos junto ao corpo', default_sets:3, default_reps:12 },
  { id:'e35', name:'Bicep Curl',                  cat:'Braços',     desc:'Halteres ou barra, sem balanço do tronco', default_sets:3, default_reps:12 },
  { id:'e36', name:'Tricep Extension',            cat:'Braços',     desc:'Cabo ou haltere overhead', default_sets:3, default_reps:12 },
  { id:'e37', name:'1-Arm Overhead Press',        cat:'Braços',     desc:'Unilateral, estabilidade do core obrigatória', default_sets:3, default_reps:10 },
  { id:'e38', name:'Scapular Strengthening',      cat:'Braços',     desc:'Exercício prone com banda ou haltere', default_sets:3, default_reps:15 },
  { id:'e39', name:"Golfer's Diagonal Pattern",   cat:'Braços',     desc:'Diagonal low-to-high e high-to-low com banda', default_sets:3, default_reps:12 },
  { id:'e40', name:'Rotação Torácica',            cat:'Mobilidade', desc:'Cada lado, lento e controlado', default_sets:2, default_reps:15 },
  { id:'e41', name:'Hip 90/90',                   cat:'Mobilidade', desc:'Mobilidade da anca, cada posição 2 min', default_sets:1, default_reps:5 },
  { id:'e42', name:'Cat-Cow',                     cat:'Mobilidade', desc:'Mobilização da coluna, em 4 apoios', default_sets:2, default_reps:15 },
  { id:'e43', name:'World Greatest Stretch',      cat:'Mobilidade', desc:'Cada lado, 5 reps com pausa', default_sets:2, default_reps:5 },
  { id:'e44', name:'Half-Kneeling Thoracic Rotation', cat:'Mobilidade', desc:'X-factor, separação ombros-ancas', default_sets:2, default_reps:10 },
  { id:'e45', name:'Hip Flexor Stretch',          cat:'Mobilidade', desc:'Cada lado, 60 seg', default_sets:2, default_reps:60 },
  { id:'e46', name:'Shoulder Rotation',           cat:'Mobilidade', desc:'Círculos e rotação interna/externa', default_sets:2, default_reps:10 },
  { id:'e47', name:'Ankle Mobility',              cat:'Mobilidade', desc:'Círculos e dorsiflexão contra parede', default_sets:2, default_reps:10 },
  { id:'e48', name:'Corrida',                     cat:'Cardio',     desc:'Ritmo aeróbico contínuo', default_sets:1, default_reps:20 },
  { id:'e49', name:'Bicicleta',                   cat:'Cardio',     desc:'Aquecimento ou capacidade aeróbica', default_sets:1, default_reps:20 },
  { id:'e50', name:'Remo (ergómetro)',             cat:'Cardio',     desc:'Full body, alternativa à corrida', default_sets:1, default_reps:20 },
  { id:'e51', name:'Jump Rope',                   cat:'Cardio',     desc:'Coordenação e resistência cardiovascular', default_sets:3, default_reps:3 },
  { id:'e52', name:'HIIT',                        cat:'Cardio',     desc:'Intervalos de alta intensidade, 20s on / 40s off', default_sets:6, default_reps:1 },
  { id:'e53', name:'Circuito funcional',          cat:'Cardio',     desc:'5-6 exercícios em sequência sem descanso', default_sets:3, default_reps:1 },
  { id:'e54', name:'Wall Hold',                   cat:'Prevenção',  desc:'Estabilização activa, glúteo médio', default_sets:3, default_reps:30 },
  { id:'e55', name:'Banded External Rotation',    cat:'Prevenção',  desc:'Banda, rotação externa do ombro', default_sets:3, default_reps:15 },
  { id:'e56', name:'Clamshell',                   cat:'Prevenção',  desc:'Banda acima dos joelhos, rotação externa da anca', default_sets:3, default_reps:15 },
  { id:'e57', name:'Single Leg Balance',          cat:'Prevenção',  desc:'30 seg cada perna, olhos abertos depois fechados', default_sets:3, default_reps:30 },
  { id:'e58', name:'Farmers Carry',               cat:'Prevenção',  desc:'40m cada mão, peso controlado', default_sets:3, default_reps:40 },
  { id:'e59', name:'Suitcase Carry',              cat:'Prevenção',  desc:'40m com peso num lado, anti-inclinação', default_sets:3, default_reps:40 },
  { id:'e60', name:'Leopard Crawl',               cat:'Prevenção',  desc:'20 passos cada mão, padrão contralateral', default_sets:3, default_reps:20 },
  { id:'e61', name:'Bear Crawl',                  cat:'Prevenção',  desc:'Joelhos a 5cm do chão, core activo', default_sets:3, default_reps:20 },
]

const DAYS_PT    = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
const DAYS_EN    = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DAYS_SHORT_PT = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM']
const DAYS_SHORT_EN = ['MON','TUE','WED','THU','FRI','SAT','SUN']
const MONTH_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function Training({ theme, t, user, lang = 'en', events = [] }) {
  const [subTab, setSubTab] = useState('plan')
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(() => { const d=new Date().getDay(); return d===0?6:d-1 })

  // Wizard state
  const [wizard, setWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardType, setWizardType] = useState('golf')
  const [wizardActiveDays, setWizardActiveDays] = useState([0,2,4])
  const [wizardDayPlans, setWizardDayPlans] = useState({})
  const [wizardCurrentDay, setWizardCurrentDay] = useState(0)
  const [wizardOpenCat, setWizardOpenCat] = useState(null)
  const [wizardNote, setWizardNote] = useState('')
  const [wizardCustom, setWizardCustom] = useState({ name:'', cat:'', desc:'' })
  const [wizardUserLib, setWizardUserLib] = useState([])
  const [saving, setSaving] = useState(false)

  // Calendar picker state (wizard step 1)
  const [calMonth, setCalMonth] = useState(() => new Date())
  const [selectedDates, setSelectedDates] = useState([])

  // Tooltip
  const [tooltipId, setTooltipId] = useState(null)

  // Athlete log state
  const [showFreeSession, setShowFreeSession] = useState(false)
  const [freeSession, setFreeSession] = useState({ date:new Date().toISOString().split('T')[0], notes:'', score:'', holes:'' })
  const [savingFree, setSavingFree] = useState(false)
  const [athleteNote, setAthleteNote] = useState('')

  const email = (user?.email||'').toLowerCase()
  const isCoach = email === ADMIN || email === COACH_GOLF || email === COACH_GYM

  const DAYS_LONG  = lang==='pt' ? DAYS_PT : DAYS_EN
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

  const dayHasComp = (dayIdx) => {
    const ws = new Date(weekStart+'T12:00:00')
    const d = new Date(ws); d.setDate(ws.getDate() + dayIdx)
    const dateStr = d.toISOString().split('T')[0]
    return (events||[]).some(e => dateStr >= e.start_date && dateStr <= (e.end_date || e.start_date))
  }

  const dateHasEvent = (dateStr) =>
    (events||[]).some(e => dateStr >= e.start_date && dateStr <= (e.end_date || e.start_date))

  const savePlan = async (newDays, type, ws=weekStart) => {
    setSaving(true)
    const existing = plans.find(p=>p.week_start===ws && p.plan_type===type)
    const payload = { week_start:ws, week_end:getWeekEnd(ws), plan_type:type, days:newDays, updated_at:new Date().toISOString(), updated_by:email }
    if (existing) await supabase.from('training_plans').update(payload).eq('id',existing.id)
    else await supabase.from('training_plans').insert({...payload, created_by:email, status:'active', title:`${type==='golf'?'Golf':'Gym'} Plan`})
    setSaving(false)
    fetchPlans()
  }

  // Calendar picker helpers
  const calendarDays = (() => {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
    const lastDate = new Date(year, month+1, 0).getDate()
    const days = []
    for (let i=0; i<firstDow; i++) days.push(null)
    for (let d=1; d<=lastDate; d++) {
      const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      days.push({ day:d, dateStr:ds })
    }
    return days
  })()

  const toggleDate = (dateStr) => {
    const today = new Date(); today.setHours(0,0,0,0)
    if (new Date(dateStr+'T12:00:00') < today) return
    setSelectedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d=>d!==dateStr) : [...prev, dateStr]
    )
  }

  const prevMonth = () => setCalMonth(m => { const d=new Date(m); d.setMonth(m.getMonth()-1); return d })
  const nextMonth = () => setCalMonth(m => { const d=new Date(m); d.setMonth(m.getMonth()+1); return d })

  // Derive active day indices from selected dates
  const activeDayIndicesFromDates = (dates) => {
    const indices = new Set()
    dates.forEach(ds => {
      const dow = new Date(ds+'T12:00:00').getDay()
      indices.add(dow===0?6:dow-1)
    })
    return [...indices].sort((a,b)=>a-b)
  }

  // Wizard drill helpers
  const toggleDrill = (ex) => {
    const key = wizardCurrentDay
    const current = wizardDayPlans[key] || []
    const exists = current.find(i=>i.id===ex.id)
    if (exists) {
      setWizardDayPlans(p=>({...p,[key]:current.filter(i=>i.id!==ex.id)}))
    } else {
      const item = wizardType==='golf'
        ? { ...ex, qty: ex.default_qty || 20 }
        : { ...ex, sets: ex.default_sets||3, reps: ex.default_reps||10, load:'' }
      setWizardDayPlans(p=>({...p,[key]:[...current,item]}))
    }
  }

  const markRestDay = () => {
    const key = wizardCurrentDay
    const restItem = { id:'rest_'+key, name:'Descanso', cat:'Descanso', desc:'Dia de recuperação', isRest:true, qty:0, sets:0, reps:0 }
    setWizardDayPlans(p=>({...p,[key]:[restItem]}))
  }

  const clearRestDay = () => {
    const key = wizardCurrentDay
    setWizardDayPlans(p=>({...p,[key]:[]}))
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

  const addCustom = () => {
    if (!wizardCustom.name) return
    const ex = { id:'c_'+Date.now(), ...wizardCustom, cat: wizardCustom.cat || (wizardType==='golf'?'Driving Range':'Pernas'),
      default_qty:20, default_sets:3, default_reps:10 }
    setWizardUserLib(p=>[...p,ex])
    toggleDrill(ex)
    setWizardCustom({name:'',cat:'',desc:''})
  }

  const saveWizard = async () => {
    setSaving(true)
    // Group selected dates by their week start
    const weekMap = {}
    selectedDates.forEach(dateStr => {
      const d = new Date(dateStr+'T12:00:00')
      const dow = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - (dow===0?6:dow-1))
      monday.setHours(12,0,0,0)
      const ws = monday.toISOString().split('T')[0]
      const dayIdx = dow===0?6:dow-1
      if (!weekMap[ws]) weekMap[ws]=[]
      if (!weekMap[ws].includes(dayIdx)) weekMap[ws].push(dayIdx)
    })
    for (const [ws, dayIdxList] of Object.entries(weekMap)) {
      const newDays = Array(7).fill(null).map(()=>({sessions:[]}))
      dayIdxList.forEach(dayIdx => {
        const items = wizardDayPlans[dayIdx] || []
        if (items.length > 0) {
          if (items[0]?.isRest) {
            newDays[dayIdx].sessions.push({ id:Date.now()+dayIdx, cat:'Descanso', isRest:true, items:[], notes:'' })
          } else {
            newDays[dayIdx].sessions.push({
              id: Date.now()+dayIdx,
              cat: wizardType==='golf' ? 'Driving Range' : 'Ginásio',
              notes: wizardNote,
              items
            })
          }
        }
      })
      await savePlan(newDays, wizardType, ws)
    }
    setSaving(false)
    setWizard(false)
    setWizardStep(1)
    setSelectedDates([])
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
    const dow = dateObj.getDay()
    const dayIdx = dow===0?6:dow-1
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

  const cats    = wizardType==='golf' ? GOLF_CATS : GYM_CATS
  const baseLib = wizardType==='golf' ? GOLF_LIBRARY : GYM_LIBRARY
  const allLib  = [...baseLib, ...wizardUserLib.filter(e=>cats.includes(e.cat))]

  const combinedDays = Array(7).fill(null).map((_,i) => {
    const g  = (golfPlan?.days||[])[i]||{sessions:[]}
    const gy = (gymPlan?.days||[])[i]||{sessions:[]}
    return {sessions:[...(g.sessions||[]).map(s=>({...s,_type:'golf'})), ...(gy.sessions||[]).map(s=>({...s,_type:'gym'}))]}
  })
  const todayIdx = (() => { const d=new Date().getDay(); return d===0?6:d-1 })()
  const dayData = (type) => (type==='golf'?golfPlan:gymPlan)?.days?.[selectedDay] || {sessions:[]}

  const prog = (() => {
    let done=0,total=0
    combinedDays.forEach(d=>d?.sessions?.forEach(s=>s.items?.forEach(i=>{total++;if(i.done)done++})))
    return {done,total,pct:total>0?Math.round((done/total)*100):0}
  })()

  // Mini dashboard: next N sessions from today
  const upcomingSessions = (() => {
    const results = []
    for (let offset=0; offset<=21 && results.length<4; offset++) {
      const d = new Date(); d.setDate(d.getDate()+offset)
      const dow = d.getDay(); const dayIdx = dow===0?6:dow-1
      const monday = new Date(d); monday.setDate(d.getDate()-(dow===0?6:dow-1)); monday.setHours(12,0,0,0)
      const ws = monday.toISOString().split('T')[0]
      const wp = plans.find(p=>p.week_start===ws && p.plan_type==='golf')
      const wg = plans.find(p=>p.week_start===ws && p.plan_type==='gym')
      const gS = (wp?.days||[])[dayIdx]?.sessions||[]
      const gyS = (wg?.days||[])[dayIdx]?.sessions||[]
      if (gS.length||gyS.length) results.push({offset,dayIdx,date:new Date(d),golfSessions:gS,gymSessions:gyS})
    }
    return results
  })()
  const noTrainingNext3 = upcomingSessions.length===0 || upcomingSessions[0]?.offset > 3

  // styles
  const inp  = {background:t.bg,border:`1px solid ${t.border}`,borderRadius:'6px',color:t.text,padding:'7px 10px',fontSize:'13px',fontFamily:F,outline:'none',width:'100%',boxSizing:'border-box'}
  const smInp = {...inp,padding:'5px 8px',fontSize:'12px',width:'auto'}
  const card  = {background:t.surface,border:`1px solid ${t.border}`,borderRadius:'12px',padding:'16px 20px'}
  const typeColor = wizardType==='golf' ? golfColor : gymColor

  // ── WIZARD ─────────────────────────────────────────────────────────────────
  if (wizard) {
    const currentItems = wizardDayPlans[wizardCurrentDay] || []
    const isRestDay    = currentItems[0]?.isRest === true
    const dayDone      = (d) => (wizardDayPlans[d]||[]).length > 0
    const totalBalls   = currentItems.filter(i=>!i.isRest).reduce((a,i)=>a+(parseInt(i.qty)||0),0)

    return (
      <div style={{fontFamily:F,color:t.text}}>
        {/* Wizard header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <div>
            <div style={{fontSize:'9px',letterSpacing:'2px',color:typeColor,fontWeight:600,marginBottom:'3px'}}>
              {wizardType==='golf'?'COACH GOLF':'COACH GYM'} · CRIAR PLANO
            </div>
            <div style={{fontSize:'20px',fontWeight:800,color:t.text}}>Criar Plano</div>
          </div>
          <button onClick={()=>{setWizard(false);setWizardStep(1);setSelectedDates([])}}
            style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'8px 16px',cursor:'pointer',fontSize:'13px',fontFamily:F}}>
            Cancelar
          </button>
        </div>

        {/* Step indicator */}
        <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:'24px'}}>
          {[1,2].map((s,i)=>(
            <div key={s} style={{display:'flex',alignItems:'center',gap:0,flex:i<1?'0 0 auto':1}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{width:'28px',height:'28px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,
                  background:wizardStep>s?gymColor:wizardStep===s?typeColor:t.border,
                  color:wizardStep>=s?'#fff':t.textMuted}}>
                  {wizardStep>s?'✓':s}
                </div>
                <span style={{fontSize:'13px',fontWeight:600,color:wizardStep>=s?t.text:t.textMuted}}>
                  {s===1?'Quando?':'Definir sessões'}
                </span>
              </div>
              {i<1 && <div style={{flex:1,height:'1px',background:t.border,margin:'0 12px',minWidth:'40px'}}/>}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Calendar picker ── */}
        {wizardStep===1 && (
          <div style={card}>
            <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'14px'}}>
              SELECCIONA OS DIAS DE TREINO
            </div>

            {/* Month navigation */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <button onClick={prevMonth} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'6px 12px',cursor:'pointer',fontFamily:F,fontSize:'14px'}}>‹</button>
              <div style={{fontSize:'14px',fontWeight:700,color:t.text}}>
                {MONTH_PT[calMonth.getMonth()]} {calMonth.getFullYear()}
              </div>
              <button onClick={nextMonth} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'6px 12px',cursor:'pointer',fontFamily:F,fontSize:'14px'}}>›</button>
            </div>

            {/* Day-of-week headers */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',marginBottom:'4px'}}>
              {(lang==='pt'?['S','T','Q','Q','S','S','D']:['M','T','W','T','F','S','S']).map((d,i)=>(
                <div key={i} style={{textAlign:'center',fontSize:'9px',letterSpacing:'1px',color:t.textMuted,fontWeight:600,padding:'4px 0'}}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'3px',marginBottom:'14px'}}>
              {calendarDays.map((day,i)=>{
                if (!day) return <div key={i}/>
                const selected = selectedDates.includes(day.dateStr)
                const hasEvt   = dateHasEvent(day.dateStr)
                const today    = new Date(); today.setHours(0,0,0,0)
                const isPast   = new Date(day.dateStr+'T12:00:00') < today
                const isToday  = day.dateStr === new Date().toISOString().split('T')[0]
                return (
                  <div key={i} onClick={()=>toggleDate(day.dateStr)}
                    style={{textAlign:'center',padding:'8px 2px',borderRadius:'8px',position:'relative',
                      background:selected?typeColor+'22':'transparent',
                      border:selected?`1px solid ${typeColor}`:isToday?`1px solid ${t.border}`:'1px solid transparent',
                      cursor:isPast?'default':'pointer', opacity:isPast?0.35:1}}>
                    <div style={{fontSize:'13px',fontWeight:selected?700:400,color:selected?typeColor:isToday?t.text:t.text,lineHeight:1}}>
                      {day.day}
                    </div>
                    {hasEvt && (
                      <div style={{width:'4px',height:'4px',borderRadius:'50%',background:'#f59e0b',margin:'2px auto 0'}}/>
                    )}
                    {selected && !hasEvt && (
                      <div style={{width:'4px',height:'4px',borderRadius:'50%',background:typeColor,margin:'2px auto 0'}}/>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{display:'flex',gap:'14px',marginBottom:'16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:typeColor}}/>
                <span style={{fontSize:'11px',color:t.textMuted}}>Dia de treino</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#f59e0b'}}/>
                <span style={{fontSize:'11px',color:t.textMuted}}>Competição</span>
              </div>
            </div>

            {selectedDates.length > 0 && (
              <div style={{background:typeColor+'11',border:`1px solid ${typeColor}33`,borderRadius:'8px',padding:'10px 14px',marginBottom:'16px'}}>
                <div style={{fontSize:'12px',fontWeight:600,color:typeColor,marginBottom:'4px'}}>
                  {selectedDates.length} dia{selectedDates.length!==1?'s':''} seleccionado{selectedDates.length!==1?'s':''}
                </div>
                <div style={{fontSize:'11px',color:t.textMuted,lineHeight:1.6}}>
                  {[...selectedDates].sort().map(ds=>{
                    const d = new Date(ds+'T12:00:00')
                    return d.toLocaleDateString('pt-PT',{weekday:'short',day:'2-digit',month:'short'})
                  }).join(' · ')}
                </div>
              </div>
            )}

            {/* Notes */}
            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'6px'}}>NOTA GERAL (OPCIONAL)</div>
              <textarea value={wizardNote} onChange={e=>setWizardNote(e.target.value)}
                placeholder='Objectivos, instruções gerais para a atleta...'
                style={{...inp,minHeight:'56px',resize:'vertical'}}/>
            </div>

            <button
              disabled={selectedDates.length===0}
              onClick={()=>{
                const indices = activeDayIndicesFromDates(selectedDates)
                setWizardActiveDays(indices)
                setWizardCurrentDay(indices[0]??0)
                setWizardStep(2)
              }}
              style={{background:selectedDates.length===0?t.border:typeColor,border:'none',borderRadius:'8px',color:selectedDates.length===0?t.textMuted:'#fff',padding:'12px 24px',fontSize:'14px',fontWeight:700,cursor:selectedDates.length===0?'not-allowed':'pointer',fontFamily:F,width:'100%'}}>
              {selectedDates.length===0?'Selecciona pelo menos um dia':'Definir Sessões →'}
            </button>
          </div>
        )}

        {/* ── STEP 2: Define sessions ── */}
        {wizardStep===2 && (
          <div>
            {/* Day tabs */}
            <div style={{display:'flex',gap:'5px',marginBottom:'16px',flexWrap:'wrap'}}>
              {wizardActiveDays.map(d=>(
                <button key={d} onClick={()=>{setWizardCurrentDay(d);setWizardOpenCat(null)}}
                  style={{padding:'7px 14px',borderRadius:'8px',fontFamily:F,fontSize:'12px',fontWeight:wizardCurrentDay===d?700:400,cursor:'pointer',
                    border:`1px solid ${wizardCurrentDay===d?typeColor:t.border}`,
                    background:wizardCurrentDay===d?typeColor+'11':'transparent',
                    color:wizardCurrentDay===d?typeColor:t.textMuted}}>
                  {(lang==='pt'?DAYS_SHORT_PT:DAYS_SHORT_EN)[d]}
                  {dayDone(d) && <span style={{marginLeft:'5px',color:gymColor,fontWeight:900}}>✓</span>}
                </button>
              ))}
              <button onClick={()=>setWizardStep(1)}
                style={{padding:'7px 12px',borderRadius:'8px',fontFamily:F,fontSize:'12px',cursor:'pointer',
                  border:`1px solid ${t.border}`,background:'transparent',color:t.textMuted,marginLeft:'auto'}}>
                ← Calendário
              </button>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              {/* Left: library */}
              <div>
                {/* Rest day toggle */}
                <div style={{...card,marginBottom:'10px',padding:'12px 14px'}}>
                  {isRestDay ? (
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <div style={{fontSize:'13px',fontWeight:700,color:'#f59e0b'}}>Descanso marcado</div>
                      <button onClick={clearRestDay}
                        style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'4px 10px',cursor:'pointer',fontSize:'11px',fontFamily:F}}>
                        Remover
                      </button>
                    </div>
                  ) : (
                    <button onClick={markRestDay}
                      style={{width:'100%',background:'transparent',border:`1px dashed ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'8px',cursor:'pointer',fontSize:'12px',fontFamily:F}}>
                      Marcar como Descanso
                    </button>
                  )}
                </div>

                {/* Categories */}
                {!isRestDay && cats.map(cat=>{
                  const catItems = allLib.filter(e=>e.cat===cat)
                  const open = wizardOpenCat===cat
                  return (
                    <div key={cat} style={{...card,marginBottom:'8px',padding:0,overflow:'hidden'}}>
                      <button onClick={()=>setWizardOpenCat(open?null:cat)}
                        style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 14px',background:'transparent',border:'none',cursor:'pointer',fontFamily:F}}>
                        <div style={{fontSize:'12px',fontWeight:600,color:t.text}}>{cat}</div>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <div style={{fontSize:'10px',color:t.textMuted}}>{catItems.filter(e=>isDrillSelected(e.id)).length}/{catItems.length}</div>
                          <div style={{fontSize:'12px',color:t.textMuted}}>{open?'▲':'▼'}</div>
                        </div>
                      </button>
                      {open && catItems.map(ex=>{
                        const sel = isDrillSelected(ex.id)
                        return (
                          <div key={ex.id}
                            style={{borderTop:`1px solid ${t.border}`,padding:'9px 14px',
                              background:sel?typeColor+'0d':'transparent',cursor:'pointer'}}
                            onClick={()=>toggleDrill(ex)}>
                            <div style={{display:'flex',alignItems:'flex-start',gap:'8px'}}>
                              <div style={{width:'18px',height:'18px',borderRadius:'4px',flexShrink:0,marginTop:'1px',
                                border:`2px solid ${sel?typeColor:t.border}`,background:sel?typeColor:'transparent',
                                display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'11px',fontWeight:900}}>
                                {sel?'✓':''}
                              </div>
                              <div style={{flex:1}}>
                                <div style={{fontSize:'12px',fontWeight:sel?600:400,color:sel?typeColor:t.text,lineHeight:1.3}}>{ex.name}</div>
                                <div
                                  onMouseEnter={()=>setTooltipId(ex.id)}
                                  onMouseLeave={()=>setTooltipId(null)}
                                  style={{position:'relative',display:'inline-block'}}>
                                  <div style={{fontSize:'10px',color:t.textMuted,marginTop:'2px',cursor:'help',textDecoration:'underline dotted'}}>
                                    {ex.desc.length>45 ? ex.desc.slice(0,45)+'…' : ex.desc}
                                  </div>
                                  {tooltipId===ex.id && (
                                    <div style={{position:'absolute',bottom:'calc(100% + 6px)',left:0,zIndex:100,
                                      background:theme==='dark'?'#1a1a1a':'#fff',border:`1px solid ${t.border}`,
                                      borderRadius:'8px',padding:'8px 12px',width:'220px',boxShadow:'0 4px 16px rgba(0,0,0,0.15)'}}>
                                      <div style={{fontSize:'11px',fontWeight:700,color:typeColor,marginBottom:'3px'}}>{ex.name}</div>
                                      <div style={{fontSize:'11px',color:t.text,lineHeight:1.5}}>{ex.desc}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}

                {/* Custom exercise */}
                {!isRestDay && (
                  <div style={{...card,marginTop:'8px'}}>
                    <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'10px'}}>EXERCÍCIO PERSONALIZADO</div>
                    <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                      <input placeholder='Nome' value={wizardCustom.name} onChange={e=>setWizardCustom(p=>({...p,name:e.target.value}))} style={inp}/>
                      <select value={wizardCustom.cat} onChange={e=>setWizardCustom(p=>({...p,cat:e.target.value}))} style={inp}>
                        <option value=''>Categoria</option>
                        {cats.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                      <input placeholder='Descrição (opcional)' value={wizardCustom.desc} onChange={e=>setWizardCustom(p=>({...p,desc:e.target.value}))} style={inp}/>
                      <button onClick={addCustom} style={{background:typeColor,border:'none',borderRadius:'6px',color:'#fff',padding:'8px',cursor:'pointer',fontSize:'12px',fontWeight:700,fontFamily:F}}>
                        + Adicionar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: current day plan */}
              <div>
                <div style={{...card,position:'sticky',top:'16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <div>
                      <div style={{fontSize:'9px',letterSpacing:'2px',color:typeColor,fontWeight:600,marginBottom:'2px'}}>
                        {(lang==='pt'?DAYS_PT:DAYS_EN)[wizardCurrentDay]?.toUpperCase()}
                      </div>
                      {wizardType==='golf' && currentItems.filter(i=>!i.isRest).length>0 && (
                        <div style={{fontSize:'11px',color:t.textMuted}}>{totalBalls} bolas</div>
                      )}
                    </div>
                    {currentItems.filter(i=>!i.isRest).length>1 && (
                      <button onClick={copyToAll}
                        style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'5px 10px',cursor:'pointer',fontSize:'11px',fontFamily:F}}>
                        Copiar para todos
                      </button>
                    )}
                  </div>

                  {isRestDay && (
                    <div style={{textAlign:'center',padding:'24px',color:'#f59e0b',fontSize:'13px',fontWeight:600}}>
                      Dia de Descanso
                    </div>
                  )}

                  {!isRestDay && currentItems.length===0 && (
                    <div style={{textAlign:'center',padding:'24px',color:t.textMuted,fontSize:'13px'}}>
                      Selecciona exercícios à esquerda
                    </div>
                  )}

                  {!isRestDay && currentItems.map((item,ii)=>(
                    <div key={item.id} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:'8px',padding:'10px 12px',marginBottom:'8px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}}>
                        <div style={{fontSize:'12px',fontWeight:600,color:t.text,flex:1,paddingRight:'8px'}}>{item.name}</div>
                        <div style={{display:'flex',gap:'3px',flexShrink:0}}>
                          <button onClick={()=>moveItem(item.id,'up')} style={{background:'transparent',border:'none',cursor:'pointer',color:t.textMuted,padding:'0 3px',fontSize:'12px'}}>↑</button>
                          <button onClick={()=>moveItem(item.id,'down')} style={{background:'transparent',border:'none',cursor:'pointer',color:t.textMuted,padding:'0 3px',fontSize:'12px'}}>↓</button>
                          <button onClick={()=>removeItem(item.id)} style={{background:'transparent',border:'none',cursor:'pointer',color:'#ef4444',padding:'0 3px',fontSize:'12px'}}>×</button>
                        </div>
                      </div>
                      {wizardType==='golf' ? (
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <input type='number' value={item.qty||''} onChange={e=>updateItem(item.id,'qty',e.target.value)}
                            placeholder='Bolas' style={{...smInp,width:'80px'}}/>
                          <span style={{fontSize:'11px',color:t.textMuted}}>bolas</span>
                        </div>
                      ) : (
                        <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                          <input type='number' value={item.sets||''} onChange={e=>updateItem(item.id,'sets',e.target.value)} placeholder='Sets' style={{...smInp,width:'60px'}}/>
                          <input type='number' value={item.reps||''} onChange={e=>updateItem(item.id,'reps',e.target.value)} placeholder='Reps' style={{...smInp,width:'60px'}}/>
                          <input value={item.load||''} onChange={e=>updateItem(item.id,'load',e.target.value)} placeholder='kg' style={{...smInp,width:'55px'}}/>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Wizard footer */}
            <div style={{display:'flex',justifyContent:'flex-end',gap:'10px',marginTop:'16px'}}>
              <button onClick={saveWizard} disabled={saving||selectedDates.length===0}
                style={{background:saving||selectedDates.length===0?t.border:typeColor,border:'none',borderRadius:'8px',
                  color:saving||selectedDates.length===0?t.textMuted:'#fff',padding:'12px 28px',fontSize:'14px',fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:F}}>
                {saving?'A guardar...':'Guardar Plano'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── MAIN RENDER ────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:F,color:t.text}}>

      {/* Free session modal */}
      {showFreeSession && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:'20px'}}>
          <div style={{...card,width:'100%',maxWidth:'400px'}}>
            <div style={{fontSize:'16px',fontWeight:700,color:t.text,marginBottom:'16px'}}>Sessão no Campo</div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'16px'}}>
              <div>
                <div style={{fontSize:'10px',letterSpacing:'2px',color:t.textMuted,marginBottom:'5px',fontWeight:600}}>DATA</div>
                <input type='date' value={freeSession.date} onChange={e=>setFreeSession(p=>({...p,date:e.target.value}))} style={inp}/>
              </div>
              <div>
                <div style={{fontSize:'10px',letterSpacing:'2px',color:t.textMuted,marginBottom:'5px',fontWeight:600}}>SCORE</div>
                <div style={{display:'flex',gap:'8px'}}>
                  <input placeholder='Score' value={freeSession.score} onChange={e=>setFreeSession(p=>({...p,score:e.target.value}))} style={{...inp,width:'80px'}}/>
                  <input placeholder='Buracos (9/18)' value={freeSession.holes} onChange={e=>setFreeSession(p=>({...p,holes:e.target.value}))} style={inp}/>
                </div>
              </div>
              <div>
                <div style={{fontSize:'10px',letterSpacing:'2px',color:t.textMuted,marginBottom:'5px',fontWeight:600}}>NOTAS</div>
                <textarea value={freeSession.notes} onChange={e=>setFreeSession(p=>({...p,notes:e.target.value}))} placeholder='Como correu?' style={{...inp,minHeight:'56px',resize:'vertical'}}/>
              </div>
            </div>
            <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
              <button onClick={()=>setShowFreeSession(false)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'8px 16px',cursor:'pointer',fontSize:'13px',fontFamily:F}}>Cancelar</button>
              <button onClick={addFreeSession} disabled={savingFree} style={{background:savingFree?t.border:golfColor,border:'none',borderRadius:'8px',color:'#fff',padding:'8px 20px',cursor:'pointer',fontSize:'13px',fontWeight:700,fontFamily:F}}>{savingFree?'...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HERO GRADIENT BUTTONS ── */}
      <div style={{marginBottom:'20px'}}>
        {/* Set The Plan — big */}
        <button onClick={()=>setSubTab('plan')}
          style={{width:'100%',display:'flex',alignItems:'center',gap:'16px',
            background: subTab==='plan'
              ? 'linear-gradient(135deg, #0C447C 0%, #185FA5 60%, #378ADD 100%)'
              : t.surface,
            border: subTab==='plan'?'none':`1px solid ${t.border}`,
            borderRadius:'14px',padding:'18px 22px',cursor:'pointer',textAlign:'left',fontFamily:F,
            marginBottom:'10px',transition:'all 0.2s'}}>
          <div style={{width:'46px',height:'46px',borderRadius:'50%',flexShrink:0,
            background:subTab==='plan'?'rgba(255,255,255,0.15)':'#E6F1FB',
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke={subTab==='plan'?'#fff':golfColor} strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <line x1="8" y1="14" x2="10" y2="14"/><line x1="12" y1="14" x2="16" y2="14"/>
              <line x1="8" y1="18" x2="10" y2="18"/><line x1="12" y1="18" x2="16" y2="18"/>
            </svg>
          </div>
          <div>
            <div style={{fontSize:'10px',letterSpacing:'3px',fontWeight:600,marginBottom:'3px',
              color:subTab==='plan'?'rgba(255,255,255,0.65)':'#185FA5'}}>COACH · PLANEAMENTO</div>
            <div style={{fontSize:'20px',fontWeight:900,letterSpacing:'-0.5px',
              color:subTab==='plan'?'#fff':t.text}}>Set The Plan</div>
          </div>
          {subTab==='plan' && (
            <div style={{marginLeft:'auto',fontSize:'10px',letterSpacing:'2px',color:'rgba(255,255,255,0.5)',fontWeight:600}}>ACTIVO</div>
          )}
        </button>

        {/* Golf Plan + Gym Plan — medium */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
          <button
            onClick={()=>{setSubTab('plan');setWizardType('golf');setWizard(true);setWizardStep(1);setSelectedDates([]);setCalMonth(new Date());setWizardDayPlans({});setWizardNote('');setWizardUserLib([])}}
            style={{background:'linear-gradient(135deg, #185FA5 0%, #2a80d0 60%, #378ADD 100%)',
              border:'none',borderRadius:'12px',padding:'14px 16px',cursor:'pointer',textAlign:'left',fontFamily:F}}>
            <div style={{fontSize:'9px',letterSpacing:'2px',color:'rgba(255,255,255,0.65)',fontWeight:600,marginBottom:'3px'}}>GOLF PLAN</div>
            <div style={{fontSize:'15px',fontWeight:800,color:'#fff'}}>+ Criar Plano</div>
          </button>
          <button
            onClick={()=>{setSubTab('plan');setWizardType('gym');setWizard(true);setWizardStep(1);setSelectedDates([]);setCalMonth(new Date());setWizardDayPlans({});setWizardNote('');setWizardUserLib([])}}
            style={{background:'linear-gradient(135deg, #1a4d20 0%, #2a7a32 60%, #3aa84a 100%)',
              border:'none',borderRadius:'12px',padding:'14px 16px',cursor:'pointer',textAlign:'left',fontFamily:F}}>
            <div style={{fontSize:'9px',letterSpacing:'2px',color:'rgba(255,255,255,0.65)',fontWeight:600,marginBottom:'3px'}}>GYM PLAN</div>
            <div style={{fontSize:'15px',fontWeight:800,color:'#fff'}}>+ Criar Plano</div>
          </button>
        </div>
      </div>

      {/* Secondary tabs */}
      <div style={{display:'flex',gap:'6px',marginBottom:'24px'}}>
        {[
          {key:'log',  role:'ATHLETE', label:'Record What You Did'},
          {key:'progress', role:'', label:'Track Progress'},
        ].map(({key,label,role})=>{
          const active = subTab===key
          return (
            <button key={key} onClick={()=>setSubTab(key)}
              style={{flex:1,padding:'10px 14px',borderRadius:'10px',border:`1px solid ${active?golfColor:t.border}`,
                background:active?'#eaf4ff':'transparent',cursor:'pointer',fontFamily:F,textAlign:'left'}}>
              {role && <div style={{fontSize:'9px',letterSpacing:'1px',color:active?golfColor:t.textMuted,fontWeight:600,marginBottom:'1px'}}>{role}</div>}
              <div style={{fontSize:'12px',fontWeight:active?700:400,color:active?golfDark:t.textMuted}}>{label}</div>
            </button>
          )
        })}
      </div>

      {/* ── SET THE PLAN — mini coach dashboard ── */}
      {subTab==='plan' && (
        <div>
          {/* Alert: no training next 3 days */}
          {noTrainingNext3 && !loading && (
            <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:'12px',padding:'14px 18px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'12px'}}>
              <div style={{fontSize:'20px',flexShrink:0}}>⚠️</div>
              <div>
                <div style={{fontSize:'13px',fontWeight:700,color:'#9a3412'}}>Sem treino nos próximos 3 dias</div>
                <div style={{fontSize:'12px',color:'#c2410c',marginTop:'2px'}}>
                  {upcomingSessions.length===0
                    ? 'Nenhuma sessão planeada — cria um plano de golf ou ginásio.'
                    : `Próxima sessão em ${upcomingSessions[0].offset} dias.`}
                </div>
              </div>
            </div>
          )}

          {/* Status cards */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
            {[
              {plan:golfPlan, color:golfColor, dark:golfDark, label:'GOLF', icon:'⛳'},
              {plan:gymPlan,  color:gymColor,  dark:gymDark,  label:'GYM',  icon:'💪'},
            ].map(({plan,color,dark,label,icon})=>{
              const totalSessions = (plan?.days||[]).reduce((a,d)=>a+(d?.sessions?.length||0),0)
              const doneItems     = (plan?.days||[]).reduce((a,d)=>a+(d?.sessions||[]).reduce((b,s)=>b+(s.items||[]).filter(i=>i.done).length,0),0)
              const totalItems    = (plan?.days||[]).reduce((a,d)=>a+(d?.sessions||[]).reduce((b,s)=>b+(s.items?.length||0),0),0)
              return (
                <div key={label} style={{...card,borderTop:`3px solid ${color}`}}>
                  <div style={{fontSize:'9px',letterSpacing:'2px',color,fontWeight:600,marginBottom:'6px'}}>{icon} {label}</div>
                  {plan ? (
                    <>
                      <div style={{fontSize:'22px',fontWeight:900,color:t.text,lineHeight:1}}>{totalSessions}</div>
                      <div style={{fontSize:'11px',color:t.textMuted,marginTop:'2px'}}>
                        sessõe{totalSessions!==1?'s':''} esta semana
                      </div>
                      {totalItems>0 && (
                        <div style={{marginTop:'8px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                            <span style={{fontSize:'10px',color:t.textMuted}}>Progresso</span>
                            <span style={{fontSize:'10px',fontWeight:700,color}}>{doneItems}/{totalItems}</span>
                          </div>
                          <div style={{height:'3px',background:t.border,borderRadius:'2px',overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${totalItems>0?Math.round((doneItems/totalItems)*100):0}%`,background:color,borderRadius:'2px'}}/>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{fontSize:'12px',color:t.textMuted,marginTop:'4px'}}>Sem plano esta semana</div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Next sessions */}
          {upcomingSessions.length>0 && (
            <div style={{...card,marginBottom:'16px'}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'12px'}}>PRÓXIMAS SESSÕES</div>
              {upcomingSessions.slice(0,3).map((sess,i)=>{
                const dayLabel = sess.offset===0?'Hoje':sess.offset===1?'Amanhã':DAYS_PT[sess.dayIdx]
                const dateLabel = sess.date.toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:'12px',padding:'8px 0',borderBottom:i<Math.min(upcomingSessions.length,3)-1?`1px solid ${t.border}`:'none'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'10px',
                      background:sess.offset===0?golfColor+'22':t.bg,
                      border:`1px solid ${sess.offset===0?golfColor:t.border}`,
                      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <div style={{fontSize:'13px',fontWeight:900,color:sess.offset===0?golfColor:t.text,lineHeight:1}}>
                        {sess.date.getDate()}
                      </div>
                      <div style={{fontSize:'8px',color:t.textMuted,letterSpacing:'0.5px'}}>
                        {MONTH_PT[sess.date.getMonth()].slice(0,3).toUpperCase()}
                      </div>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'13px',fontWeight:700,color:t.text}}>{dayLabel}</div>
                      <div style={{display:'flex',gap:'8px',marginTop:'2px',flexWrap:'wrap'}}>
                        {sess.golfSessions.length>0 && (
                          <span style={{fontSize:'11px',color:golfColor,fontWeight:600}}>⛳ Golf ×{sess.golfSessions.length}</span>
                        )}
                        {sess.gymSessions.length>0 && (
                          <span style={{fontSize:'11px',color:gymColor,fontWeight:600}}>💪 Gym ×{sess.gymSessions.length}</span>
                        )}
                      </div>
                    </div>
                    {sess.offset===0 && (
                      <div style={{fontSize:'9px',letterSpacing:'1px',color:golfColor,fontWeight:700}}>HOJE</div>
                    )}
                    {sess.offset>0 && (
                      <div style={{fontSize:'11px',color:t.textMuted}}>+{sess.offset}d</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Week overview */}
          <div style={{...card,marginBottom:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600}}>ESTA SEMANA</div>
              <div style={{display:'flex',gap:'5px',alignItems:'center'}}>
                <button onClick={()=>setWeekOffset(w=>w-1)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'5px 9px',cursor:'pointer',fontFamily:F,fontSize:'13px'}}>‹</button>
                <div style={{fontSize:'12px',fontWeight:600,color:t.text,minWidth:'130px',textAlign:'center'}}>{formatWeek(weekStart)}</div>
                <button onClick={()=>setWeekOffset(w=>w+1)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'5px 9px',cursor:'pointer',fontFamily:F,fontSize:'13px'}}>›</button>
                <button onClick={()=>setWeekOffset(0)} style={{background:isCurrentWeek?'#eaf4ff':'transparent',border:`1px solid ${isCurrentWeek?golfColor:t.border}`,borderRadius:'6px',color:isCurrentWeek?golfColor:t.textMuted,padding:'5px 9px',cursor:'pointer',fontFamily:F,fontSize:'10px',letterSpacing:'1px'}}>
                  HOJE
                </button>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'4px'}}>
              {DAYS_SHORT.map((d,i)=>{
                const gSess  = (golfPlan?.days||[])[i]?.sessions||[]
                const gymSess = (gymPlan?.days||[])[i]?.sessions||[]
                const hasComp = dayHasComp(i)
                const isToday = i===todayIdx && isCurrentWeek
                const gHasRest = gSess.some(s=>s.isRest)
                const gymHasRest = gymSess.some(s=>s.isRest)
                return (
                  <div key={i}
                    style={{background:isToday?golfColor+'11':t.bg,border:`1px solid ${isToday?golfColor:hasComp?'#BA7517':t.border}`,borderRadius:'8px',padding:'8px 4px',textAlign:'center'}}>
                    <div style={{fontSize:'9px',letterSpacing:'1px',color:isToday?golfColor:t.textMuted,marginBottom:'5px',fontWeight:600}}>{d}</div>
                    {hasComp && <div style={{fontSize:'8px',color:'#854F0B',fontWeight:700}}>comp</div>}
                    {!hasComp && !gSess.length && !gymSess.length && <div style={{fontSize:'9px',color:t.border}}>—</div>}
                    {gHasRest && <div style={{fontSize:'9px',color:'#f59e0b',fontWeight:700}}>rest</div>}
                    {!gHasRest && gSess.length>0 && <div style={{fontSize:'8px',color:golfColor,fontWeight:700,marginBottom:'1px'}}>⛳×{gSess.length}</div>}
                    {gymHasRest && !gHasRest && <div style={{fontSize:'9px',color:'#f59e0b',fontWeight:700}}>rest</div>}
                    {!gymHasRest && gymSess.length>0 && <div style={{fontSize:'8px',color:gymColor,fontWeight:700}}>💪×{gymSess.length}</div>}
                  </div>
                )
              })}
            </div>
          </div>

          {loading && (
            <div style={{textAlign:'center',color:t.textMuted,fontSize:'13px',padding:'20px'}}>A carregar planos...</div>
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
              <button onClick={()=>setWeekOffset(0)} style={{background:isCurrentWeek?'#eaf4ff':'transparent',border:`1px solid ${isCurrentWeek?golfColor:t.border}`,borderRadius:'6px',color:isCurrentWeek?golfColor:t.textMuted,padding:'6px 10px',cursor:'pointer',fontFamily:F,fontSize:'11px'}}>
                HOJE
              </button>
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
                + Fui ao campo
              </button>
            </div>
          </div>

          {/* Day grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'5px',marginBottom:'16px'}}>
            {DAYS_SHORT.map((d,i)=>{
              const dayD = combinedDays[i]||{sessions:[]}
              const doneEx  = dayD.sessions?.reduce((a,s)=>a+(s.items?.filter(e=>e.done).length||0),0)||0
              const totalEx = dayD.sessions?.reduce((a,s)=>a+(s.items?.length||0),0)||0
              const isSelected = selectedDay===i
              const isToday = i===todayIdx
              return (
                <div key={i} onClick={()=>setSelectedDay(i)}
                  style={{background:isSelected?'#eaf4ff':t.surface,border:`1px solid ${isSelected?golfColor:dayD.sessions?.length?golfColor+'44':t.border}`,borderRadius:'8px',padding:'9px 4px',textAlign:'center',cursor:'pointer'}}>
                  <div style={{fontSize:'9px',letterSpacing:'2px',color:isSelected?golfColor:isToday?t.text:t.textMuted,marginBottom:'5px',fontWeight:600}}>{d}</div>
                  {!dayD.sessions?.length && <div style={{fontSize:'9px',color:t.border}}>—</div>}
                  {totalEx>0 && <div style={{fontSize:'14px',fontWeight:900,color:doneEx===totalEx?gymColor:t.text,lineHeight:1}}>{doneEx}/{totalEx}</div>}
                  {dayD.sessions?.length>0 && totalEx===0 && <div style={{fontSize:'9px',color:golfColor,fontWeight:600}}>livre</div>}
                </div>
              )
            })}
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <div style={{fontSize:'15px',fontWeight:800,color:t.text}}>{DAYS_LONG[selectedDay]}</div>
            {selectedDay===todayIdx && isCurrentWeek && <div style={{fontSize:'9px',color:golfColor,letterSpacing:'2px',fontWeight:600}}>HOJE</div>}
          </div>

          {!combinedDays[selectedDay]?.sessions?.length ? (
            <div style={{...card,textAlign:'center',padding:'40px',color:t.textMuted,fontSize:'13px',marginBottom:'12px'}}>
              Sem sessões planeadas. Podes registar uma sessão de campo.
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'12px'}}>
              {(combinedDays[selectedDay]?.sessions||[]).map((session,si)=>{
                const type  = session._type||(GOLF_CATS.includes(session.cat)?'golf':'gym')
                const color = type==='golf'?golfColor:gymColor
                const plan  = type==='golf'?golfPlan:gymPlan
                const realSi = plan?.days?.[selectedDay]?.sessions?.findIndex(s=>s.id===session.id)??si
                return (
                  <div key={si} style={{...card,borderLeft:`3px solid ${session.isRest?'#f59e0b':color}`}}>
                    <div style={{marginBottom:'10px'}}>
                      <div style={{fontSize:'8px',letterSpacing:'3px',color:session.isRest?'#f59e0b':color,marginBottom:'2px',fontWeight:600}}>
                        {type.toUpperCase()}{session.free?' · CAMPO':session.isRest?' · DESCANSO':''}
                      </div>
                      {session.isRest && <div style={{fontSize:'13px',color:'#f59e0b',fontWeight:600}}>Dia de Descanso</div>}
                      {session.notes && <div style={{fontSize:'12px',color:t.textMuted}}>{session.notes}</div>}
                      {session.score && <div style={{fontSize:'13px',fontWeight:700,color:t.text,marginTop:'2px'}}>Score: {session.score}{session.holes?' ('+session.holes+'h)':''}</div>}
                    </div>
                    {(!session.items||!session.items.length) && !session.isRest && <div style={{fontSize:'12px',color:t.textMuted,fontStyle:'italic'}}>Sessão registada.</div>}
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
                                {type==='golf' ? `${item.qty||'—'} bolas` : `${item.sets||'—'}×${item.reps||'—'}${item.load?' @ '+item.load+'kg':''}`}
                              </div>
                            </div>
                            {item.done && <div style={{fontSize:'9px',fontWeight:700,color:gymColor,letterSpacing:'1px'}}>FEITO</div>}
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
            <div style={{fontSize:'8px',letterSpacing:'3px',color:t.textMuted,marginBottom:'8px',fontWeight:600}}>NOTA DO DIA</div>
            <textarea value={athleteNote} onChange={e=>setAthleteNote(e.target.value)} placeholder='Como correu? Como te sentiste?' style={{...inp,minHeight:'64px',resize:'vertical'}}/>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:'8px'}}>
              <button onClick={async()=>{const p=golfPlan||gymPlan;if(p)await supabase.from('training_plans').update({athlete_notes:athleteNote,updated_at:new Date().toISOString()}).eq('id',p.id)}}
                style={{background:golfColor,border:'none',borderRadius:'8px',color:'#fff',padding:'8px 20px',cursor:'pointer',fontSize:'13px',fontWeight:700,fontFamily:F}}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TRACK PROGRESS ── */}
      {subTab==='progress' && (() => {
        const allSessions = plans.flatMap(p=>(p.days||[]).flatMap((d,di)=>(d?.sessions||[]).map(s=>({...s,plan_type:p.plan_type}))))
        const catCounts = {}
        allSessions.forEach(s=>{ if(s.cat && !s.isRest) catCounts[s.cat]=(catCounts[s.cat]||0)+1 })
        const gTotal   = GOLF_CATS.reduce((a,c)=>a+(catCounts[c]||0),0)
        const gymTotal = GYM_CATS.reduce((a,c)=>a+(catCounts[c]||0),0)
        const weekCounts = Array(12).fill(0).map((_,i)=>{
          const ws = getWeekStart(-(11-i))
          return plans.filter(p=>p.week_start===ws).reduce((a,p)=>a+(p.days||[]).reduce((b,d)=>b+(d?.sessions?.filter(s=>!s.isRest).length||0),0),0)
        })
        return (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'14px'}}>
              {[
                {l:'TOTAL',    v:allSessions.filter(s=>!s.isRest).length, c:t.text},
                {l:'GOLF',     v:allSessions.filter(s=>s.plan_type==='golf'&&!s.isRest).length, c:golfColor},
                {l:'GYM',      v:allSessions.filter(s=>s.plan_type==='gym'&&!s.isRest).length, c:gymColor},
                {l:'SEMANAS',  v:plans.length, c:t.textMuted},
              ].map(item=>(
                <div key={item.l} style={card}>
                  <div style={{fontSize:'8px',letterSpacing:'2px',color:t.textMuted,marginBottom:'8px',fontWeight:600}}>{item.l}</div>
                  <div style={{fontSize:'28px',fontWeight:900,color:item.c,lineHeight:1,letterSpacing:'-1px'}}>{item.v}</div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
              {[['GOLFE',GOLF_CATS,gTotal,golfColor],['GINÁSIO',GYM_CATS,gymTotal,gymColor]].map(([title,catList,total,color])=>(
                <div key={title} style={card}>
                  <div style={{fontSize:'8px',letterSpacing:'3px',color,marginBottom:'12px',fontWeight:600}}>{title}</div>
                  {catList.map(cat=>{
                    const count=catCounts[cat]||0
                    const pct=total>0?Math.round((count/total)*100):0
                    return (
                      <div key={cat} style={{marginBottom:'8px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                          <div style={{fontSize:'11px',color:t.textMuted}}>{cat}</div>
                          <div style={{fontSize:'11px',color,fontWeight:700}}>{count}</div>
                        </div>
                        <div style={{height:'3px',background:t.border,borderRadius:'2px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:'2px'}}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <div style={card}>
              <div style={{fontSize:'8px',letterSpacing:'3px',color:t.textMuted,marginBottom:'12px',fontWeight:600}}>VOLUME — ÚLTIMAS 12 SEMANAS</div>
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
