import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Goals from './Goals'

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
  { id:'g0',  name:'Aquecimento — pitch shots',      cat:'Driving Range', desc:'9-ferro meio swing a crescer, foco em contacto e ritmo', default_qty:20 },
  { id:'g1',  name:'Ladder drill — wedges',          cat:'Driving Range', desc:'Mudar alvo a cada batimento: PW 60→80m, SW 50→70m, LW 40→60m', default_qty:30 },
  { id:'g2',  name:'Wedge gapping',                 cat:'Driving Range', desc:'10 bolas por distância em incrementos de 10m (30→90m)', default_qty:40 },
  { id:'g3',  name:'Tiro alto vs tiro baixo',       cat:'Driving Range', desc:'Mesma distância, variar trajectória com cada wedge', default_qty:20 },
  { id:'g4',  name:'Finish completo vs curto',      cat:'Driving Range', desc:'Alternar finish completo e finish curto com cada wedge', default_qty:20 },
  { id:'g5',  name:'Clock-face drill',              cat:'Driving Range', desc:'9h (curto), 12h (médio), 3h (longo) com wedge', default_qty:15 },
  { id:'g6',  name:'3 fades + 3 draws por ferro',   cat:'Driving Range', desc:'Chamada do tiro antes de bater, todos os ferros', default_qty:30 },
  { id:'g7',  name:'Ferros pares',                  cat:'Driving Range', desc:'8, 6, 4 ferro — foco em ball flight consistente', default_qty:30 },
  { id:'g8',  name:'Ferros ímpares',                cat:'Driving Range', desc:'9, 7, 5, 3 ferro — foco em ball flight consistente', default_qty:30 },
  { id:'g9',  name:'Mesmo clube, alvos diferentes', cat:'Driving Range', desc:'Ex: 5-ferro a 200, 175, 150, 125, 100m em escada', default_qty:25 },
  { id:'g10', name:'Gate drill — ferros',           cat:'Driving Range', desc:'Dois tees como corredor para corrigir swing path', default_qty:20 },
  { id:'g11', name:'Coin drill',                    cat:'Driving Range', desc:'Moeda à frente da bola, bater a moeda no impact', default_qty:20 },
  { id:'g12', name:'9-shot drill',                  cat:'Driving Range', desc:'Baixo/médio/alto × fade/straight/draw — 9 combinações', default_qty:27 },
  { id:'g13', name:'Madeira 3 — fades altas',       cat:'Driving Range', desc:'Bola ao chão, fade alta para parar suave no green', default_qty:15 },
  { id:'g14', name:'Madeira 3 — draws compridas',   cat:'Driving Range', desc:'Tee baixo, virar a bola para maximizar distância', default_qty:15 },
  { id:'g15', name:'Driver — fairway imaginário',   cat:'Driving Range', desc:'Fairway de 50m, registar: dentro / miss esq / miss dir', default_qty:20 },
  { id:'g16', name:'Driver — pontuação',            cat:'Driving Range', desc:'1pt ferro, 2pt madeira, 3pt driver, -1pt fora', default_qty:15 },
  { id:'g17', name:'Driver — simulação de volta',   cat:'Driving Range', desc:'9 buracos do próximo torneio pelo scorecard no range', default_qty:9 },
  { id:'g18', name:'Escada de velocidade',          cat:'Driving Range', desc:'50% → 75% → 100% velocidade, foco em equilíbrio no finish', default_qty:24 },
  { id:'g19', name:'Velocidade máxima',             cat:'Driving Range', desc:'Série de velocidade máxima, finish completo obrigatório', default_qty:20 },
  { id:'g20', name:'Pause drill',                   cat:'Driving Range', desc:'Pausa 1-2s no topo do backswing antes de soltar', default_qty:20 },
  { id:'g21', name:'Clube com peso',                cat:'Driving Range', desc:'Aumentar velocidade de swing com clube mais pesado', default_qty:20 },
  { id:'g26', name:'Ladder drill — pitching',       cat:'Jogo Curto', desc:'Mudar alvo a cada batimento, 30 a 80m', default_qty:30 },
  { id:'g27', name:'3 comprimentos de swing',       cat:'Jogo Curto', desc:'½ swing, ¾ swing, completo — medir distância de cada', default_qty:27 },
  { id:'g28', name:'Wedges parciais aleatórios',    cat:'Jogo Curto', desc:'Distâncias aleatórias, simular situações de campo', default_qty:20 },
  { id:'g29', name:'Landing zone drill',            cat:'Jogo Curto', desc:'Toalha ou arco no green como zona de ateragem', default_qty:20 },
  { id:'g30', name:'Tee drill — pitching',          cat:'Jogo Curto', desc:'Tee à frente da bola, bater bola e depois tee', default_qty:20 },
  { id:'g31', name:'Drop & repeat',                cat:'Jogo Curto', desc:'Várias bolas no mesmo sítio, repetir mesmo chip até encaixar', default_qty:20 },
  { id:'g32', name:'Par 18',                        cat:'Jogo Curto', desc:'9 posições em redor do green, par 2 cada, contar score', default_qty:18 },
  { id:'g33', name:'Jogo de pontuação',             cat:'Jogo Curto', desc:'1 bola, chip e putt fora, registar score', default_qty:9 },
  { id:'g34', name:'Clock drill — chip',            cat:'Jogo Curto', desc:'12 posições em redor do buraco como horas de relógio', default_qty:12 },
  { id:'g35', name:'Hula hoop drill',               cat:'Jogo Curto', desc:'Aro no green como zona alvo, contar bolas dentro', default_qty:20 },
  { id:'g36', name:'HORSE — chip',                 cat:'Jogo Curto', desc:'Com parceiro: cada um propõe o chip, quem falha fica com letra', default_qty:10 },
  { id:'g37', name:'Bump-and-run com híbrido',      cat:'Jogo Curto', desc:'Rolar a bola como se fosse putt longo', default_qty:15 },
  { id:'g38', name:'Braço líder — chip',            cat:'Jogo Curto', desc:'Chip só com braço da frente, eliminar flip de pulso', default_qty:15 },
  { id:'g39', name:'Pé traseiro elevado',           cat:'Jogo Curto', desc:'Levantar pé de trás para forçar peso na frente', default_qty:15 },
  { id:'g46', name:'50 putts de 1m',               cat:'Putt', desc:'Fazer 50 putts seguidos, não parar se falhar', default_qty:50 },
  { id:'g47', name:'Clock drill — putt',            cat:'Putt', desc:'12 bolas em redor do buraco a 1m, fazer todas seguidas', default_qty:12 },
  { id:'g48', name:'5 seguidos',                    cat:'Putt', desc:'5 bolas a 1m, fazer 5 seguidas — se falhar recomeça', default_qty:5 },
  { id:'g49', name:'100 putts diretos',             cat:'Putt', desc:'100 putts de 1m, contar quantas tentativas', default_qty:100 },
  { id:'g50', name:'Gate drill — putt',             cat:'Putt', desc:'Dois tees como corredor para putter, treinar linha de saída', default_qty:20 },
  { id:'g51', name:'Jogo de birdie',                cat:'Putt', desc:'10 putts de 3m como birdie, se falha putt de par obrigatório', default_qty:10 },
  { id:'g52', name:'9 buracos no green',            cat:'Putt', desc:'9 buracos no green, registar putts por buraco', default_qty:9 },
  { id:'g53', name:'HORSE — putt',                 cat:'Putt', desc:'Com parceiro, alternância de putts difíceis', default_qty:10 },
  { id:'g54', name:'Ladder drill — lag',            cat:'Putt', desc:'Tees a 3m, 4.5m, 6m, 9m — putt de cada, dentro de 30cm', default_qty:16 },
  { id:'g55', name:'Desafio 2-putt',               cat:'Putt', desc:'9 putts acima de 6m, obrigação de fazer 2-putt em todos', default_qty:9 },
  { id:'g56', name:'Manilla folder',               cat:'Putt', desc:'Parar a bola em cima de pasta a 2m do buraco', default_qty:15 },
  { id:'g57', name:'Drawback drill',               cat:'Putt', desc:'Putt falhado → recuar um comprimento de clube e repetir', default_qty:10 },
  { id:'g58', name:'Tripwire drill',               cat:'Putt', desc:'Flagstick atrás do buraco, chegar ao buraco sem tocar', default_qty:10 },
  { id:'g59', name:'Putt com uma mão',             cat:'Putt', desc:'Mão dominante só, feel do putter e estabilidade', default_qty:20 },
  { id:'g60', name:'Putt de olhos fechados',       cat:'Putt', desc:'Treinar feel e ritmo sem ver a linha', default_qty:10 },
  { id:'g61', name:'Olhar para o buraco',          cat:'Putt', desc:'Olhar para o buraco em vez de para a bola', default_qty:10 },
  { id:'g40', name:'Linhas na areia',              cat:'Bunker', desc:'Duas linhas paralelas, entrar na areia entre elas', default_qty:15 },
  { id:'g41', name:'Towel drill — bunker',         cat:'Bunker', desc:'Toalha a 1m do buraco, aterrar dentro da toalha', default_qty:15 },
  { id:'g42', name:'15 saídas para pin variável',  cat:'Bunker', desc:'Coach muda posição do pin após cada saída', default_qty:15 },
  { id:'g43', name:'Bola enterrada — saída',       cat:'Bunker', desc:'Bola enterrada, praticar saída de lies difíceis', default_qty:10 },
  { id:'g44', name:'Trajectória alta vs baixa',    cat:'Bunker', desc:'Saídas altas vs baixas do mesmo bunker', default_qty:10 },
  { id:'g45', name:'Clock drill — bunker',         cat:'Bunker', desc:'12 ângulos diferentes à volta do bunker', default_qty:12 },
  { id:'g22', name:'Ronda completa — score',       cat:'Campo', desc:'18 buracos, jogar para resultado', default_qty:18 },
  { id:'g23', name:'9 buracos — score',            cat:'Campo', desc:'9 buracos competitivo, pre-shot routine em cada batimento', default_qty:9 },
  { id:'g24', name:'Ronda prática',                cat:'Campo', desc:'Bola extra onde necessário para trabalhar pontos fracos', default_qty:18 },
  { id:'g25', name:'Gestão de campo',              cat:'Campo', desc:'Foco em decisões: clube, trajectória, quando arriscar', default_qty:9 },
]

const GYM_LIBRARY = [
  { id:'e1',  name:'Trap Bar Deadlift',         cat:'Pernas',     desc:'Força máxima, técnica primeiro', default_sets:4, default_reps:5 },
  { id:'e2',  name:'Squat',                     cat:'Pernas',     desc:'Barra, goblet ou peso corporal', default_sets:4, default_reps:6 },
  { id:'e3',  name:'Leg Press',                 cat:'Pernas',     desc:'Bilateral, foco em amplitude total', default_sets:3, default_reps:12 },
  { id:'e4',  name:'Split Squat',               cat:'Pernas',     desc:'Cada perna em separado', default_sets:3, default_reps:10 },
  { id:'e5',  name:'Single Leg Press',          cat:'Pernas',     desc:'Unilateral, 12 reps cada perna', default_sets:3, default_reps:12 },
  { id:'e6',  name:'Pistol Squat',              cat:'Pernas',     desc:'Com suporte se necessário', default_sets:3, default_reps:6 },
  { id:'e7',  name:'Hip Hinge / RDL',           cat:'Pernas',     desc:'Romanian deadlift, foco em glúteos e isquiotibiais', default_sets:3, default_reps:12 },
  { id:'e8',  name:'Hip Thrust',                cat:'Pernas',     desc:'Barra ou banda, foco em glúteos', default_sets:3, default_reps:12 },
  { id:'e9',  name:'Jump Squat',                cat:'Pernas',     desc:'Explosivo, aterragem suave e controlada', default_sets:3, default_reps:8 },
  { id:'e10', name:'Box Jump',                  cat:'Pernas',     desc:'Altura progressiva, foco em aterragem estável', default_sets:3, default_reps:6 },
  { id:'e11', name:'Lunge',                     cat:'Pernas',     desc:'À frente ou reverso, peso corporal ou halteres', default_sets:3, default_reps:12 },
  { id:'e12', name:'Bulgarian Split Squat',     cat:'Pernas',     desc:'Pé traseiro elevado, amplitude máxima', default_sets:3, default_reps:10 },
  { id:'e13', name:"Bowler's Squat",            cat:'Pernas',     desc:'Equilíbrio e força unilateral', default_sets:3, default_reps:10 },
  { id:'e14', name:'Lateral Band Walk',         cat:'Pernas',     desc:'Banda à volta dos joelhos, passo lateral', default_sets:3, default_reps:15 },
  { id:'e15', name:'Med Ball Slam',             cat:'Potência',   desc:'Slam no chão com força máxima, reset controlado', default_sets:3, default_reps:8 },
  { id:'e16', name:'Med Ball Rotational Throw', cat:'Potência',   desc:'Throw rotacional contra parede, simular padrão de swing', default_sets:3, default_reps:8 },
  { id:'e17', name:'Med Ball Chest Pass',       cat:'Potência',   desc:'Passe explosivo contra parede', default_sets:3, default_reps:8 },
  { id:'e18', name:'Cable Chop',                cat:'Potência',   desc:'Alto para baixo, rotação do tronco', default_sets:3, default_reps:12 },
  { id:'e19', name:'Cable Lift',                cat:'Potência',   desc:'Baixo para alto, rotação do tronco', default_sets:3, default_reps:12 },
  { id:'e20', name:'Resistance Band Rotation',  cat:'Potência',   desc:'Simular padrão de swing com banda elástica', default_sets:3, default_reps:12 },
  { id:'e21', name:'Kettlebell Swing',          cat:'Potência',   desc:'Hip hinge explosivo, não squat', default_sets:3, default_reps:10 },
  { id:'e22', name:'Landmine Rotation',         cat:'Potência',   desc:'Rotação com barra em landmine', default_sets:3, default_reps:10 },
  { id:'e23', name:'Plank',                     cat:'Core',       desc:'Posição neutra, glúteos activos, respirar', default_sets:3, default_reps:45 },
  { id:'e24', name:'Side Plank',                cat:'Core',       desc:'Cada lado, corpo em linha recta', default_sets:3, default_reps:30 },
  { id:'e25', name:'Dead Bug',                  cat:'Core',       desc:'Controlo motor, lento e preciso', default_sets:3, default_reps:10 },
  { id:'e26', name:'Bird Dog',                  cat:'Core',       desc:'Estabilidade lombar, sem rotação da anca', default_sets:3, default_reps:10 },
  { id:'e27', name:'Pallof Press',              cat:'Core',       desc:'Anti-rotação, cada lado, cabo ou banda', default_sets:3, default_reps:12 },
  { id:'e28', name:'Ab Wheel Rollout',          cat:'Core',       desc:'Extensão controlada, não deixar a lombar ceder', default_sets:3, default_reps:8 },
  { id:'e29', name:'Hanging Leg Raise',         cat:'Core',       desc:'Barra, elevar joelhos ou pernas estendidas', default_sets:3, default_reps:10 },
  { id:'e30', name:'McGill Big 3',              cat:'Core',       desc:'Modified curl-up + bird dog + side plank', default_sets:2, default_reps:10 },
  { id:'e31', name:'TRX Row',                   cat:'Braços',     desc:'Costas e bíceps, corpo em linha recta', default_sets:3, default_reps:12 },
  { id:'e32', name:'Push-up',                   cat:'Braços',     desc:'Tronco estável, ritmo controlado', default_sets:3, default_reps:15 },
  { id:'e33', name:'Dumbbell Press',            cat:'Braços',     desc:'Overhead ou peito, halteres', default_sets:3, default_reps:10 },
  { id:'e34', name:'Cable Row',                 cat:'Braços',     desc:'Puxar para o cinto, cotovelos junto ao corpo', default_sets:3, default_reps:12 },
  { id:'e35', name:'Bicep Curl',                cat:'Braços',     desc:'Halteres ou barra, sem balanço do tronco', default_sets:3, default_reps:12 },
  { id:'e36', name:'Tricep Extension',          cat:'Braços',     desc:'Cabo ou haltere overhead', default_sets:3, default_reps:12 },
  { id:'e37', name:'1-Arm Overhead Press',      cat:'Braços',     desc:'Unilateral, estabilidade do core obrigatória', default_sets:3, default_reps:10 },
  { id:'e38', name:'Scapular Strengthening',    cat:'Braços',     desc:'Exercício prone com banda ou haltere', default_sets:3, default_reps:15 },
  { id:'e39', name:"Golfer's Diagonal Pattern", cat:'Braços',     desc:'Diagonal low-to-high e high-to-low com banda', default_sets:3, default_reps:12 },
  { id:'e40', name:'Rotação Torácica',          cat:'Mobilidade', desc:'Cada lado, lento e controlado', default_sets:2, default_reps:15 },
  { id:'e41', name:'Hip 90/90',                 cat:'Mobilidade', desc:'Mobilidade da anca, cada posição 2 min', default_sets:1, default_reps:5 },
  { id:'e42', name:'Cat-Cow',                   cat:'Mobilidade', desc:'Mobilização da coluna, em 4 apoios', default_sets:2, default_reps:15 },
  { id:'e43', name:'World Greatest Stretch',    cat:'Mobilidade', desc:'Cada lado, 5 reps com pausa', default_sets:2, default_reps:5 },
  { id:'e44', name:'Half-Kneeling Thoracic Rotation', cat:'Mobilidade', desc:'X-factor, separação ombros-ancas', default_sets:2, default_reps:10 },
  { id:'e45', name:'Hip Flexor Stretch',        cat:'Mobilidade', desc:'Cada lado, 60 seg', default_sets:2, default_reps:60 },
  { id:'e46', name:'Shoulder Rotation',         cat:'Mobilidade', desc:'Círculos e rotação interna/externa', default_sets:2, default_reps:10 },
  { id:'e47', name:'Ankle Mobility',            cat:'Mobilidade', desc:'Círculos e dorsiflexão contra parede', default_sets:2, default_reps:10 },
  { id:'e48', name:'Corrida',                   cat:'Cardio',     desc:'Ritmo aeróbico contínuo', default_sets:1, default_reps:20 },
  { id:'e49', name:'Bicicleta',                 cat:'Cardio',     desc:'Aquecimento ou capacidade aeróbica', default_sets:1, default_reps:20 },
  { id:'e50', name:'Remo (ergómetro)',           cat:'Cardio',     desc:'Full body, alternativa à corrida', default_sets:1, default_reps:20 },
  { id:'e51', name:'Jump Rope',                 cat:'Cardio',     desc:'Coordenação e resistência cardiovascular', default_sets:3, default_reps:3 },
  { id:'e52', name:'HIIT',                      cat:'Cardio',     desc:'Intervalos de alta intensidade, 20s on / 40s off', default_sets:6, default_reps:1 },
  { id:'e53', name:'Circuito funcional',        cat:'Cardio',     desc:'5-6 exercícios em sequência sem descanso', default_sets:3, default_reps:1 },
  { id:'e54', name:'Wall Hold',                 cat:'Prevenção',  desc:'Estabilização activa, glúteo médio', default_sets:3, default_reps:30 },
  { id:'e55', name:'Banded External Rotation',  cat:'Prevenção',  desc:'Banda, rotação externa do ombro', default_sets:3, default_reps:15 },
  { id:'e56', name:'Clamshell',                 cat:'Prevenção',  desc:'Banda acima dos joelhos, rotação externa da anca', default_sets:3, default_reps:15 },
  { id:'e57', name:'Single Leg Balance',        cat:'Prevenção',  desc:'30 seg cada perna, olhos abertos depois fechados', default_sets:3, default_reps:30 },
  { id:'e58', name:'Farmers Carry',             cat:'Prevenção',  desc:'40m cada mão, peso controlado', default_sets:3, default_reps:40 },
  { id:'e59', name:'Suitcase Carry',            cat:'Prevenção',  desc:'40m com peso num lado, anti-inclinação', default_sets:3, default_reps:40 },
  { id:'e60', name:'Leopard Crawl',             cat:'Prevenção',  desc:'20 passos cada mão, padrão contralateral', default_sets:3, default_reps:20 },
  { id:'e61', name:'Bear Crawl',                cat:'Prevenção',  desc:'Joelhos a 5cm do chão, core activo', default_sets:3, default_reps:20 },
]

const DAYS_PT       = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
const DAYS_EN       = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const DAYS_SHORT_PT = ['SEG','TER','QUA','QUI','SEX','SÁB','DOM']
const DAYS_SHORT_EN = ['MON','TUE','WED','THU','FRI','SAT','SUN']

const itemProgress = (item) => item.progress ?? (item.done ? 100 : 0)

// Estimated minutes per golf exercise item
const estimateMins = (item) => {
  const qty = parseInt(item.qty) || 0
  if (item.cat === 'Putt') return qty * 0.5
  if (item.cat === 'Jogo Curto') return qty * 0.85
  if (item.cat === 'Bunker') return qty * 1.0
  if (item.cat === 'Campo') return qty * 13
  return qty * 0.6 // Driving Range (30 min / 50 bolas)
}
const fmtMins = (m) => {
  const r = Math.round(m)
  if (r === 0) return ''
  if (r < 60) return `~${r} min`
  return `~${Math.floor(r/60)}h${r%60>0?` ${r%60}min`:''}`
}

export default function Training({ theme, t, user, lang = 'en', events = [], focusDate = null, onFocusConsumed }) {
  const [subTab, setSubTab] = useState('plan')
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(() => { const d=new Date().getDay(); return d===0?6:d-1 })

  // Wizard state
  const [wizard, setWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardType, setWizardType] = useState('golf')
  const [wizardStartDate, setWizardStartDate] = useState('')
  const [wizardEndDate, setWizardEndDate] = useState('')
  const [wizardActiveDays, setWizardActiveDays] = useState([0,1,2,3,4,5,6])
  const [wizardDayPlans, setWizardDayPlans] = useState({})
  const [wizardSelectedChips, setWizardSelectedChips] = useState([])
  const [wizardOpenCat, setWizardOpenCat] = useState(null)
  const [wizardNote, setWizardNote] = useState('')
  const [wizardCustom, setWizardCustom] = useState({ name:'', cat:'', desc:'' })
  const [wizardUserLib, setWizardUserLib] = useState([])
  const [wizardError, setWizardError] = useState('')
  const [saving, setSaving] = useState(false)

  const [tooltipId, setTooltipId] = useState(null)
  const [showFreeSession, setShowFreeSession] = useState(false)
  const [freeSession, setFreeSession] = useState({ date:new Date().toISOString().split('T')[0], notes:'', score:'', holes:'' })
  const [savingFree, setSavingFree] = useState(false)
  const [athleteNote, setAthleteNote] = useState('')

  // Track Progress filters
  const [progressType, setProgressType] = useState('all')
  const [progressPeriod, setProgressPeriod] = useState('all')
  const [eventsData, setEventsData] = useState([])
  const [wizardSessionTypes, setWizardSessionTypes] = useState({})
  const [templates, setTemplates] = useState([])
  const [wizardTemplateName, setWizardTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [phaseOverrides, setPhaseOverrides] = useState({})
  const [editingPhaseWs, setEditingPhaseWs] = useState(null)
  const [savingPhaseOverride, setSavingPhaseOverride] = useState(false)
  const [showCriterios, setShowCriterios] = useState(false)
  const [expandedPhaseKey, setExpandedPhaseKey] = useState(null)

  const email = (user?.email||'').toLowerCase()
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
  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase.from('training_plan_templates').select('*').order('created_at',{ascending:false})
    setTemplates(data||[])
  }, [])
  useEffect(() => { fetchTemplates() }, [fetchTemplates])
  useEffect(() => {
    supabase.from('events').select('id,title,category,start_date,end_date').then(({data})=>setEventsData(data||[]))
  }, [])

  useEffect(() => {
    supabase.from('periodization_overrides').select('*').then(({ data, error }) => {
      if (!error && data) {
        const ov = {}
        data.forEach(r => { ov[r.week_start] = r.phase })
        setPhaseOverrides(ov)
      }
    })
  }, [])

  const focusDateRef = useRef(null)
  useEffect(() => {
    if (!focusDate || focusDate === focusDateRef.current) return
    focusDateRef.current = focusDate
    const d = new Date(focusDate+'T12:00:00')
    const dow = d.getDay(); const dayIdx = dow===0?6:dow-1
    const monday = new Date(d); monday.setDate(d.getDate()-(dow===0?6:dow-1)); monday.setHours(12,0,0,0)
    const targetWs = monday.toISOString().split('T')[0]
    const currentWs = getWeekStart(0)
    const diff = Math.round((new Date(targetWs)-new Date(currentWs))/(7*86400000))
    setWeekOffset(diff)
    setSelectedDay(dayIdx)
    setSubTab('log')
    onFocusConsumed?.()
  }, [focusDate, getWeekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  const golfPlan = plans.find(p => p.week_start===weekStart && p.plan_type==='golf')
  const gymPlan  = plans.find(p => p.week_start===weekStart && p.plan_type==='gym')

  const dayHasComp = (dayIdx) => {
    const ws = new Date(weekStart+'T12:00:00')
    const d = new Date(ws); d.setDate(ws.getDate() + dayIdx)
    const dateStr = d.toISOString().split('T')[0]
    return eventsData.some(e => dateStr >= e.start_date && dateStr <= (e.end_date || e.start_date))
  }

  const dateHasComp = (dateStr) =>
    eventsData.some(e => dateStr >= e.start_date && dateStr <= (e.end_date || e.start_date))

  const compOnDate = (dateStr) =>
    eventsData.find(e => dateStr >= e.start_date && dateStr <= (e.end_date || e.start_date))

  const savePlan = async (newDays, type, ws=weekStart) => {
    setSaving(true)
    const existing = plans.find(p=>p.week_start===ws && p.plan_type===type)
    const payload = { week_start:ws, week_end:getWeekEnd(ws), plan_type:type, days:newDays, updated_at:new Date().toISOString(), updated_by:email }
    if (existing) await supabase.from('training_plans').update(payload).eq('id',existing.id)
    else await supabase.from('training_plans').insert({...payload, created_by:email, status:'active', title:`${type==='golf'?'Golf':'Gym'} Plan`})
    setSaving(false)
    fetchPlans()
  }

  const datesInRange = (() => {
    if (!wizardStartDate || !wizardEndDate) return []
    const start = new Date(wizardStartDate+'T12:00:00')
    const end   = new Date(wizardEndDate+'T12:00:00')
    if (end < start) return []
    const dates = []
    for (let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) {
      const dow = d.getDay()
      const dayIdx = dow===0?6:dow-1
      if (wizardActiveDays.includes(dayIdx)) dates.push(d.toISOString().split('T')[0])
    }
    return dates
  })()

  const toggleChip = (dateStr) => {
    setWizardSelectedChips(prev =>
      prev.includes(dateStr) ? prev.filter(d=>d!==dateStr) : [...prev, dateStr]
    )
  }

  const primaryChip = wizardSelectedChips[0] || null

  const toggleDrill = (ex) => {
    if (!wizardSelectedChips.length) return
    const newPlans = {...wizardDayPlans}
    wizardSelectedChips.forEach(ds => {
      const current = newPlans[ds] || []
      const exists = current.find(i=>i.id===ex.id)
      if (exists) {
        newPlans[ds] = current.filter(i=>i.id!==ex.id)
      } else {
        const item = wizardType==='golf'
          ? { ...ex, qty: 50 }
          : { ...ex, sets: 3, reps: 10, load: '' }
        newPlans[ds] = [...current, item]
      }
    })
    setWizardDayPlans(newPlans)
  }

  const markRestDay = () => {
    if (!wizardSelectedChips.length) return
    const restItem = { id:'rest', name:'Descanso', cat:'Descanso', desc:'Dia de recuperação', isRest:true }
    const newPlans = {...wizardDayPlans}
    wizardSelectedChips.forEach(ds => { newPlans[ds] = [restItem] })
    setWizardDayPlans(newPlans)
  }

  const clearRestDay = () => {
    if (!wizardSelectedChips.length) return
    const newPlans = {...wizardDayPlans}
    wizardSelectedChips.forEach(ds => { newPlans[ds] = [] })
    setWizardDayPlans(newPlans)
  }

  const openEditWizard = (type, focusDate) => {
    const plan = type==='golf' ? golfPlan : gymPlan
    if (!plan) return
    const newDayPlans = {}
    ;(plan.days||[]).forEach((day,dayIdx)=>{
      ;(day?.sessions||[]).forEach(s=>{
        const d=new Date(plan.week_start+'T12:00:00'); d.setDate(d.getDate()+dayIdx)
        const ds=d.toISOString().split('T')[0]
        if(s.isRest) newDayPlans[ds]=[{id:'rest',name:'Descanso',cat:'Descanso',isRest:true}]
        else newDayPlans[ds]=s.items||[]
      })
    })
    const allWeekDates=Array(7).fill(0).map((_,i)=>{const d=new Date(plan.week_start+'T12:00:00');d.setDate(d.getDate()+i);return d.toISOString().split('T')[0]})
    setWizardType(type)
    setWizardStartDate(plan.week_start)
    setWizardEndDate(getWeekEnd(plan.week_start))
    setWizardActiveDays([0,1,2,3,4,5,6])
    setWizardDayPlans(newDayPlans)
    setWizardSelectedChips(focusDate?[focusDate]:allWeekDates.filter(ds=>newDayPlans[ds]))
    const newSessionTypes = {}
    ;(plan.days||[]).forEach((day,dayIdx)=>{
      ;(day?.sessions||[]).forEach(s=>{
        const d=new Date(plan.week_start+'T12:00:00'); d.setDate(d.getDate()+dayIdx)
        const ds=d.toISOString().split('T')[0]
        if(!s.isRest && s.session_type) newSessionTypes[ds]=s.session_type
      })
    })
    setWizardSessionTypes(newSessionTypes)
    setWizardNote('')
    setWizardUserLib([])
    setWizardError('')
    setWizardStep(2)
    setWizard(true)
  }

  const isDrillSelected = (exId) =>
    wizardSelectedChips.length > 0 &&
    wizardSelectedChips.every(ds => (wizardDayPlans[ds]||[]).some(i=>i.id===exId))

  const updateItem = (exId, field, value) => {
    if (!primaryChip) return
    setWizardDayPlans(p=>({...p,[primaryChip]:(p[primaryChip]||[]).map(i=>i.id===exId?{...i,[field]:value}:i)}))
  }

  const removeItem = (exId) => {
    const newPlans = {...wizardDayPlans}
    wizardSelectedChips.forEach(ds => { newPlans[ds] = (newPlans[ds]||[]).filter(i=>i.id!==exId) })
    setWizardDayPlans(newPlans)
  }

  const moveItem = (exId, dir) => {
    if (!primaryChip) return
    const items = [...(wizardDayPlans[primaryChip]||[])]
    const idx = items.findIndex(i=>i.id===exId)
    if (dir==='up' && idx>0) { [items[idx-1],items[idx]]=[items[idx],items[idx-1]] }
    if (dir==='down' && idx<items.length-1) { [items[idx],items[idx+1]]=[items[idx+1],items[idx]] }
    setWizardDayPlans(p=>({...p,[primaryChip]:items}))
  }

  const copyToAllChips = () => {
    if (!primaryChip) return
    const src = wizardDayPlans[primaryChip] || []
    const newPlans = {...wizardDayPlans}
    datesInRange.forEach(ds => { newPlans[ds] = JSON.parse(JSON.stringify(src)) })
    setWizardDayPlans(newPlans)
  }

  const addCustom = () => {
    if (!wizardCustom.name) return
    const ex = { id:'c_'+Date.now(), ...wizardCustom,
      cat: wizardCustom.cat || (wizardType==='golf'?'Driving Range':'Pernas'),
      default_qty:50, default_sets:3, default_reps:10 }
    setWizardUserLib(p=>[...p,ex])
    toggleDrill(ex)
    setWizardCustom({name:'',cat:'',desc:''})
  }

  const saveWizard = async () => {
    // Validation: every day must have a session, rest, or competition
    const missing = wizardSelectedChips.filter(ds => {
      if (dateHasComp(ds)) return false
      return (wizardDayPlans[ds] || []).length === 0
    })
    if (missing.length > 0) {
      setWizardError(
        `${missing.length} dia${missing.length>1?'s':''} sem sessão definida: ` +
        missing.map(ds => {
          const d = new Date(ds+'T12:00:00')
          return `${DAYS_SHORT_PT[d.getDay()===0?6:d.getDay()-1]} ${d.getDate()}/${d.getMonth()+1}`
        }).join(', ')
      )
      return
    }
    const missingType = wizardSelectedChips.filter(ds => {
      if (dateHasComp(ds)) return false
      const items = wizardDayPlans[ds] || []
      if (items[0]?.isRest) return false
      return !wizardSessionTypes[ds]
    })
    if (missingType.length > 0) {
      setWizardError(
        `Define o tipo de sessão (Com Coach / Autónomo) para: ` +
        missingType.map(ds => {
          const d = new Date(ds+'T12:00:00')
          return `${DAYS_SHORT_PT[d.getDay()===0?6:d.getDay()-1]} ${d.getDate()}/${d.getMonth()+1}`
        }).join(', ')
      )
      return
    }
    setWizardError('')
    setSaving(true)
    const weekMap = {}
    datesInRange.forEach(dateStr => {
      const d = new Date(dateStr+'T12:00:00')
      const dow = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - (dow===0?6:dow-1))
      monday.setHours(12,0,0,0)
      const ws = monday.toISOString().split('T')[0]
      const dayIdx = dow===0?6:dow-1
      if (!weekMap[ws]) weekMap[ws]={}
      weekMap[ws][dayIdx] = { items: wizardDayPlans[dateStr] || [], session_type: wizardSessionTypes[dateStr] || null }
    })
    for (const [ws, dayMap] of Object.entries(weekMap)) {
      const newDays = Array(7).fill(null).map(()=>({sessions:[]}))
      Object.entries(dayMap).forEach(([dayIdx, dayData]) => {
        const idx = parseInt(dayIdx)
        const items = dayData.items
        const session_type = dayData.session_type
        if (items.length > 0) {
          if (items[0]?.isRest) {
            newDays[idx].sessions.push({ id:Date.now()+idx, cat:'Descanso', isRest:true, items:[], notes:'' })
          } else {
            newDays[idx].sessions.push({ id:Date.now()+idx, cat:wizardType==='golf'?'Driving Range':'Ginásio', notes:wizardNote, items, session_type })
          }
        }
      })
      await savePlan(newDays, wizardType, ws)
    }
    setSaving(false)
    setWizard(false)
    setWizardStep(1)
    setWizardDayPlans({})
    setWizardSelectedChips([])
    setWizardNote('')
    setWizardSessionTypes({})
    fetchPlans()
  }

  const setItemProgress = async (si, ii, type, progress) => {
    const plan = type==='golf' ? golfPlan : gymPlan
    const newDays = JSON.parse(JSON.stringify(plan?.days||[]))
    const item = newDays[selectedDay]?.sessions?.[si]?.items?.[ii]
    if (!item) return
    item.progress = progress
    item.done = progress === 100
    await savePlan(newDays, type)
  }

  const addFreeSession = async () => {
    setSavingFree(true)
    const dateObj = new Date(freeSession.date+'T12:00:00')
    const dow = dateObj.getDay(); const dayIdx = dow===0?6:dow-1
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

  // ── Coach panel data split by type ──
  const upcomingGolf = (() => {
    const results = []
    for (let offset=0; offset<=21 && results.length<4; offset++) {
      const d = new Date(); d.setDate(d.getDate()+offset)
      const dow = d.getDay(); const dayIdx = dow===0?6:dow-1
      const monday = new Date(d); monday.setDate(d.getDate()-(dow===0?6:dow-1)); monday.setHours(12,0,0,0)
      const ws = monday.toISOString().split('T')[0]
      const wp = plans.find(p=>p.week_start===ws && p.plan_type==='golf')
      const gS = (wp?.days||[])[dayIdx]?.sessions?.filter(s=>!s.isRest)||[]
      if (gS.length) results.push({offset,dayIdx,date:new Date(d)})
    }
    return results
  })()

  const upcomingGym = (() => {
    const results = []
    for (let offset=0; offset<=21 && results.length<4; offset++) {
      const d = new Date(); d.setDate(d.getDate()+offset)
      const dow = d.getDay(); const dayIdx = dow===0?6:dow-1
      const monday = new Date(d); monday.setDate(d.getDate()-(dow===0?6:dow-1)); monday.setHours(12,0,0,0)
      const ws = monday.toISOString().split('T')[0]
      const wg = plans.find(p=>p.week_start===ws && p.plan_type==='gym')
      const gyS = (wg?.days||[])[dayIdx]?.sessions?.filter(s=>!s.isRest)||[]
      if (gyS.length) results.push({offset,dayIdx,date:new Date(d)})
    }
    return results
  })()

  const upcomingCountGolf = (() => {
    let count=0
    for (let offset=0; offset<=13; offset++) {
      const d = new Date(); d.setDate(d.getDate()+offset)
      const dow = d.getDay(); const dayIdx = dow===0?6:dow-1
      const monday = new Date(d); monday.setDate(d.getDate()-(dow===0?6:dow-1)); monday.setHours(12,0,0,0)
      const ws = monday.toISOString().split('T')[0]
      const wp = plans.find(p=>p.week_start===ws && p.plan_type==='golf')
      if ((wp?.days||[])[dayIdx]?.sessions?.some(s=>!s.isRest)) count++
    }
    return count
  })()

  const upcomingCountGym = (() => {
    let count=0
    for (let offset=0; offset<=13; offset++) {
      const d = new Date(); d.setDate(d.getDate()+offset)
      const dow = d.getDay(); const dayIdx = dow===0?6:dow-1
      const monday = new Date(d); monday.setDate(d.getDate()-(dow===0?6:dow-1)); monday.setHours(12,0,0,0)
      const ws = monday.toISOString().split('T')[0]
      const wg = plans.find(p=>p.week_start===ws && p.plan_type==='gym')
      if ((wg?.days||[])[dayIdx]?.sessions?.some(s=>!s.isRest)) count++
    }
    return count
  })()

  const planUntilGolf = (() => {
    let latest = null
    plans.filter(p=>p.plan_type==='golf').forEach(p => {
      ;(p.days||[]).forEach((day,di) => {
        if ((day?.sessions||[]).some(s=>!s.isRest)) {
          const d = new Date(p.week_start+'T12:00:00'); d.setDate(d.getDate()+di)
          const ds = d.toISOString().split('T')[0]
          if (!latest || ds > latest) latest = ds
        }
      })
    })
    return latest
  })()

  const planUntilGym = (() => {
    let latest = null
    plans.filter(p=>p.plan_type==='gym').forEach(p => {
      ;(p.days||[]).forEach((day,di) => {
        if ((day?.sessions||[]).some(s=>!s.isRest)) {
          const d = new Date(p.week_start+'T12:00:00'); d.setDate(d.getDate()+di)
          const ds = d.toISOString().split('T')[0]
          if (!latest || ds > latest) latest = ds
        }
      })
    })
    return latest
  })()

  const noGolfNext3 = upcomingGolf.length===0 || upcomingGolf[0]?.offset > 3
  const noGymNext3  = upcomingGym.length===0  || upcomingGym[0]?.offset  > 3

  const weekPlannedDaysGolf = (golfPlan?.days||[]).filter(d=>d?.sessions?.some(s=>!s.isRest)).length
  const weekMissingDaysGolf = 7 - weekPlannedDaysGolf
  const lastUpdatedGolf = [...plans].filter(p=>p.plan_type==='golf').sort((a,b)=>(b.updated_at||'').localeCompare(a.updated_at||''))[0]?.updated_at
  const weekPlannedDaysGym = (gymPlan?.days||[]).filter(d=>d?.sessions?.some(s=>!s.isRest)).length
  const weekMissingDaysGym = 7 - weekPlannedDaysGym
  const lastUpdatedGym = [...plans].filter(p=>p.plan_type==='gym').sort((a,b)=>(b.updated_at||'').localeCompare(a.updated_at||''))[0]?.updated_at

  const combinedDays = Array(7).fill(null).map((_,i) => {
    const g  = (golfPlan?.days||[])[i]||{sessions:[]}
    const gy = (gymPlan?.days||[])[i]||{sessions:[]}
    return {sessions:[...(g.sessions||[]).map(s=>({...s,_type:'golf'})), ...(gy.sessions||[]).map(s=>({...s,_type:'gym'}))]}
  })
  const todayIdx = (() => { const d=new Date().getDay(); return d===0?6:d-1 })()

  const prog = (() => {
    let totalProg=0, totalItems=0
    combinedDays.forEach(d=>d?.sessions?.forEach(s=>s.items?.forEach(i=>{ totalItems++; totalProg+=itemProgress(i) })))
    return { totalItems, pct: totalItems>0 ? Math.round(totalProg/totalItems) : 0 }
  })()

  const inp   = {background:t.bg,border:`1px solid ${t.border}`,borderRadius:'6px',color:t.text,padding:'7px 10px',fontSize:'13px',fontFamily:F,outline:'none',width:'100%',boxSizing:'border-box'}
  const smInp = {...inp,padding:'5px 8px',fontSize:'12px',width:'auto'}
  const card  = {background:t.surface,border:`1px solid ${t.border}`,borderRadius:'12px',padding:'16px 20px'}
  const typeColor = wizardType==='golf' ? golfColor : gymColor

  const subLabels = [
    { key:'plan', role:'COACH', label: lang==='pt' ? 'Plano Semanal' : 'Weekly Plan',
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      bg:'#E6F1FB', color:'#185FA5' },
    { key:'priorities', role:'ATHLETE', label: lang==='pt' ? 'Prioridades' : 'Priorities',
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
      bg:'#fdf4ff', color:'#7e22ce' },
    { key:'log', role:'ATHLETE', label: lang==='pt' ? 'Registar Treino' : 'Log Session',
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
      bg:'#EAF3DE', color:'#27500A' },
    { key:'progress', role:'', label: lang==='pt' ? 'Progresso' : 'Progress',
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
      bg:t.navActive||'#f5f5f5', color:t.textMuted },
    { key:'periodizacao', role:'COACH', label:'Periodização',
      icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>,
      bg:'#fdf4ff', color:'#7e22ce' },
  ]

  // ── PERIODIZAÇÃO ────────────────────────────────────────────────────────────
  const PHASES = {
    peak:             { id:'peak',               label:'PEAK',                   color:'#ef4444', bg:'#fef2f2',
      situacao:'Vais competir esta semana.', regra:'Não mudes nada. Faz o que já sabes.', hoje:'Putting + wedges + confiança.',
      golfSugestao:['30–45 min putting: ritmo e distância','wedges 50–80m: controlo','poucos drivers: sensação','rotina pré-volta'],
      gymSugestao:['ativação leve: mobilidade + core','20–30 min máximo'],
      evitar:['treino pesado','mudanças técnicas','muitas bolas'],
    },
    manutencao:       { id:'manutencao',         label:'MANUTENÇÃO B2B',         color:'#f97316', bg:'#fff7ed',
      situacao:'Entre competições próximas.', regra:'Recuperar e manter.', hoje:'Leve + sensações.',
      golfSugestao:['putting','wedges','poucos ferros','sessão curta'],
      gymSugestao:['recuperação ativa','mobilidade','ativação leve'],
      evitar:['carga física','técnica nova'],
    },
    afinacao:         { id:'afinacao',           label:'AFINAÇÃO',               color:'#eab308', bg:'#fefce8',
      situacao:'Competição nos próximos dias.', regra:'Afinar, não mudar.', hoje:'Jogo curto + ritmo.',
      golfSugestao:['putting competitivo: 1 bola, pressão','wedges: distâncias','ferro médio: controlo','rotina consistente'],
      gymSugestao:['leve a moderado','mobilidade','velocidade leve'],
      evitar:['técnica nova','sessões longas'],
    },
    desenvolvimentoLight:{ id:'desenvolvimentoLight', label:'DESENVOLVIMENTO LIGHT', color:'#60a5fa', bg:'#eff6ff',
      situacao:'Tens pouco tempo entre torneios.', regra:'Melhorar sem cansar.', hoje:'Técnica leve + controlo.',
      golfSugestao:['wedges + putting','drills simples: contacto / alinhamento','controlo de distâncias','sessões curtas'],
      gymSugestao:['moderado','força leve','mobilidade'],
      evitar:['carga alta','volume excessivo'],
    },
    desenvolvimento:  { id:'desenvolvimento',    label:'DESENVOLVIMENTO',         color:'#3b82f6', bg:'#dbeafe',
      situacao:'Tens 2–3 semanas até competir.', regra:'Treinar para jogar melhor.', hoje:'Range com intenção + velocidade.',
      golfSugestao:['treino de velocidade: driver','ferro com alvo e objetivo','drills com feedback','sessões com foco claro'],
      gymSugestao:['força + potência','velocidade','sessões completas'],
      evitar:['bater bolas sem objetivo'],
    },
    acumulacao:       { id:'acumulacao',         label:'ACUMULAÇÃO',             color:'#22c55e', bg:'#f0fdf4',
      situacao:'Longe de competições.', regra:'Construir base.', hoje:'Volume + técnica.',
      golfSugestao:['muitas bolas no range','técnica detalhada','repetição controlada','putting básico consistente'],
      gymSugestao:['força base','volume mais alto','progressão de carga'],
      evitar:['foco em score','pouca repetição'],
    },
    descarga:         { id:'descarga',           label:'DESCARGA',               color:'#9ca3af', bg:'#f3f4f6',
      situacao:'Vens de carga alta ou estás cansada.', regra:'Reduzir carga.', hoje:'Leve + recuperar.',
      golfSugestao:['putting leve','wedges simples','poucos swings','ritmo sem pressão'],
      gymSugestao:['mobilidade','recuperação','muito leve'],
      evitar:['intensidade alta','volume'],
    },
    descanso:         { id:'descanso',           label:'DESCANSO',               color:'#6b7280', bg:'#f9fafb',
      situacao:'Estás cansada física ou mentalmente.', regra:'Parar para recuperar.', hoje:'Descansar.',
      golfSugestao:['opcional: putting leve','ou zero treino'],
      gymSugestao:['descanso total'],
      evitar:['treinar por obrigação'],
    },
  }

  const computeAllPhases = (weekStarts, evts) => {
    const isCompEvent = (e) => (e.category||'').toLowerCase().includes('competi') || (e.title||'').toLowerCase().includes('torneio')
    const comps = evts.filter(isCompEvent)
    const msDay = 86400000
    const wsMs = (ws) => new Date(ws+'T12:00:00').getTime()
    const weekHasComp = (ws) => { const s=wsMs(ws),e=s+6*msDay; return comps.some(c=>{ const cs=new Date(c.start_date+'T12:00:00').getTime(),ce=c.end_date?new Date(c.end_date+'T12:00:00').getTime():cs; return cs<=e&&ce>=s }) }
    const daysToNext = (ws) => { const wsM=wsMs(ws); let mn=null; comps.forEach(c=>{ const cs=new Date(c.start_date+'T12:00:00').getTime(); if(cs>wsM&&(mn===null||cs<mn))mn=cs }); return mn===null?999:Math.round((mn-wsM)/msDay) }
    const daysSinceLast = (ws) => { const wsM=wsMs(ws); let lat=null; comps.forEach(c=>{ const ce=c.end_date?new Date(c.end_date+'T12:00:00').getTime():new Date(c.start_date+'T12:00:00').getTime(); if(ce<wsM&&(lat===null||ce>lat))lat=ce }); return lat===null?999:Math.round((wsM-lat)/msDay) }
    const sorted=[...weekStarts].sort()
    const phases={}, alerts={}
    sorted.forEach((ws,idx)=>{
      const wa=[]
      // Yellow alerts
      if(idx>=3){
        const p4=sorted.slice(idx-3,idx+1)
        if(p4.filter(w=>weekHasComp(w)).length>=3) wa.push({level:'yellow',icon:'⚠️',text:'3 competições nas últimas 4 semanas — considera uma semana de descarga'})
        if(p4.every(w=>phases[w]&&!['descarga','descanso'].includes(phases[w]))) wa.push({level:'yellow',icon:'⚠️',text:'Sem semana de descarga há 4+ semanas — considera reduzir carga'})
      }
      // Red alerts
      if(idx>=5){ const p6=sorted.slice(idx-5,idx+1); if(p6.every(w=>phases[w]&&!['descarga','descanso'].includes(phases[w]))) wa.push({level:'red',icon:'🔴',text:'6 semanas sem descarga — risco de fadiga acumulada'}) }
      if(idx>=4){ if(sorted.slice(idx-4,idx+1).filter(w=>weekHasComp(w)).length>=4) wa.push({level:'red',icon:'🔴',text:'4 competições em 5 semanas — reduzir carga urgente'}) }
      // B2B alert
      const nextWs=sorted[idx+1]
      if(weekHasComp(ws)&&nextWs&&weekHasComp(nextWs)) wa.push({level:'orange',icon:'🔴',text:'B2B — competições em semanas consecutivas'})
      alerts[ws]=wa
      const hasRed=wa.some(a=>a.level==='red'), hasYellow=wa.some(a=>a.level==='yellow')
      const thisC=weekHasComp(ws), dtN=daysToNext(ws), dsL=daysSinceLast(ws)
      let phId
      if(hasRed) phId='descanso'
      else if(hasYellow) phId='descarga'
      else if(thisC) phId='peak'
      else if(dsL<=7&&dtN>=1&&dtN<=7) phId='manutencao'
      else if(dtN>=1&&dtN<=7) phId='afinacao'
      else if(dtN<=14) phId='desenvolvimentoLight'
      else if(dtN<=21) phId='desenvolvimento'
      else phId='acumulacao'
      phases[ws]=phId
    })
    return {phases,alerts}
  }

  const getPhaseSummary = (ws, evts, phId) => {
    const ph = PHASES[phId] || PHASES.acumulacao
    const isCompEvent = (e) => (e.category||'').toLowerCase().includes('competi') || (e.title||'').toLowerCase().includes('torneio')
    const comps = evts.filter(isCompEvent)
    const msDay = 86400000
    const wsM = new Date(ws+'T12:00:00').getTime()
    let nextComp=null, minCs=null
    comps.forEach(c=>{ const cs=new Date(c.start_date+'T12:00:00').getTime(); if(cs>wsM&&(minCs===null||cs<minCs)){minCs=cs;nextComp=c} })
    let prevComp=null, maxCe=null
    comps.forEach(c=>{ const ce=c.end_date?new Date(c.end_date+'T12:00:00').getTime():new Date(c.start_date+'T12:00:00').getTime(); if(ce<wsM&&(maxCe===null||ce>maxCe)){maxCe=ce;prevComp=c} })
    return {
      phase:phId, reason:ph.situacao,
      nextCompetition:nextComp?.title||null, daysToNextCompetition:minCs?Math.round((minCs-wsM)/msDay):null,
      previousCompetition:prevComp?.title||null, daysSincePreviousCompetition:maxCe?Math.round((wsM-maxCe)/msDay):null,
      recommendedToday:ph.hoje, golfSuggestion:ph.golfSugestao, gymSuggestion:ph.gymSugestao, avoid:ph.evitar,
    }
  }

  const applyTemplate = (tpl) => {
    const newDayPlans={}, newSessionTypes={}
    ;(tpl.days||[]).forEach((dayConfig,dayIdx)=>{
      datesInRange.forEach(ds=>{
        const d=new Date(ds+'T12:00:00'); const dow=d.getDay(); const di=dow===0?6:dow-1
        if(di===dayIdx){
          if(dayConfig?.isRest) newDayPlans[ds]=[{id:'rest',name:'Descanso',cat:'Descanso',isRest:true}]
          else if(dayConfig?.items?.length){ newDayPlans[ds]=dayConfig.items; if(dayConfig.session_type) newSessionTypes[ds]=dayConfig.session_type }
        }
      })
    })
    setWizardDayPlans(prev=>({...prev,...newDayPlans}))
    setWizardSessionTypes(prev=>({...prev,...newSessionTypes}))
  }

  const saveAsTemplate = async (name) => {
    if(!name.trim()) return
    setSavingTemplate(true)
    const tplDays=Array(7).fill(null).map((_,dayIdx)=>{
      const ds=datesInRange.find(d=>{ const dd=new Date(d+'T12:00:00'); const dow=dd.getDay(); return (dow===0?6:dow-1)===dayIdx })
      if(!ds) return {items:[],session_type:null,isRest:false}
      const items=wizardDayPlans[ds]||[]
      if(items[0]?.isRest) return {items:[],session_type:null,isRest:true}
      return {items,session_type:wizardSessionTypes[ds]||null,isRest:false}
    })
    await supabase.from('training_plan_templates').insert({name:name.trim(),plan_type:wizardType,days:tplDays,created_by:email,created_at:new Date().toISOString()})
    setSavingTemplate(false)
    setShowSaveTemplate(false)
    setWizardTemplateName('')
    fetchTemplates()
  }

  const deleteTemplate = async (id) => {
    await supabase.from('training_plan_templates').delete().eq('id',id)
    fetchTemplates()
  }

  const navigateToWeek = (ws) => {
    const currentWs = getWeekStart(0)
    const diff = Math.round((new Date(ws+'T12:00:00') - new Date(currentWs+'T12:00:00')) / (7*86400000))
    setWeekOffset(diff)
    setSubTab('log')
  }

  const savePhaseOverride = async (ws, phaseId) => {
    setSavingPhaseOverride(true)
    await supabase.from('periodization_overrides').upsert(
      { week_start:ws, phase:phaseId, created_by:email, created_at:new Date().toISOString() },
      { onConflict:'week_start' }
    )
    setPhaseOverrides(prev => ({ ...prev, [ws]: phaseId }))
    setEditingPhaseWs(null)
    setSavingPhaseOverride(false)
  }

  const clearPhaseOverride = async (ws) => {
    await supabase.from('periodization_overrides').delete().eq('week_start', ws)
    setPhaseOverrides(prev => { const next = { ...prev }; delete next[ws]; return next })
    setEditingPhaseWs(null)
  }

  // ── WIZARD ─────────────────────────────────────────────────────────────────
  if (wizard) {
    const primaryItems = wizardDayPlans[primaryChip] || []
    const isRestDay    = primaryItems[0]?.isRest === true
    const chipHasData  = (ds) => (wizardDayPlans[ds]||[]).length > 0
    const totalBalls   = primaryItems.filter(i=>!i.isRest).reduce((a,i)=>a+(parseInt(i.qty)||0),0)
    const totalMins    = primaryItems.filter(i=>!i.isRest).reduce((a,i)=>a+estimateMins(i),0)

    const chipsByWeek = (() => {
      const weeks = {}
      datesInRange.forEach(ds => {
        const d = new Date(ds+'T12:00:00')
        const dow = d.getDay()
        const monday = new Date(d)
        monday.setDate(d.getDate()-(dow===0?6:dow-1))
        monday.setHours(12,0,0,0)
        const ws = monday.toISOString().split('T')[0]
        if (!weeks[ws]) weeks[ws]=[]
        weeks[ws].push(ds)
      })
      return weeks
    })()
    const wizardWeekStarts = Object.keys(chipsByWeek)
    const { phases: weekPhases, alerts: weekAlerts } = computeAllPhases(wizardWeekStarts, eventsData)

    return (
      <div style={{fontFamily:F,color:t.text}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <div>
            <div style={{fontSize:'9px',letterSpacing:'2px',color:typeColor,fontWeight:600,marginBottom:'3px'}}>
              {wizardType==='golf'?'COACH GOLF':'COACH GYM'} · CRIAR PLANO
            </div>
            <div style={{fontSize:'20px',fontWeight:800,color:t.text}}>Criar Plano</div>
          </div>
          <button onClick={()=>{setWizard(false);setWizardStep(1);setWizardDayPlans({});setWizardSelectedChips([]);setWizardSessionTypes({});setShowSaveTemplate(false);setWizardTemplateName('');setWizardError('')}}
            style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'8px 16px',cursor:'pointer',fontSize:'13px',fontFamily:F}}>
            Cancelar
          </button>
        </div>

        <div style={{display:'flex',alignItems:'center',marginBottom:'24px'}}>
          {[1,2].map((s,i)=>(
            <div key={s} style={{display:'flex',alignItems:'center',flex:i===0?'0 0 auto':1}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{width:'28px',height:'28px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:700,
                  background:wizardStep>s?gymColor:wizardStep===s?typeColor:t.border,
                  color:wizardStep>=s?'#fff':t.textMuted}}>
                  {wizardStep>s?'✓':s}
                </div>
                <span style={{fontSize:'13px',fontWeight:600,color:wizardStep>=s?t.text:t.textMuted}}>
                  {s===1?'Período':'Definir sessões'}
                </span>
              </div>
              {i===0 && <div style={{flex:1,height:'1px',background:t.border,margin:'0 12px',minWidth:'40px'}}/>}
            </div>
          ))}
        </div>

        {/* ── STEP 1 ── */}
        {wizardStep===1 && (
          <div style={card}>
            <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'18px'}}>PERÍODO DO PLANO</div>

            {/* Template selector */}
            {templates.filter(tpl=>tpl.plan_type===wizardType).length > 0 && (
              <div style={{marginBottom:'20px'}}>
                <div style={{fontSize:'9px',letterSpacing:'2px',color:typeColor,fontWeight:600,marginBottom:'10px'}}>TEMPLATES GUARDADOS</div>
                <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                  {templates.filter(tpl=>tpl.plan_type===wizardType).map(tpl=>(
                    <div key={tpl.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:t.bg,border:`1px solid ${t.border}`,borderRadius:'8px',padding:'10px 14px'}}>
                      <div style={{fontSize:'13px',fontWeight:600,color:t.text}}>{tpl.name}</div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={()=>applyTemplate(tpl)} title='Aplicar template'
                          style={{background:typeColor,border:'none',borderRadius:'6px',color:'#fff',padding:'4px 10px',cursor:'pointer',fontSize:'11px',fontWeight:700,fontFamily:F}}>
                          Usar este Template
                        </button>
                        <button onClick={()=>deleteTemplate(tpl.id)} title='Apagar template'
                          style={{background:'transparent',border:`1px solid #ef4444`,borderRadius:'6px',color:'#ef4444',padding:'4px 10px',cursor:'pointer',fontSize:'11px',fontFamily:F}}>
                          Apagar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{height:'1px',background:t.border,margin:'14px 0'}}/>
              </div>
            )}

            {/* Dates stacked vertically */}
            <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'20px'}}>
              <div>
                <div style={{fontSize:'10px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'6px'}}>DATA DE INÍCIO</div>
                <input type='date' value={wizardStartDate} onChange={e=>setWizardStartDate(e.target.value)} style={{...inp,maxWidth:'200px'}}/>
              </div>
              <div>
                <div style={{fontSize:'10px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'6px'}}>DATA DE FIM</div>
                <input type='date' value={wizardEndDate} onChange={e=>setWizardEndDate(e.target.value)} style={{...inp,maxWidth:'200px'}}/>
              </div>
            </div>

            {wizardStartDate && wizardEndDate && datesInRange.length>0 && (
              <div style={{background:typeColor+'11',border:`1px solid ${typeColor}33`,borderRadius:'8px',padding:'10px 14px',marginBottom:'16px'}}>
                <div style={{fontSize:'12px',fontWeight:600,color:typeColor}}>
                  {datesInRange.length} dia{datesInRange.length!==1?'s':''} de treino
                </div>
                <div style={{fontSize:'11px',color:t.textMuted,marginTop:'2px'}}>
                  {new Date(wizardStartDate+'T12:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'long'})} → {new Date(wizardEndDate+'T12:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'})}
                </div>
              </div>
            )}

            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'10px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'6px'}}>NOTA GERAL (OPCIONAL)</div>
              <textarea value={wizardNote} onChange={e=>setWizardNote(e.target.value)}
                placeholder='Objectivos, instruções gerais para a atleta...'
                style={{...inp,minHeight:'56px',resize:'vertical'}}/>
            </div>

            <button disabled={datesInRange.length===0}
              onClick={()=>{ setWizardSelectedChips([]); setWizardStep(2) }}
              style={{background:datesInRange.length===0?t.border:typeColor,border:'none',borderRadius:'8px',
                color:datesInRange.length===0?t.textMuted:'#fff',padding:'12px 24px',fontSize:'14px',
                fontWeight:700,cursor:datesInRange.length===0?'not-allowed':'pointer',fontFamily:F,width:'100%'}}>
              {datesInRange.length===0?'Define o período de treino':'Definir Sessões →'}
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {wizardStep===2 && (
          <div>
            <div style={{...card,marginBottom:'16px',padding:'14px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600}}>
                  DIAS DO PLANO — selecciona um ou mais para configurar
                </div>
                <button onClick={()=>setWizardStep(1)}
                  style={{background:'transparent',border:'none',color:t.textMuted,cursor:'pointer',fontSize:'12px',fontFamily:F}}>
                  ← Voltar
                </button>
              </div>
              {Object.entries(chipsByWeek).map(([ws,dates])=>{
                const ph = weekPhases[ws] ? PHASES[weekPhases[ws]] : null
                const wa = weekAlerts[ws] || []
                return (
                <div key={ws} style={{marginBottom:'12px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'5px',flexWrap:'wrap'}}>
                    <div style={{fontSize:'9px',letterSpacing:'1px',color:t.textMuted,fontWeight:600}}>{formatWeek(ws)}</div>
                    {ph && <div style={{padding:'2px 8px',borderRadius:'4px',fontSize:'8px',fontWeight:700,letterSpacing:'1px',color:ph.color,background:ph.bg}}>{ph.label}</div>}
                    {wa.map((a,i)=><div key={i} style={{fontSize:'9px',color:a.icon==='🔴'?'#ef4444':'#f59e0b'}}>{a.icon} {a.text}</div>)}
                  </div>
                  <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                    {dates.map(ds=>{
                      const d = new Date(ds+'T12:00:00')
                      const dow = d.getDay(); const dayIdx = dow===0?6:dow-1
                      const selected = wizardSelectedChips.includes(ds)
                      const hasData  = chipHasData(ds)
                      const isComp   = dateHasComp(ds)
                      return (
                        <button key={ds} onClick={()=>toggleChip(ds)}
                          style={{padding:'5px 10px',borderRadius:'8px',fontFamily:F,fontSize:'11px',fontWeight:selected?700:400,cursor:'pointer',
                            border:`1px solid ${isComp?'#BA7517':selected?typeColor:hasData?typeColor+'55':t.border}`,
                            background:isComp?'#FFF3CD':selected?typeColor:hasData?typeColor+'11':'transparent',
                            color:isComp?'#854F0B':selected?'#fff':hasData?typeColor:t.textMuted,
                            display:'flex',flexDirection:'column',alignItems:'center',gap:'1px',minWidth:0}}>
                          <span>{DAYS_SHORT_PT[dayIdx]} {d.getDate()} {isComp?'🏆':!isComp&&hasData?'✓':selected?'✓':''}</span>
                          {isComp && compOnDate(ds)?.title && (
                            <span style={{fontSize:'7px',maxWidth:'68px',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',lineHeight:1.2,color:'#854F0B'}}>
                              {compOnDate(ds).title}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
                )
              })}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'6px',flexWrap:'wrap',gap:'6px'}}>
                {wizardSelectedChips.length>1 ? (
                  <div style={{fontSize:'11px',color:typeColor,fontWeight:600}}>
                    {wizardSelectedChips.length} dias seleccionados
                  </div>
                ) : <div/>}
                <div style={{display:'flex',gap:'6px'}}>
                  <button onClick={()=>setWizardSelectedChips([...datesInRange])}
                    style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'3px 8px',cursor:'pointer',fontSize:'10px',fontFamily:F}}>
                    Seleccionar Todos
                  </button>
                  <button onClick={()=>setWizardSelectedChips([])}
                    style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'3px 8px',cursor:'pointer',fontSize:'10px',fontFamily:F}}>
                    Limpar Selecção
                  </button>
                </div>
              </div>
            </div>

            {/* Competition day legend */}
            {datesInRange.some(ds=>dateHasComp(ds)) && (
              <div style={{fontSize:'11px',color:'#854F0B',marginBottom:'10px',display:'flex',alignItems:'center',gap:'5px'}}>
                <span>🏆</span> Dias com competição marcada — não é necessário registar treino.
              </div>
            )}

            {wizardSelectedChips.length===0 ? (
              <div style={{...card,textAlign:'center',padding:'40px',color:t.textMuted,fontSize:'13px'}}>
                Selecciona um ou mais dias acima para configurar a sessão
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                {/* Left: library */}
                <div>
                  <div style={{...card,marginBottom:'10px',padding:'11px 14px'}}>
                    {isRestDay ? (
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div style={{fontSize:'13px',fontWeight:700,color:'#f59e0b'}}>Descanso marcado</div>
                        <button onClick={clearRestDay}
                          style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'4px 10px',cursor:'pointer',fontSize:'11px',fontFamily:F}}>
                          Remover Descanso
                        </button>
                      </div>
                    ) : (
                      <button onClick={markRestDay}
                        style={{width:'100%',background:'transparent',border:`1px dashed ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'8px',cursor:'pointer',fontSize:'12px',fontFamily:F}}>
                        Marcar Descanso
                      </button>
                    )}
                  </div>

                  {!isRestDay && !dateHasComp(primaryChip) && (
                    <div style={{...card,marginBottom:'10px',padding:'11px 14px'}}>
                      <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'8px'}}>TIPO DE SESSÃO</div>
                      <div style={{display:'flex',gap:'6px'}}>
                        {[{v:'coach',l:'Com Coach'},{v:'auto',l:'Autónomo'}].map(opt=>{
                          const active = wizardSelectedChips.length>0 && wizardSelectedChips.every(ds=>wizardSessionTypes[ds]===opt.v)
                          return (
                            <button key={opt.v}
                              onClick={()=>setWizardSessionTypes(prev=>{ const next={...prev}; wizardSelectedChips.forEach(ds=>{ next[ds]=opt.v }); return next })}
                              style={{flex:1,padding:'7px',borderRadius:'8px',fontFamily:F,fontSize:'12px',fontWeight:active?700:400,cursor:'pointer',
                                border:`1px solid ${active?typeColor:t.border}`,
                                background:active?typeColor+'18':'transparent',
                                color:active?typeColor:t.textMuted}}>
                              {opt.l}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

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
                            <div key={ex.id} onClick={()=>toggleDrill(ex)}
                              style={{borderTop:`1px solid ${t.border}`,padding:'9px 14px',background:sel?typeColor+'0d':'transparent',cursor:'pointer'}}>
                              <div style={{display:'flex',alignItems:'flex-start',gap:'8px'}}>
                                <div style={{width:'18px',height:'18px',borderRadius:'4px',flexShrink:0,marginTop:'1px',
                                  border:`2px solid ${sel?typeColor:t.border}`,background:sel?typeColor:'transparent',
                                  display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'11px',fontWeight:900}}>
                                  {sel?'✓':''}
                                </div>
                                <div style={{flex:1}}
                                  onMouseEnter={()=>setTooltipId(ex.id)}
                                  onMouseLeave={()=>setTooltipId(null)}>
                                  <div style={{fontSize:'12px',fontWeight:sel?600:400,color:sel?typeColor:t.text}}>{ex.name}</div>
                                  <div style={{fontSize:'10px',color:t.textMuted,marginTop:'1px'}}>{ex.desc.length>50?ex.desc.slice(0,50)+'…':ex.desc}</div>
                                  {tooltipId===ex.id && (
                                    <div style={{position:'absolute',zIndex:100,background:theme==='dark'?'#1a1a1a':'#fff',
                                      border:`1px solid ${t.border}`,borderRadius:'8px',padding:'8px 12px',width:'220px',
                                      boxShadow:'0 4px 16px rgba(0,0,0,0.15)',marginTop:'4px'}}>
                                      <div style={{fontSize:'11px',fontWeight:700,color:typeColor,marginBottom:'3px'}}>{ex.name}</div>
                                      <div style={{fontSize:'11px',color:t.text,lineHeight:1.5}}>{ex.desc}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}

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

                {/* Right: current chip detail */}
                <div>
                  <div style={{...card,position:'sticky',top:'16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                      <div>
                        <div style={{fontSize:'9px',letterSpacing:'2px',color:typeColor,fontWeight:600,marginBottom:'2px'}}>
                          {wizardSelectedChips.length===1
                            ? (() => { const d=new Date(primaryChip+'T12:00:00'); return `${DAYS_SHORT_PT[d.getDay()===0?6:d.getDay()-1]} ${d.getDate()}/${d.getMonth()+1}` })()
                            : `${wizardSelectedChips.length} dias`}
                        </div>
                        {wizardType==='golf' && primaryItems.filter(i=>!i.isRest).length>0 && (
                          <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                            <div style={{fontSize:'11px',color:t.textMuted}}>{totalBalls} bolas</div>
                            {totalMins>0 && (
                              <div style={{fontSize:'11px',color:typeColor,fontWeight:600}}>{fmtMins(totalMins)}</div>
                            )}
                          </div>
                        )}
                      </div>
                      {primaryItems.filter(i=>!i.isRest).length>0 && (
                        <button onClick={copyToAllChips}
                          style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'5px 10px',cursor:'pointer',fontSize:'11px',fontFamily:F}}>
                          Copiar para Todos os Dias
                        </button>
                      )}
                    </div>

                    {isRestDay && (
                      <div style={{textAlign:'center',padding:'24px',color:'#f59e0b',fontSize:'13px',fontWeight:600}}>Dia de Descanso</div>
                    )}
                    {!isRestDay && primaryItems.length===0 && (
                      <div style={{textAlign:'center',padding:'24px',color:t.textMuted,fontSize:'13px'}}>Selecciona exercícios à esquerda</div>
                    )}
                    {!isRestDay && primaryItems.map((item)=>(
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
                            <input type='number' value={item.qty||''} onChange={e=>updateItem(item.id,'qty',e.target.value)} placeholder='50' style={{...smInp,width:'80px'}}/>
                            <span style={{fontSize:'11px',color:t.textMuted}}>bolas</span>
                            {estimateMins(item)>0 && <span style={{fontSize:'10px',color:typeColor}}>{fmtMins(estimateMins(item))}</span>}
                          </div>
                        ) : (
                          <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                            <input type='number' value={item.sets||''} onChange={e=>updateItem(item.id,'sets',e.target.value)} placeholder='3' style={{...smInp,width:'60px'}}/>
                            <input type='number' value={item.reps||''} onChange={e=>updateItem(item.id,'reps',e.target.value)} placeholder='10' style={{...smInp,width:'60px'}}/>
                            <input value={item.load||''} onChange={e=>updateItem(item.id,'load',e.target.value)} placeholder='kg' style={{...smInp,width:'55px'}}/>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Validation error */}
            {wizardError && (
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'10px 14px',marginTop:'12px',fontSize:'12px',color:'#991b1b',fontWeight:600}}>
                ⚠ {wizardError}
              </div>
            )}

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'16px',flexWrap:'wrap',gap:'8px'}}>
              {/* Save as template */}
              {showSaveTemplate ? (
                <div style={{display:'flex',gap:'6px',alignItems:'center',flex:1,flexWrap:'wrap'}}>
                  <input value={wizardTemplateName} onChange={e=>setWizardTemplateName(e.target.value)}
                    placeholder='Nome do template' style={{...inp,flex:1,minWidth:'160px'}}/>
                  <button onClick={()=>saveAsTemplate(wizardTemplateName)} disabled={savingTemplate||!wizardTemplateName.trim()}
                    style={{background:savingTemplate?t.border:typeColor,border:'none',borderRadius:'8px',color:'#fff',padding:'8px 16px',cursor:savingTemplate?'not-allowed':'pointer',fontSize:'12px',fontWeight:700,fontFamily:F}}>
                    {savingTemplate?'...':'💾 Confirmar'}
                  </button>
                  <button onClick={()=>{setShowSaveTemplate(false);setWizardTemplateName('')}}
                    style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'8px 12px',cursor:'pointer',fontSize:'12px',fontFamily:F}}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button onClick={()=>setShowSaveTemplate(true)}
                  style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'8px 14px',cursor:'pointer',fontSize:'12px',fontFamily:F}}>
                  💾 Guardar como Template
                </button>
              )}
              <button onClick={saveWizard} disabled={saving||datesInRange.length===0}
                style={{background:saving?t.border:typeColor,border:'none',borderRadius:'8px',color:saving?t.textMuted:'#fff',
                  padding:'12px 28px',fontSize:'14px',fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:F}}>
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
      <style>{`
        .train-coach-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .train-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
        .train-perio-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        @media(max-width:700px){.train-coach-grid{grid-template-columns:repeat(2,1fr)}.train-stats-grid{grid-template-columns:repeat(2,1fr)}.train-perio-grid{grid-template-columns:1fr}}
        @media(max-width:400px){.train-coach-grid{grid-template-columns:1fr 1fr}}
      `}</style>

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

      {/* Tab header */}
      <div style={{ marginBottom:'20px' }}>
        <div style={{ fontSize:'9px', letterSpacing:'3px', color:golfColor, fontWeight:700, marginBottom:'3px' }}>PLAN</div>
        <div style={{ fontSize:'11px', color:t.textMuted }}>{lang==='pt' ? 'Plano de treino, prioridades e periodização' : 'Training plan, priorities and periodisation'}</div>
      </div>

      {/* ── SUB-TABS (compact pills) ── */}
      <div style={{display:'flex',gap:'6px',marginBottom:'24px',flexWrap:'wrap',paddingBottom:'14px',borderBottom:`1px solid ${t.border}`}}>
        {subLabels.map(({key,role,label,color})=>{
          const active = subTab===key
          return (
            <button key={key} onClick={()=>setSubTab(key)}
              style={{padding:'5px 14px',borderRadius:'20px',border:`1px solid ${active?color:t.border}`,
                background:active?color+'18':'transparent',color:active?color:t.textMuted,
                cursor:'pointer',fontSize:'11px',fontWeight:active?700:500,fontFamily:F,
                letterSpacing:'0.2px',whiteSpace:'nowrap'}}>
              {role ? <><span style={{fontSize:'8px',letterSpacing:'1px',opacity:0.65,marginRight:'4px'}}>{role}</span>{label}</> : label}
            </button>
          )
        })}
      </div>

      {/* ── SET THE PLAN ── */}
      {subTab==='plan' && (
        <div>
          {/* Legenda de periodização */}
          <div style={{...card,marginBottom:'16px',padding:'14px 16px'}}>
            <button onClick={()=>setShowLegend(p=>!p)} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',background:'transparent',border:'none',cursor:'pointer',fontFamily:F,padding:0}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600}}>LEGENDA DE FASES</div>
              <div style={{fontSize:'12px',color:t.textMuted}}>{showLegend?'▲':'▼'}</div>
            </button>
            {showLegend && (
              <div style={{marginTop:'12px',display:'flex',flexDirection:'column',gap:'6px'}}>
                {Object.values(PHASES).map(ph=>(
                  <div key={ph.id} style={{display:'flex',gap:'10px',alignItems:'flex-start',padding:'8px 10px',borderRadius:'8px',background:ph.bg,border:`1px solid ${ph.color}33`}}>
                    <div style={{padding:'2px 8px',borderRadius:'4px',fontSize:'8px',fontWeight:700,letterSpacing:'1px',color:'#fff',background:ph.color,whiteSpace:'nowrap',alignSelf:'flex-start',marginTop:'1px'}}>{ph.label}</div>
                    <div style={{display:'flex',flexDirection:'column',gap:'2px',flex:1}}>
                      <div style={{fontSize:'10px',color:t.text,fontWeight:600}}>{ph.situacao}</div>
                      <div style={{fontSize:'9px',color:t.textMuted}}>{ph.regra}</div>
                      <div style={{fontSize:'9px',color:ph.color,fontWeight:600}}>Hoje: {ph.hoje}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Templates guardados */}
          {templates.length > 0 && (
            <div style={{...card,marginBottom:'16px',padding:'14px 16px'}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'10px'}}>TEMPLATES DE PLANO</div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {templates.map(tpl=>(
                  <div key={tpl.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:t.bg,border:`1px solid ${t.border}`,borderRadius:'8px',padding:'8px 12px'}}>
                    <div>
                      <div style={{fontSize:'12px',fontWeight:700,color:t.text}}>{tpl.name}</div>
                      <div style={{fontSize:'9px',color:t.textMuted,marginTop:'1px'}}>{tpl.plan_type==='golf'?'Golf':'Gym'} · {(tpl.days||[]).filter(d=>d?.items?.length||d?.isRest).length} dias configurados</div>
                    </div>
                    <button onClick={()=>deleteTemplate(tpl.id)}
                      style={{background:'transparent',border:`1px solid #ef4444`,borderRadius:'6px',color:'#ef4444',padding:'4px 10px',cursor:'pointer',fontSize:'11px',fontFamily:F}}>
                      ✕ Apagar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create plan buttons — smaller coach cards */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
            <div style={{background:'#eaf4ff',border:`2px solid ${golfColor}`,borderRadius:'12px',padding:'14px 16px',cursor:'pointer'}}
              onClick={()=>{setWizardType('golf');setWizard(true);setWizardStep(1);setWizardStartDate('');setWizardEndDate('');setWizardActiveDays([0,1,2,3,4,5,6]);setWizardDayPlans({});setWizardSelectedChips([]);setWizardSessionTypes({});setWizardNote('');setWizardUserLib([]);setWizardError('')}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:golfColor,fontWeight:700,marginBottom:'2px'}}>COACH GOLF</div>
              <div style={{fontSize:'14px',fontWeight:800,color:golfDark}}>Golf Plan</div>
              <div style={{fontSize:'11px',color:'#185FA5',marginTop:'4px',lineHeight:1.4}}>Drills · bolas · campo</div>
              <div style={{marginTop:'10px',display:'inline-flex',alignItems:'center',gap:'4px',background:golfColor,color:'#fff',padding:'5px 12px',borderRadius:'6px',fontSize:'11px',fontWeight:700}}>
                + Criar
              </div>
            </div>
            <div style={{background:'#eafff0',border:`2px solid ${gymColor}`,borderRadius:'12px',padding:'14px 16px',cursor:'pointer'}}
              onClick={()=>{setWizardType('gym');setWizard(true);setWizardStep(1);setWizardStartDate('');setWizardEndDate('');setWizardActiveDays([0,1,2,3,4,5,6]);setWizardDayPlans({});setWizardSelectedChips([]);setWizardSessionTypes({});setWizardNote('');setWizardUserLib([]);setWizardError('')}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:gymColor,fontWeight:700,marginBottom:'2px'}}>COACH GYM</div>
              <div style={{fontSize:'14px',fontWeight:800,color:gymDark}}>Gym Plan</div>
              <div style={{fontSize:'11px',color:'#27500A',marginTop:'4px',lineHeight:1.4}}>Séries · reps · carga</div>
              <div style={{marginTop:'10px',display:'inline-flex',alignItems:'center',gap:'4px',background:gymColor,color:'#fff',padding:'5px 12px',borderRadius:'6px',fontSize:'11px',fontWeight:700}}>
                + Criar
              </div>
            </div>
          </div>

          {/* ── COACH PANELS split by type ── */}
          {/* Golf coach panel */}
          <div style={{...card,marginBottom:'12px',borderLeft:`4px solid ${noGolfNext3?'#ef4444':golfColor}`}}>
            <div style={{fontSize:'9px',letterSpacing:'2px',color:golfColor,fontWeight:600,marginBottom:'10px'}}>COACH GOLF</div>
            <div className="train-coach-grid" style={{marginBottom:noGolfNext3?'10px':'0'}}>
              <div>
                <div style={{fontSize:'10px',color:t.textMuted,marginBottom:'2px'}}>Esta semana</div>
                <div style={{fontSize:'22px',fontWeight:900,color:weekPlannedDaysGolf>0?golfColor:t.textMuted,lineHeight:1}}>{weekPlannedDaysGolf}</div>
                <div style={{fontSize:'10px',color:t.textMuted}}>dias planeados</div>
              </div>
              <div>
                <div style={{fontSize:'10px',color:t.textMuted,marginBottom:'2px'}}>Em falta</div>
                <div style={{fontSize:'22px',fontWeight:900,color:weekMissingDaysGolf===7?'#ef4444':weekMissingDaysGolf>3?'#f59e0b':golfColor,lineHeight:1}}>{weekMissingDaysGolf}</div>
                <div style={{fontSize:'10px',color:t.textMuted}}>dias sem plano</div>
              </div>
              <div>
                <div style={{fontSize:'10px',color:t.textMuted,marginBottom:'2px'}}>Próximo treino</div>
                {upcomingGolf[0] ? (
                  <div style={{fontSize:'15px',fontWeight:800,color:upcomingGolf[0].offset===0?gymColor:t.text,lineHeight:1.2}}>
                    {upcomingGolf[0].offset===0?'Hoje':upcomingGolf[0].offset===1?'Amanhã':`+${upcomingGolf[0].offset}d`}
                  </div>
                ) : (
                  <div style={{fontSize:'13px',color:'#ef4444',fontWeight:700}}>Nenhum</div>
                )}
              </div>
              <div>
                <div style={{fontSize:'10px',color:t.textMuted,marginBottom:'2px'}}>Actualizado</div>
                {lastUpdatedGolf ? (
                  <div style={{fontSize:'13px',fontWeight:700,color:t.text,lineHeight:1.3}}>
                    {new Date(lastUpdatedGolf).toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'})}
                  </div>
                ) : (
                  <div style={{fontSize:'13px',color:t.textMuted}}>—</div>
                )}
              </div>
            </div>
            {noGolfNext3 && (
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'8px 12px',display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{fontSize:'14px',flexShrink:0}}>🔴</div>
                <div style={{fontSize:'11px',color:'#991b1b',fontWeight:600}}>
                  {upcomingGolf.length===0
                    ? 'Sem treinos de golf planeados — cria um plano.'
                    : `Sem golf nos próximos 3 dias. Próximo em ${upcomingGolf[0].offset} dias.`}
                </div>
              </div>
            )}
          </div>

          {/* Gym coach panel */}
          <div style={{...card,marginBottom:'20px',borderLeft:`4px solid ${noGymNext3?'#ef4444':gymColor}`}}>
            <div style={{fontSize:'9px',letterSpacing:'2px',color:gymColor,fontWeight:600,marginBottom:'10px'}}>COACH GYM</div>
            <div className="train-coach-grid" style={{marginBottom:noGymNext3?'10px':'0'}}>
              <div>
                <div style={{fontSize:'10px',color:t.textMuted,marginBottom:'2px'}}>Esta semana</div>
                <div style={{fontSize:'22px',fontWeight:900,color:weekPlannedDaysGym>0?gymColor:t.textMuted,lineHeight:1}}>{weekPlannedDaysGym}</div>
                <div style={{fontSize:'10px',color:t.textMuted}}>dias planeados</div>
              </div>
              <div>
                <div style={{fontSize:'10px',color:t.textMuted,marginBottom:'2px'}}>Em falta</div>
                <div style={{fontSize:'22px',fontWeight:900,color:weekMissingDaysGym===7?'#ef4444':weekMissingDaysGym>3?'#f59e0b':gymColor,lineHeight:1}}>{weekMissingDaysGym}</div>
                <div style={{fontSize:'10px',color:t.textMuted}}>dias sem plano</div>
              </div>
              <div>
                <div style={{fontSize:'10px',color:t.textMuted,marginBottom:'2px'}}>Próximo treino</div>
                {upcomingGym[0] ? (
                  <div style={{fontSize:'15px',fontWeight:800,color:upcomingGym[0].offset===0?gymColor:t.text,lineHeight:1.2}}>
                    {upcomingGym[0].offset===0?'Hoje':upcomingGym[0].offset===1?'Amanhã':`+${upcomingGym[0].offset}d`}
                  </div>
                ) : (
                  <div style={{fontSize:'13px',color:'#ef4444',fontWeight:700}}>Nenhum</div>
                )}
              </div>
              <div>
                <div style={{fontSize:'10px',color:t.textMuted,marginBottom:'2px'}}>Actualizado</div>
                {lastUpdatedGym ? (
                  <div style={{fontSize:'13px',fontWeight:700,color:t.text,lineHeight:1.3}}>
                    {new Date(lastUpdatedGym).toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'})}
                  </div>
                ) : (
                  <div style={{fontSize:'13px',color:t.textMuted}}>—</div>
                )}
              </div>
            </div>
            {noGymNext3 && (
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'8px 12px',display:'flex',alignItems:'center',gap:'8px'}}>
                <div style={{fontSize:'14px',flexShrink:0}}>🔴</div>
                <div style={{fontSize:'11px',color:'#991b1b',fontWeight:600}}>
                  {upcomingGym.length===0
                    ? 'Sem treinos de ginásio planeados — cria um plano.'
                    : `Sem ginásio nos próximos 3 dias. Próximo em ${upcomingGym[0].offset} dias.`}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RECORD WHAT YOU DID ── */}
      {subTab==='log' && (() => {
        const allKnownWeeks = [...new Set(plans.map(p=>p.week_start).concat([weekStart]))].sort()
        const { phases: logPhases } = computeAllPhases(allKnownWeeks, eventsData)
        const logPhase = logPhases[weekStart] ? PHASES[logPhases[weekStart]] : null
        return (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'8px'}}>
            <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
              <button onClick={()=>setWeekOffset(w=>w-1)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'6px 10px',cursor:'pointer',fontFamily:F}}>‹</button>
              <div style={{fontSize:'13px',fontWeight:600,color:t.text,minWidth:'150px',textAlign:'center'}}>{formatWeek(weekStart)}</div>
              <button onClick={()=>setWeekOffset(w=>w+1)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'6px 10px',cursor:'pointer',fontFamily:F}}>›</button>
              <button onClick={()=>setWeekOffset(0)} style={{background:isCurrentWeek?'#eaf4ff':'transparent',border:`1px solid ${isCurrentWeek?golfColor:t.border}`,borderRadius:'6px',color:isCurrentWeek?golfColor:t.textMuted,padding:'6px 10px',cursor:'pointer',fontFamily:F,fontSize:'11px'}}>
                HOJE
              </button>
              {logPhase && <div style={{padding:'3px 8px',borderRadius:'4px',fontSize:'8px',fontWeight:700,letterSpacing:'1px',color:logPhase.color,background:logPhase.bg}}>{logPhase.label}</div>}
            </div>
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              {prog.totalItems>0 && (
                <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <div style={{height:'3px',width:'80px',background:t.border,borderRadius:'2px',overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${prog.pct}%`,background:prog.pct===100?gymColor:golfColor,borderRadius:'2px'}}/>
                  </div>
                  <div style={{fontSize:'12px',fontWeight:900,color:prog.pct===100?gymColor:golfColor}}>{prog.pct}%</div>
                </div>
              )}
              <button onClick={()=>setShowFreeSession(true)}
                style={{background:'transparent',border:`1px solid ${golfColor}`,borderRadius:'8px',color:golfColor,padding:'7px 14px',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:F}}>
                + Ronda no Campo
              </button>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'5px',marginBottom:'16px'}}>
            {DAYS_SHORT.map((d,i)=>{
              const dayD = combinedDays[i]||{sessions:[]}
              const items = dayD.sessions?.flatMap(s=>s.items||[])||[]
              const totalProg = items.reduce((a,item)=>a+itemProgress(item),0)
              const avgPct = items.length>0?Math.round(totalProg/items.length):null
              const isSelected = selectedDay===i; const isToday = i===todayIdx&&isCurrentWeek
              return (
                <div key={i} onClick={()=>setSelectedDay(i)}
                  style={{background:isSelected?'#eaf4ff':t.surface,border:`1px solid ${isSelected?golfColor:dayD.sessions?.length?golfColor+'44':t.border}`,borderRadius:'8px',padding:'9px 4px',textAlign:'center',cursor:'pointer'}}>
                  <div style={{fontSize:'9px',letterSpacing:'1px',color:isSelected?golfColor:isToday?t.text:t.textMuted,marginBottom:'5px',fontWeight:600}}>{d}</div>
                  {avgPct===null&&!dayD.sessions?.length&&<div style={{fontSize:'9px',color:t.border}}>—</div>}
                  {avgPct!==null&&<div style={{fontSize:'13px',fontWeight:900,color:avgPct===100?gymColor:avgPct>0?'#f59e0b':t.textMuted,lineHeight:1}}>{avgPct}%</div>}
                  {dayD.sessions?.length>0&&items.length===0&&<div style={{fontSize:'9px',color:golfColor,fontWeight:600}}>livre</div>}
                </div>
              )
            })}
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <div style={{fontSize:'15px',fontWeight:800,color:t.text}}>{DAYS_LONG[selectedDay]}</div>
            {selectedDay===todayIdx&&isCurrentWeek&&<div style={{fontSize:'9px',color:golfColor,letterSpacing:'2px',fontWeight:600}}>HOJE</div>}
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
                const sessItems = session.items||[]
                const avgProg = sessItems.length>0
                  ? Math.round(sessItems.reduce((a,i)=>a+itemProgress(i),0)/sessItems.length)
                  : null
                return (
                  <div key={si} style={{...card,borderLeft:`3px solid ${session.isRest?'#f59e0b':color}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                      <div>
                        <div style={{fontSize:'8px',letterSpacing:'3px',color:session.isRest?'#f59e0b':color,marginBottom:'2px',fontWeight:600}}>
                          {type.toUpperCase()}{session.free?' · CAMPO':session.isRest?' · DESCANSO':session.session_type==='coach'?' · COM COACH':session.session_type==='auto'?' · AUTÓNOMO':''}
                        </div>
                        {session.notes&&<div style={{fontSize:'12px',color:t.textMuted}}>{session.notes}</div>}
                        {session.score&&<div style={{fontSize:'13px',fontWeight:700,color:t.text}}>Score: {session.score}{session.holes?` (${session.holes}h)`:''}</div>}
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px',flexShrink:0}}>
                        {(email===COACH_GOLF||email===ADMIN)&&!session.free&&(
                          <button onClick={()=>{
                            const focusDate=(()=>{const d=new Date(weekStart+'T12:00:00');d.setDate(d.getDate()+selectedDay);return d.toISOString().split('T')[0]})()
                            openEditWizard(type,focusDate)
                          }} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'2px 8px',cursor:'pointer',fontSize:'10px',fontFamily:F}}>
                            ✏ Editar
                          </button>
                        )}
                        {avgProg!==null&&(
                          <div style={{fontSize:'12px',fontWeight:700,color:avgProg===100?gymColor:avgProg>0?'#f59e0b':t.textMuted}}>{avgProg}%</div>
                        )}
                      </div>
                    </div>
                    {session.isRest&&<div style={{fontSize:'13px',color:'#f59e0b',fontWeight:600}}>Dia de Descanso</div>}
                    {(!sessItems.length&&!session.isRest)&&<div style={{fontSize:'12px',color:t.textMuted,fontStyle:'italic'}}>Sessão registada.</div>}
                    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                      {sessItems.map((item,ii)=>{
                        const prog = itemProgress(item)
                        return (
                          <div key={ii} style={{background:t.bg,border:`1px solid ${prog===100?gymColor+'44':prog===50?'#f59e0b44':t.border}`,borderRadius:'8px',padding:'8px 10px'}}>
                            <div style={{display:'flex',alignItems:'flex-start',gap:'10px',marginBottom:'6px'}}>
                              <div style={{flex:1}}>
                                <div style={{fontSize:'12px',fontWeight:600,color:t.text}}>{item.name}</div>
                                <div style={{fontSize:'10px',color:t.textMuted,marginTop:'1px'}}>
                                  {type==='golf'?`${item.qty||'—'} bolas`:`${item.sets||'—'}×${item.reps||'—'}${item.load?' @ '+item.load+'kg':''}`}
                                </div>
                              </div>
                            </div>
                            {/* 3-state progress — compact */}
                            <div style={{display:'flex',gap:'3px',justifyContent:'flex-start'}}>
                              {[
                                {v:0,  label:'Não fiz', color:'#6b7280'},
                                {v:50, label:'50%',     color:'#f59e0b'},
                                {v:100,label:'Fiz',     color:gymColor},
                              ].map(({v,label,color:btnColor})=>{
                                const active = prog===v
                                return (
                                  <button key={v} onClick={()=>setItemProgress(realSi,ii,type,v)}
                                    style={{padding:'3px 10px',borderRadius:'5px',border:`1px solid ${active?btnColor:t.border}`,
                                      background:active?btnColor+'22':'transparent',color:active?btnColor:t.textMuted,
                                      fontSize:'9px',fontWeight:active?700:400,cursor:'pointer',fontFamily:F,whiteSpace:'nowrap'}}>
                                    {label}
                                  </button>
                                )
                              })}
                            </div>
                            {!item.done && type==='gym' && prog<100 && (
                              <div style={{display:'flex',gap:'6px',marginTop:'6px'}}>
                                <input placeholder={`Sets (${item.sets||3})`} value={item.sets_actual||''} onChange={async e=>{const d=JSON.parse(JSON.stringify(gymPlan?.days||[]));const it=d[selectedDay]?.sessions?.[realSi]?.items?.[ii];if(it){it.sets_actual=e.target.value;await savePlan(d,'gym')}}} style={{...smInp,width:'100px'}}/>
                                <input placeholder={`Reps (${item.reps||10})`} value={item.reps_actual||''} onChange={async e=>{const d=JSON.parse(JSON.stringify(gymPlan?.days||[]));const it=d[selectedDay]?.sessions?.[realSi]?.items?.[ii];if(it){it.reps_actual=e.target.value;await savePlan(d,'gym')}}} style={{...smInp,width:'100px'}}/>
                                <input placeholder={`kg (${item.load||'—'})`} value={item.load_actual||''} onChange={async e=>{const d=JSON.parse(JSON.stringify(gymPlan?.days||[]));const it=d[selectedDay]?.sessions?.[realSi]?.items?.[ii];if(it){it.load_actual=e.target.value;await savePlan(d,'gym')}}} style={{...smInp,width:'90px'}}/>
                              </div>
                            )}
                          </div>
                        )
                      })}
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
                Guardar Nota
              </button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* ── TRACK PROGRESS ── */}
      {subTab==='progress' && (() => {
        // Period filter → earliest date to include
        const periodStart = (() => {
          const now = new Date()
          if (progressPeriod==='week')    { const d=new Date(now); d.setDate(d.getDate()-7);      return d.toISOString().split('T')[0] }
          if (progressPeriod==='month')   { const d=new Date(now); d.setMonth(d.getMonth()-1);    return d.toISOString().split('T')[0] }
          if (progressPeriod==='3months') { const d=new Date(now); d.setMonth(d.getMonth()-3);    return d.toISOString().split('T')[0] }
          if (progressPeriod==='year')    { const d=new Date(now); d.setFullYear(d.getFullYear()-1); return d.toISOString().split('T')[0] }
          return null
        })()

        const filteredPlans = plans.filter(p => {
          if (progressType!=='all' && p.plan_type!==progressType) return false
          if (periodStart && p.week_start < periodStart) return false
          return true
        })

        const allSessions = filteredPlans.flatMap(p=>(p.days||[]).flatMap((d,di)=>(d?.sessions||[]).filter(s=>!s.isRest).map(s=>({...s,plan_type:p.plan_type,week_start:p.week_start,dayIdx:di}))))
        const catCounts = {}
        allSessions.forEach(s=>{ if(s.cat) catCounts[s.cat]=(catCounts[s.cat]||0)+1 })
        const gTotal   = GOLF_CATS.reduce((a,c)=>a+(catCounts[c]||0),0)
        const gymTotal = GYM_CATS.reduce((a,c)=>a+(catCounts[c]||0),0)

        const allItems = allSessions.flatMap(s=>s.items||[])
        const overallComp = allItems.length>0 ? Math.round(allItems.reduce((a,i)=>a+itemProgress(i),0)/allItems.length) : 0

        // Weekly bar chart (last 12 weeks, filtered)
        const nWeeks = progressPeriod==='week' ? 4 : progressPeriod==='month' ? 4 : 12
        const weekStats = Array(nWeeks).fill(0).map((_,i)=>{
          const ws = getWeekStart(-(nWeeks-1-i))
          const weekPlans = filteredPlans.filter(p=>p.week_start===ws)
          let totalItems=0, totalProg=0
          weekPlans.forEach(p=>{
            (p.days||[]).forEach(d=>{
              (d?.sessions||[]).filter(s=>!s.isRest).forEach(s=>{
                (s.items||[]).forEach(item=>{ totalItems++; totalProg+=itemProgress(item) })
              })
            })
          })
          const sessions = weekPlans.reduce((a,p)=>(p.days||[]).reduce((b,d)=>b+(d?.sessions?.filter(s=>!s.isRest).length||0),a),0)
          return { ws, sessions, completion: totalItems>0 ? Math.round(totalProg/totalItems) : null }
        })
        const maxWeekSess = Math.max(...weekStats.map(w=>w.sessions), 1)

        // Session history (filtered, up to 30)
        const sessionHistory = filteredPlans.flatMap(p=>
          (p.days||[]).flatMap((d,di)=>
            (d?.sessions||[]).filter(s=>!s.isRest).map(s=>{
              const date = new Date(p.week_start+'T12:00:00'); date.setDate(date.getDate()+di)
              const items = s.items||[]
              const totalProg = items.reduce((a,item)=>a+itemProgress(item),0)
              const comp = items.length>0 ? Math.round(totalProg/items.length) : null
              return { date, dateStr:date.toISOString().split('T')[0], plan_type:p.plan_type, cat:s.cat, session_type:s.session_type||null, itemsCount:items.length, completion:comp }
            })
          )
        ).sort((a,b)=>b.dateStr.localeCompare(a.dateStr)).slice(0,30)

        // Completion trend: % of sessions with ≥80% completion
        const sessionsWithComp = allSessions.filter(s=>(s.items||[]).length>0)
        const highCompSessions = sessionsWithComp.filter(s=>{
          const items = s.items||[]
          const avg = items.reduce((a,i)=>a+itemProgress(i),0)/items.length
          return avg>=80
        })
        const highCompPct = sessionsWithComp.length>0 ? Math.round(highCompSessions.length/sessionsWithComp.length*100) : 0

        const filterBtn = (val, current, setter, label) => (
          <button key={val} onClick={()=>setter(val)}
            style={{padding:'4px 10px',borderRadius:'16px',border:`1px solid ${current===val?golfColor:t.border}`,
              background:current===val?golfColor+'15':'transparent',color:current===val?golfColor:t.textMuted,
              cursor:'pointer',fontSize:'11px',fontWeight:current===val?700:400,fontFamily:F}}>
            {label}
          </button>
        )

        return (
          <div>
            {/* Filters */}
            <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap',alignItems:'center'}}>
              <div style={{display:'flex',gap:'4px'}}>
                {filterBtn('all',progressType,setProgressType,'Todos')}
                {filterBtn('golf',progressType,setProgressType,'Golf')}
                {filterBtn('gym',progressType,setProgressType,'Ginásio')}
              </div>
              <div style={{width:'1px',height:'20px',background:t.border}}/>
              <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                {filterBtn('week',progressPeriod,setProgressPeriod,'Semana')}
                {filterBtn('month',progressPeriod,setProgressPeriod,'Mês')}
                {filterBtn('3months',progressPeriod,setProgressPeriod,'3 Meses')}
                {filterBtn('year',progressPeriod,setProgressPeriod,'Ano')}
                {filterBtn('all',progressPeriod,setProgressPeriod,'Tudo')}
              </div>
            </div>

            {/* Summary cards */}
            <div className="train-stats-grid">
              {[
                {l:'SESSÕES',    v:allSessions.length,                                    c:t.text},
                {l:'GOLF',      v:allSessions.filter(s=>s.plan_type==='golf').length,    c:golfColor},
                {l:'GYM',       v:allSessions.filter(s=>s.plan_type==='gym').length,     c:gymColor},
                {l:'CONCLUSÃO', v:`${overallComp}%`,                                     c:overallComp>=80?gymColor:overallComp>=50?'#f59e0b':'#ef4444'},
              ].map(item=>(
                <div key={item.l} style={card}>
                  <div style={{fontSize:'8px',letterSpacing:'2px',color:t.textMuted,marginBottom:'8px',fontWeight:600}}>{item.l}</div>
                  <div style={{fontSize:'24px',fontWeight:900,color:item.c,lineHeight:1,letterSpacing:'-1px'}}>{item.v}</div>
                </div>
              ))}
            </div>

            {/* Weekly chart */}
            <div style={{...card,marginBottom:'14px'}}>
              <div style={{fontSize:'8px',letterSpacing:'3px',color:t.textMuted,marginBottom:'12px',fontWeight:600}}>
                {nWeeks===4?'ÚLTIMAS 4 SEMANAS':'ÚLTIMAS 12 SEMANAS'} — SESSÕES & CONCLUSÃO
              </div>
              {weekStats.every(w=>w.sessions===0) ? (
                <div style={{textAlign:'center',padding:'20px',color:t.textMuted,fontSize:'12px'}}>Sem dados para o período seleccionado.</div>
              ) : (
                <>
                  <div style={{display:'flex',alignItems:'flex-end',gap:'4px',height:'80px',marginBottom:'6px'}}>
                    {weekStats.map((w,i)=>{
                      const barH = Math.max(w.sessions/maxWeekSess*72,w.sessions>0?6:2)
                      const compColor = w.completion===null?t.border:w.completion>=80?gymColor:w.completion>=50?'#f59e0b':'#ef4444'
                      return (
                        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
                          {w.sessions>0&&<div style={{fontSize:'8px',color:t.textMuted,lineHeight:1}}>{w.sessions}</div>}
                          <div style={{width:'100%',height:`${barH}px`,background:compColor,borderRadius:'3px 3px 0 0',position:'relative'}}>
                            {w.completion!==null&&w.sessions>0&&(
                              <div style={{position:'absolute',bottom:'100%',left:'50%',transform:'translateX(-50%)',fontSize:'7px',color:compColor,fontWeight:700,whiteSpace:'nowrap',marginBottom:'1px'}}>
                                {w.completion}%
                              </div>
                            )}
                          </div>
                          <div style={{fontSize:'7px',color:t.textMuted,whiteSpace:'nowrap'}}>
                            {new Date(w.ws+'T12:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'numeric'})}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{display:'flex',gap:'12px',justifyContent:'center'}}>
                    {[{c:gymColor,l:'≥80%'},{c:'#f59e0b',l:'50-79%'},{c:'#ef4444',l:'<50%'},{c:t.border,l:'Sem dados'}].map(({c,l})=>(
                      <div key={l} style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <div style={{width:'8px',height:'8px',borderRadius:'2px',background:c}}/>
                        <span style={{fontSize:'9px',color:t.textMuted}}>{l}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Category breakdown */}
            {(progressType==='all' || progressType==='golf') && gTotal>0 && (
              <div style={{...card,marginBottom:'14px'}}>
                <div style={{fontSize:'8px',letterSpacing:'3px',color:golfColor,marginBottom:'12px',fontWeight:600}}>GOLFE — DISTRIBUIÇÃO POR CATEGORIA</div>
                {GOLF_CATS.map(cat=>{
                  const count=catCounts[cat]||0
                  const pct=gTotal>0?Math.round((count/gTotal)*100):0
                  return (
                    <div key={cat} style={{marginBottom:'8px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                        <div style={{fontSize:'11px',color:t.textMuted}}>{cat}</div>
                        <div style={{fontSize:'11px',color:golfColor,fontWeight:700}}>{count} sess.</div>
                      </div>
                      <div style={{height:'3px',background:t.border,borderRadius:'2px',overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:golfColor,borderRadius:'2px'}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {(progressType==='all' || progressType==='gym') && gymTotal>0 && (
              <div style={{...card,marginBottom:'14px'}}>
                <div style={{fontSize:'8px',letterSpacing:'3px',color:gymColor,marginBottom:'12px',fontWeight:600}}>GINÁSIO — DISTRIBUIÇÃO POR CATEGORIA</div>
                {GYM_CATS.map(cat=>{
                  const count=catCounts[cat]||0
                  const pct=gymTotal>0?Math.round((count/gymTotal)*100):0
                  return (
                    <div key={cat} style={{marginBottom:'8px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                        <div style={{fontSize:'11px',color:t.textMuted}}>{cat}</div>
                        <div style={{fontSize:'11px',color:gymColor,fontWeight:700}}>{count} sess.</div>
                      </div>
                      <div style={{height:'3px',background:t.border,borderRadius:'2px',overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${pct}%`,background:gymColor,borderRadius:'2px'}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Session history */}
            {sessionHistory.length>0 && (
              <div style={card}>
                <div style={{fontSize:'8px',letterSpacing:'3px',color:t.textMuted,marginBottom:'12px',fontWeight:600}}>
                  HISTÓRICO DE SESSÕES ({sessionHistory.length})
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                  {sessionHistory.map((s,i)=>{
                    const color = s.plan_type==='golf'?golfColor:gymColor
                    const compColor = s.completion===null?t.textMuted:s.completion===100?gymColor:s.completion>=50?'#f59e0b':'#ef4444'
                    return (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 10px',borderRadius:'8px',background:t.bg,border:`1px solid ${t.border}`}}>
                        <div style={{width:'3px',height:'32px',borderRadius:'2px',background:color,flexShrink:0}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'11px',fontWeight:700,color:t.text,marginBottom:'1px'}}>
                            {s.date.toLocaleDateString('pt-PT',{weekday:'short',day:'2-digit',month:'short'})}
                          </div>
                          <div style={{fontSize:'10px',color:t.textMuted}}>{s.cat}</div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontSize:'9px',letterSpacing:'1px',color,fontWeight:700}}>{s.plan_type.toUpperCase()}</div>
                          {s.session_type && <div style={{fontSize:'8px',color:t.textMuted,marginTop:'1px'}}>{s.session_type==='coach'?'Com Coach':'Autónomo'}</div>}
                        </div>
                        {s.itemsCount>0&&(
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <div style={{fontSize:'13px',fontWeight:900,color:compColor,lineHeight:1}}>{s.completion}%</div>
                            <div style={{fontSize:'9px',color:t.textMuted}}>{s.itemsCount} ex.</div>
                          </div>
                        )}
                        {s.completion!==null&&(
                          <div style={{width:'28px',height:'28px',borderRadius:'50%',border:`2px solid ${compColor}`,
                            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                            background:s.completion===100?compColor+'22':'transparent'}}>
                            <div style={{fontSize:'9px',fontWeight:700,color:compColor}}>
                              {s.completion===100?'✓':s.completion===0?'✗':'½'}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {allSessions.length===0 && (
              <div style={{...card,textAlign:'center',padding:'40px',color:t.textMuted,fontSize:'13px'}}>
                Sem dados para o período e filtro seleccionados.
              </div>
            )}
          </div>
        )
      })()}

      {/* ── PRIORIDADES ── */}
      {subTab==='priorities' && (
        <div>
          <div style={{ marginBottom:'20px' }}>
            <div style={{ fontSize:'9px', letterSpacing:'3px', color:'#7e22ce', fontWeight:700, marginBottom:'2px' }}>PLAN · PRIORIDADES</div>
            <div style={{ fontSize:'13px', color:t.textMuted }}>Objetivos de performance e progresso por KPI</div>
          </div>
          <Goals theme={theme} t={t} user={user} />
        </div>
      )}

      {/* ── PERIODIZAÇÃO ── */}
      {subTab==='periodizacao' && (() => {
        const isCoach = email===COACH_GOLF||email===COACH_GYM||email===ADMIN
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        const currentWsDate = new Date(todayStr+'T12:00:00')
        const dow = currentWsDate.getDay()
        currentWsDate.setDate(currentWsDate.getDate() - (dow===0?6:dow-1))
        const currentWs = currentWsDate.toISOString().split('T')[0]
        const addWeeks = (ws, n) => { const d=new Date(ws+'T12:00:00'); d.setDate(d.getDate()+n*7); return d.toISOString().split('T')[0] }
        const allWeeks = Array.from({length:24}, (_,i) => addWeeks(currentWs, i-4))
        const {phases: autoPhases, alerts: autoAlerts} = computeAllPhases(allWeeks, eventsData)
        const resolvedPhases = {}
        allWeeks.forEach(ws => { resolvedPhases[ws] = phaseOverrides[ws] || autoPhases[ws] || 'acumulacao' })
        const mesociclos = []
        for (let i=0; i<allWeeks.length; i+=4) mesociclos.push(allWeeks.slice(i, i+4))
        const isCompEvent = (e) => (e.category||'').toLowerCase().includes('competi') || (e.title||'').toLowerCase().includes('torneio')
        const comps = eventsData.filter(isCompEvent)
        const getWeekComps = (ws) => {
          const wsMs = new Date(ws+'T12:00:00').getTime(), weMs = wsMs+6*86400000
          return comps.filter(c=>{ const cs=new Date(c.start_date+'T12:00:00').getTime(),ce=c.end_date?new Date(c.end_date+'T12:00:00').getTime():cs; return cs<=weMs&&ce>=wsMs })
        }
        // Deduplicated global alerts
        const seen = new Set()
        const globalAlerts = []
        allWeeks.forEach(ws=>(autoAlerts[ws]||[]).forEach(a=>{ if(!seen.has(a.text)){seen.add(a.text);globalAlerts.push(a)} }))

        const currentPhId = resolvedPhases[currentWs]
        const currentPh = PHASES[currentPhId] || PHASES.acumulacao
        const currentSummary = getPhaseSummary(currentWs, eventsData, currentPhId)

        return (
          <div>
            {/* Criteria modal */}
            {showCriterios && (
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999}} onClick={()=>setShowCriterios(false)}>
                <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:'14px',padding:'24px',width:'90%',maxWidth:'480px',maxHeight:'85vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
                    <div style={{fontSize:'11px',letterSpacing:'2px',color:'#7e22ce',fontWeight:700}}>CRITÉRIOS DE FASE</div>
                    <button onClick={()=>setShowCriterios(false)} style={{background:'transparent',border:'none',color:t.textMuted,cursor:'pointer',fontSize:'18px',lineHeight:1}}>✕</button>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'10px',fontSize:'11px',color:t.text,lineHeight:1.6}}>
                    <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:700,marginBottom:'2px'}}>ORDEM DE PRIORIDADE</div>
                    {[
                      {ph:'descanso',           crit:'Fadiga forte, dor, quebra de performance ou saturação'},
                      {ph:'descarga',           crit:'4+ semanas sem descarga, 3 comp. em 4 semanas ou sinais de carga alta'},
                      {ph:'peak',               crit:'Há competição esta semana'},
                      {ph:'manutencao',         crit:'Competição na semana anterior e nova competição nos próximos 7 dias'},
                      {ph:'afinacao',           crit:'Competição nos próximos 1–7 dias (sem comp. esta semana)'},
                      {ph:'desenvolvimentoLight',crit:'Competição nos próximos 8–14 dias'},
                      {ph:'desenvolvimento',    crit:'Competição nos próximos 15–21 dias'},
                      {ph:'acumulacao',         crit:'Competição a 22+ dias ou calendário vazio'},
                    ].map(({ph,crit},i)=>{
                      const p=PHASES[ph]||PHASES.acumulacao
                      return (
                        <div key={ph} style={{display:'flex',gap:'10px',alignItems:'flex-start',padding:'8px',borderRadius:'8px',background:p.bg,border:`1px solid ${p.color}33`}}>
                          <div style={{fontSize:'9px',color:t.textMuted,fontWeight:700,minWidth:'14px'}}>{i+1}</div>
                          <div style={{padding:'1px 7px',borderRadius:'4px',fontSize:'8px',fontWeight:700,color:'#fff',background:p.color,whiteSpace:'nowrap'}}>{p.label}</div>
                          <div style={{fontSize:'10px',color:t.text}}>{crit}</div>
                        </div>
                      )
                    })}
                    <div style={{borderTop:`1px solid ${t.border}`,paddingTop:'12px',marginTop:'4px'}}>
                      <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:700,marginBottom:'8px'}}>ALERTAS AUTOMÁTICOS</div>
                      <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                        <div style={{padding:'8px',borderRadius:'8px',background:'#fffbeb',border:'1px solid #fcd34d',fontSize:'10px',color:'#92400e'}}>
                          <div style={{fontWeight:700,marginBottom:'3px'}}>⚠️ Alerta amarelo (recomenda DESCARGA)</div>
                          <ul style={{margin:0,paddingLeft:'16px',lineHeight:1.8}}>
                            <li>3 competições nas últimas 4 semanas</li>
                            <li>4 semanas consecutivas sem descarga</li>
                          </ul>
                        </div>
                        <div style={{padding:'8px',borderRadius:'8px',background:'#fef2f2',border:'1px solid #fca5a5',fontSize:'10px',color:'#b91c1c'}}>
                          <div style={{fontWeight:700,marginBottom:'3px'}}>🔴 Alerta vermelho (recomenda DESCANSO)</div>
                          <ul style={{margin:0,paddingLeft:'16px',lineHeight:1.8}}>
                            <li>6 semanas consecutivas sem descarga/descanso</li>
                            <li>4 competições em 5 semanas</li>
                            <li>Fadiga ≥8/10 (ajuste manual pelo coach)</li>
                            <li>Dor persistente (ajuste manual pelo coach)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div style={{borderTop:`1px solid ${t.border}`,paddingTop:'10px',fontSize:'10px',color:t.textMuted,fontStyle:'italic'}}>
                      Nota: DESCANSO e DESCARGA por fadiga ou dor requerem ajuste manual pelo coach. Os alertas automáticos baseiam-se apenas no calendário de competições.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Current week card */}
            <div style={{...card,marginBottom:'16px',padding:'16px',background:currentPh.bg,border:`2px solid ${currentPh.color}55`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'8px'}}>
                <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                  <div style={{fontSize:'8px',letterSpacing:'2px',color:currentPh.color,fontWeight:700}}>SEMANA ACTUAL</div>
                  <div style={{padding:'3px 10px',borderRadius:'20px',fontSize:'10px',fontWeight:700,color:'#fff',background:currentPh.color,alignSelf:'flex-start'}}>{currentPh.label}</div>
                  <div style={{fontSize:'12px',color:t.text,fontWeight:600}}>{currentPh.situacao}</div>
                  <div style={{fontSize:'11px',color:t.textMuted}}>{currentPh.regra}</div>
                  <div style={{fontSize:'11px',color:currentPh.color,fontWeight:600}}>Hoje: {currentPh.hoje}</div>
                </div>
                <button onClick={()=>setShowCriterios(true)}
                  style={{padding:'5px 12px',borderRadius:'20px',border:`1px solid ${t.border}`,background:'transparent',color:t.textMuted,cursor:'pointer',fontSize:'10px',fontFamily:F,fontWeight:500,whiteSpace:'nowrap'}}>
                  Ver critérios
                </button>
              </div>
              {currentSummary.daysToNextCompetition !== null && (
                <div style={{marginTop:'10px',fontSize:'10px',color:t.textMuted,display:'flex',gap:'12px',flexWrap:'wrap',borderTop:`1px solid ${currentPh.color}33`,paddingTop:'8px'}}>
                  <span>Próxima: <b style={{color:t.text}}>{currentSummary.nextCompetition}</b></span>
                  <span>em <b style={{color:currentPh.color}}>{currentSummary.daysToNextCompetition} dias</b></span>
                </div>
              )}
            </div>

            {/* Global alerts */}
            {globalAlerts.length>0 && (
              <div style={{marginBottom:'16px',display:'flex',flexDirection:'column',gap:'6px'}}>
                {globalAlerts.map((a,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'8px',padding:'9px 14px',borderRadius:'10px',
                    background:a.level==='red'?'#fef2f2':a.level==='orange'?'#fff7ed':'#fffbeb',
                    border:`1px solid ${a.level==='red'?'#fca5a5':a.level==='orange'?'#fdba74':'#fcd34d'}`,
                    fontSize:'11px',fontWeight:500,color:a.level==='red'?'#b91c1c':a.level==='orange'?'#c2410c':'#92400e'}}>
                    <span style={{flexShrink:0}}>{a.icon}</span><span>{a.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Phase guide — compact accordion */}
            <div style={{...card,marginBottom:'20px',padding:'14px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                <div style={{fontSize:'9px',letterSpacing:'2px',color:'#7e22ce',fontWeight:700}}>GUIA DE FASES</div>
                <div style={{fontSize:'10px',color:t.textMuted}}>Clica para ver sugestões</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                {Object.values(PHASES).map(ph=>{
                  const isExp = expandedPhaseKey===ph.id
                  return (
                    <div key={ph.id} style={{borderRadius:'10px',background:ph.bg,border:`1px solid ${isExp?ph.color:ph.color+'44'}`,overflow:'hidden'}}>
                      <button onClick={()=>setExpandedPhaseKey(isExp?null:ph.id)}
                        style={{width:'100%',display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',background:'transparent',border:'none',cursor:'pointer',fontFamily:F,textAlign:'left'}}>
                        <div style={{padding:'2px 8px',borderRadius:'4px',fontSize:'8px',fontWeight:700,letterSpacing:'1px',color:'#fff',background:ph.color,whiteSpace:'nowrap',flexShrink:0}}>{ph.label}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'11px',fontWeight:600,color:t.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ph.situacao}</div>
                          <div style={{fontSize:'10px',color:t.textMuted,marginTop:'1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ph.regra}</div>
                        </div>
                        <div style={{fontSize:'10px',color:ph.color,fontWeight:600,flexShrink:0,marginRight:'4px',whiteSpace:'nowrap'}}>Hoje: {ph.hoje}</div>
                        <div style={{fontSize:'11px',color:ph.color,flexShrink:0}}>{isExp?'▲':'▼'}</div>
                      </button>
                      {isExp && (
                        <div style={{padding:'0 12px 12px',display:'flex',flexDirection:'column',gap:'8px'}}>
                          <div style={{height:'1px',background:ph.color+'33',marginBottom:'4px'}} />
                          <div>
                            <div style={{fontSize:'8px',letterSpacing:'1.5px',color:ph.color,fontWeight:700,marginBottom:'4px'}}>SUGESTÃO GOLF (RANGE / JOGO CURTO / PUTTING)</div>
                            {ph.golfSugestao.map((sg,i)=><div key={i} style={{fontSize:'11px',color:t.text,paddingLeft:'8px',lineHeight:1.8}}>· {sg}</div>)}
                          </div>
                          <div>
                            <div style={{fontSize:'8px',letterSpacing:'1.5px',color:ph.color,fontWeight:700,marginBottom:'4px'}}>SUGESTÃO GINÁSIO</div>
                            {ph.gymSugestao.map((sg,i)=><div key={i} style={{fontSize:'11px',color:t.text,paddingLeft:'8px',lineHeight:1.8}}>· {sg}</div>)}
                          </div>
                          <div>
                            <div style={{fontSize:'8px',letterSpacing:'1.5px',color:'#ef4444',fontWeight:700,marginBottom:'4px'}}>EVITAR</div>
                            {ph.evitar.map((sg,i)=><div key={i} style={{fontSize:'11px',color:'#b91c1c',paddingLeft:'8px',lineHeight:1.8}}>· {sg}</div>)}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Mesociclos */}
            {mesociclos.map((block, mIdx) => {
              const blockLabel = `Mesociclo ${mIdx+1}`
              const blockStart = block[0], blockEnd = block[block.length-1]
              const blockHasCurrent = block.includes(currentWs)
              const blockStartDate = new Date(blockStart+'T12:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})
              const blockEndDate = new Date(blockEnd+'T12:00:00'); blockEndDate.setDate(blockEndDate.getDate()+6)
              const blockEndStr = blockEndDate.toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})
              return (
                <div key={mIdx} style={{marginBottom:'20px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
                    <div style={{fontSize:'9px',letterSpacing:'2px',fontWeight:700,color:blockHasCurrent?'#7e22ce':t.textMuted}}>{blockLabel.toUpperCase()}</div>
                    <div style={{fontSize:'10px',color:t.textMuted}}>{blockStartDate} – {blockEndStr}</div>
                    {blockHasCurrent && <div style={{padding:'2px 8px',borderRadius:'10px',background:'#f3e8ff',color:'#7e22ce',fontSize:'9px',fontWeight:700}}>ACTUAL</div>}
                  </div>
                  <div className="train-perio-grid">
                    {block.map(ws => {
                      const phId = resolvedPhases[ws]
                      const ph = PHASES[phId] || PHASES.acumulacao
                      const isManual = !!phaseOverrides[ws]
                      const isCurrent = ws===currentWs, isPast = ws<currentWs
                      const weekComps = getWeekComps(ws)
                      const weekAl = autoAlerts[ws]||[]
                      const isEditing = editingPhaseWs===ws
                      const wsDate = new Date(ws+'T12:00:00'), weDate = new Date(ws+'T12:00:00')
                      weDate.setDate(weDate.getDate()+6)
                      const wsLabel = wsDate.toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})
                      const weLabel = weDate.toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})
                      const daysToWs = Math.round((new Date(ws+'T12:00:00').getTime()-new Date(todayStr+'T12:00:00').getTime())/86400000)
                      return (
                        <div key={ws} style={{background:isPast?t.surface:ph.bg,border:`1px solid ${isCurrent?ph.color:isPast?t.border:ph.color+'55'}`,borderRadius:'10px',padding:'12px',opacity:isPast?0.7:1,position:'relative'}}>
                          {/* Week header */}
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
                            <div>
                              <div style={{fontSize:'9px',color:t.textMuted,fontWeight:600,letterSpacing:'1px'}}>{wsLabel} – {weLabel}</div>
                              {isCurrent && <div style={{fontSize:'8px',color:ph.color,fontWeight:700,marginTop:'1px'}}>SEMANA ACTUAL</div>}
                              {!isCurrent&&!isPast&&daysToWs>0 && <div style={{fontSize:'8px',color:t.textMuted}}>em {daysToWs}d</div>}
                              {isPast && <div style={{fontSize:'8px',color:t.textMuted}}>passado</div>}
                            </div>
                            <button onClick={()=>navigateToWeek(ws)} style={{background:'transparent',border:`1px solid ${ph.color}66`,borderRadius:'6px',color:ph.color,padding:'3px 8px',cursor:'pointer',fontSize:'10px',fontFamily:F,fontWeight:600}}>Ir →</button>
                          </div>
                          {/* Phase badge + coach edit */}
                          <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'8px'}}>
                            <div style={{flex:1}}>
                              <div style={{display:'inline-flex',alignItems:'center',gap:'4px'}}>
                                <div style={{padding:'3px 8px',borderRadius:'4px',fontSize:'9px',fontWeight:700,letterSpacing:'1px',color:'#fff',background:ph.color}}>{ph.label}</div>
                                {isManual && <div style={{padding:'2px 5px',borderRadius:'4px',fontSize:'8px',fontWeight:700,color:'#92400e',background:'#fef3c7',border:'1px solid #fcd34d'}}>MANUAL</div>}
                              </div>
                            </div>
                            {isCoach && (
                              <button onClick={()=>setEditingPhaseWs(isEditing?null:ws)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'3px 6px',cursor:'pointer',fontSize:'9px',fontFamily:F}}>✏️</button>
                            )}
                          </div>
                          {/* Phase override dropdown */}
                          {isEditing && isCoach && (
                            <>
                              <div onClick={()=>setEditingPhaseWs(null)} style={{position:'fixed',inset:0,zIndex:10}} />
                              <div style={{position:'relative',zIndex:11,marginBottom:'8px',background:t.bg,border:`1px solid ${t.border}`,borderRadius:'8px',padding:'8px',display:'flex',flexDirection:'column',gap:'4px'}}>
                                <div style={{fontSize:'9px',letterSpacing:'1px',color:t.textMuted,fontWeight:600,marginBottom:'4px'}}>SELECCIONAR FASE</div>
                                {Object.values(PHASES).map(opt=>(
                                  <button key={opt.id} disabled={savingPhaseOverride} onClick={()=>savePhaseOverride(ws,opt.id)}
                                    style={{display:'flex',alignItems:'center',gap:'6px',padding:'5px 8px',borderRadius:'6px',border:`1px solid ${phId===opt.id?opt.color:t.border}`,background:phId===opt.id?opt.color+'22':'transparent',cursor:'pointer',fontFamily:F,textAlign:'left',width:'100%'}}>
                                    <span style={{fontSize:'10px',fontWeight:600,color:opt.color}}>{opt.label}</span>
                                    {phId===opt.id && <span style={{marginLeft:'auto',fontSize:'9px',color:opt.color}}>✓</span>}
                                  </button>
                                ))}
                                {isManual && (
                                  <button disabled={savingPhaseOverride} onClick={()=>clearPhaseOverride(ws)} style={{marginTop:'4px',padding:'5px 8px',borderRadius:'6px',border:'1px solid #ef4444',background:'transparent',cursor:'pointer',fontFamily:F,fontSize:'10px',color:'#ef4444',fontWeight:600}}>↺ Repor automático</button>
                                )}
                              </div>
                            </>
                          )}
                          {/* Situacao + Regra + Hoje */}
                          <div style={{display:'flex',flexDirection:'column',gap:'3px',marginBottom:'8px'}}>
                            <div style={{fontSize:'9px',color:t.text,lineHeight:1.5}}><span style={{fontWeight:700,color:ph.color}}>Situação: </span>{ph.situacao}</div>
                            <div style={{fontSize:'9px',color:t.text,lineHeight:1.5}}><span style={{fontWeight:700,color:ph.color}}>Regra: </span>{ph.regra}</div>
                            <div style={{fontSize:'9px',color:ph.color,fontWeight:600,lineHeight:1.5}}>Hoje: {ph.hoje}</div>
                          </div>
                          {/* Competitions */}
                          {weekComps.length>0 && (
                            <div style={{display:'flex',flexDirection:'column',gap:'3px',marginBottom:'6px'}}>
                              {weekComps.map((c,ci)=>(
                                <div key={ci} style={{display:'flex',alignItems:'center',gap:'4px',padding:'3px 8px',borderRadius:'5px',background:'#fef9c3',border:'1px solid #fde047'}}>
                                  <span style={{fontSize:'10px'}}>🏌️</span>
                                  <span style={{fontSize:'9px',fontWeight:700,color:'#713f12'}}>{c.title||c.event_name}</span>
                                  <span style={{fontSize:'8px',color:'#92400e',marginLeft:'auto'}}>{c.start_date}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Week alerts */}
                          {weekAl.length>0 && (
                            <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                              {weekAl.map((a,ai)=>(
                                <div key={ai} style={{fontSize:'9px',color:a.level==='red'?'#b91c1c':'#92400e',fontWeight:500,display:'flex',alignItems:'center',gap:'3px'}}>
                                  <span>{a.icon}</span><span>{a.text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}
