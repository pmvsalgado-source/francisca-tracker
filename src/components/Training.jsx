import { useState, useEffect, useCallback, useRef } from 'react'
import { isCompetition } from '../lib/periodization'
import {
  getTrainingPlans,
  saveTrainingPlan,
  getTrainingTemplates,
  saveTrainingTemplate,
  deleteTrainingTemplate,
  getPeriodizationOverrides,
  savePeriodizationOverride,
  deletePeriodizationOverride,
} from '../services/trainingService'
import Goals from './Goals'
import { ACTIVITY_COLORS } from '../constants/eventCategories'

import { COACH_ROLES } from '../constants/roles'
import EmptyState from './EmptyState'

const GOLF_CATS = ['Driving Range', 'Jogo Curto', 'Putt', 'Bunker', 'Campo']
const GYM_CATS  = ['Pernas', 'Potência', 'Core', 'Braços', 'Mobilidade', 'Cardio', 'Prevenção']
const F = "'Inter', system-ui, sans-serif"
const golfColor = ACTIVITY_COLORS.golf
const gymColor  = ACTIVITY_COLORS.gym
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

const DAILY_TEMPLATE_HEADERS = [
  'Plan Name',
  'Plan Type',
  'Day Type',
  'Session Type',
  'Session Focus',
  'Session Objective',
  'General Observations',
  'Exercise Order',
  'Exercise Name',
  'Exercise Category',
  'Quantity',
  'Sets',
  'Reps',
  'Load',
  'Instructions',
  'Notes',
  'Is Rest',
  'Date',
]

const xmlEscape = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const colName = (index) => {
  let n = index + 1
  let name = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    name = String.fromCharCode(65 + rem) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

const utf8 = new TextEncoder()
const utf8Decode = new TextDecoder()

const makeCrcTable = () => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)) >>> 0
    }
    table[n] = c >>> 0
  }
  return table
}
const CRC_TABLE = makeCrcTable()
const crc32 = (bytes) => {
  let crc = 0xffffffff
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
const concatBytes = (parts) => {
  const total = parts.reduce((n, part) => n + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  parts.forEach(part => {
    out.set(part, offset)
    offset += part.length
  })
  return out
}
const u16 = (n) => {
  const bytes = new Uint8Array(2)
  new DataView(bytes.buffer).setUint16(0, n, true)
  return bytes
}
const u32 = (n) => {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, n >>> 0, true)
  return bytes
}
const zipStore = (entries) => {
  const localParts = []
  const centralParts = []
  let offset = 0

  entries.forEach(entry => {
    const nameBytes = utf8.encode(entry.name)
    const dataBytes = entry.data instanceof Uint8Array ? entry.data : utf8.encode(entry.data)
    const crc = crc32(dataBytes)
    const size = dataBytes.length

    const localHeader = concatBytes([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
    ])
    localParts.push(localHeader, nameBytes, dataBytes)

    const centralHeader = concatBytes([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
    ])
    centralParts.push(centralHeader, nameBytes)
    offset += localHeader.length + nameBytes.length + dataBytes.length
  })

  const centralDir = concatBytes(centralParts)
  const endRecord = concatBytes([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDir.length),
    u32(localParts.reduce((n, p) => n + p.length, 0)),
    u16(0),
  ])
  return concatBytes([...localParts, centralDir, endRecord])
}

const buildDailyTemplateWorkbook = (payload) => {
  const rows = [
    DAILY_TEMPLATE_HEADERS,
    ...payload.rows.map((row, idx) => [
      payload.planName || '',
      payload.planType || '',
      row.dayType || '',
      row.sessionType || '',
      payload.sessionFocus || '',
      payload.sessionObjective || '',
      payload.generalObservations || '',
      idx + 1,
      row.exerciseName || '',
      row.exerciseCategory || '',
      row.quantity || '',
      row.sets || '',
      row.reps || '',
      row.load || '',
      row.instructions || '',
      row.notes || '',
      row.isRest ? 'Yes' : 'No',
      payload.date || '',
    ]),
  ]

  if (rows.length === 1) {
    rows.push([
      payload.planName || '',
      payload.planType || '',
      payload.dayType || '',
      payload.sessionType || '',
      payload.sessionFocus || '',
      payload.sessionObjective || '',
      payload.generalObservations || '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      payload.isRest ? 'Yes' : 'No',
      payload.date || '',
    ])
  }

  const sheetRows = rows.map((row, rowIdx) => {
    const cells = row.map((value, colIdx) => {
      const ref = `${colName(colIdx)}${rowIdx + 1}`
      if (value === null || value === undefined || value === '') {
        return ''
      }
      if (typeof value === 'number') {
        return `<c r="${ref}"><v>${value}</v></c>`
      }
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
    }).join('')
    return `<row r="${rowIdx + 1}">${cells}</row>`
  }).join('')

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`

  return {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Plan" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
    'xl/worksheets/sheet1.xml': sheetXml,
  }
}

const parseDailyTemplateXlsx = async (file) => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const entries = {}
  let offset = 0
  while (offset + 30 <= bytes.length) {
    const sig = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true)
    if (sig !== 0x04034b50) break
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 30)
    const method = view.getUint16(8, true)
    const compressedSize = view.getUint32(18, true)
    const nameLen = view.getUint16(26, true)
    const extraLen = view.getUint16(28, true)
    const nameStart = offset + 30
    const dataStart = nameStart + nameLen + extraLen
    const name = utf8Decode.decode(bytes.slice(nameStart, nameStart + nameLen))
    const data = bytes.slice(dataStart, dataStart + compressedSize)
    if (method !== 0) throw new Error('O ficheiro precisa de ser um template Excel exportado pela aplicação.')
    entries[name] = utf8Decode.decode(data)
    offset = dataStart + compressedSize
  }

  const sheetXml = entries['xl/worksheets/sheet1.xml']
  if (!sheetXml) throw new Error('Ficheiro Excel inválido.')
  const doc = new DOMParser().parseFromString(sheetXml, 'application/xml')
  const rowNodes = [...doc.getElementsByTagName('row')]
  const rows = rowNodes.map(row => {
    const cells = [...row.getElementsByTagName('c')]
    const out = {}
    cells.forEach(cell => {
      const ref = cell.getAttribute('r') || ''
      const col = ref.replace(/\d+/g, '')
      const vNode = cell.getElementsByTagName('v')[0]
      const isNode = cell.getElementsByTagName('is')[0]
      const tNode = isNode?.getElementsByTagName('t')[0]
      out[col] = tNode?.textContent ?? vNode?.textContent ?? ''
    })
    return out
  })

  const headers = DAILY_TEMPLATE_HEADERS.reduce((acc, h, idx) => {
    acc[h] = String.fromCharCode(65 + idx)
    return acc
  }, {})
  const dataRows = rows.slice(1).map(row => {
    const obj = {}
    DAILY_TEMPLATE_HEADERS.forEach((h, idx) => {
      obj[h] = row[String.fromCharCode(65 + idx)] || ''
    })
    return obj
  }).filter(row => Object.values(row).some(v => String(v).trim() !== ''))

  return dataRows
}

const buildDailyTemplateWorkbookV2 = (payload) => {
  const rows = [
    ['DAILY TRAINING PLAN TEMPLATE', payload.planName || ''],
    ['How to use', 'Edit the exercise rows below, then import the file back into Training.'],
    ['Plan name', payload.planName || ''],
    ['Plan type', payload.planType || ''],
    ['Date', payload.date || ''],
    ['Day type', payload.dayType || ''],
    ['Session type', payload.sessionType || ''],
    ['Session focus', payload.sessionFocus || ''],
    ['Session objective', payload.sessionObjective || ''],
    ['General observations', payload.generalObservations || ''],
    [''],
    ['Exercises'],
    DAILY_TEMPLATE_HEADERS,
  ]

  const exerciseRows = payload.rows.length > 0
    ? payload.rows.map((row, idx) => [
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        idx + 1,
        row.exerciseName || '',
        row.exerciseCategory || '',
        row.quantity || '',
        row.sets || '',
        row.reps || '',
        row.load || '',
        row.instructions || '',
        row.notes || '',
        row.isRest ? 'Yes' : 'No',
        payload.date || '',
      ])
    : [[
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        payload.isRest ? 'Yes' : 'No',
        payload.date || '',
      ]]

  rows.push(...exerciseRows)

  const rowXml = rows.map((row, rowIdx) => {
    const cells = row.map((value, colIdx) => {
      if (value === null || value === undefined || value === '') return ''
      const ref = `${colName(colIdx)}${rowIdx + 1}`
      if (typeof value === 'number') return `<c r="${ref}"><v>${value}</v></c>`
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
    }).join('')
    return `<row r="${rowIdx + 1}">${cells}</row>`
  }).join('')

  const widths = [24, 42, 14, 16, 14, 14, 16, 12, 28, 20, 12, 10, 10, 10, 28, 22, 10, 14]
  const cols = widths.map((w, idx) => `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`).join('')

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${cols}</cols>
  <sheetData>${rowXml}</sheetData>
</worksheet>`

  return {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Daily Plan" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
    'xl/worksheets/sheet1.xml': sheetXml,
  }
}

const parseDailyTemplateXlsxV2 = async (file) => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const entries = {}
  let offset = 0
  const inflateRaw = async (compressed) => {
    if (typeof DecompressionStream === 'undefined') throw new Error('O navegador não suporta importação de Excel comprimido.')
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }
  while (offset + 30 <= bytes.length) {
    const sig = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true)
    if (sig !== 0x04034b50) break
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 30)
    const method = view.getUint16(8, true)
    const compressedSize = view.getUint32(18, true)
    const nameLen = view.getUint16(26, true)
    const extraLen = view.getUint16(28, true)
    const nameStart = offset + 30
    const dataStart = nameStart + nameLen + extraLen
    const name = utf8Decode.decode(bytes.slice(nameStart, nameStart + nameLen))
    const data = bytes.slice(dataStart, dataStart + compressedSize)
    const payloadBytes = method === 0 ? data : method === 8 ? await inflateRaw(data) : null
    if (!payloadBytes) throw new Error('Formato Excel não suportado.')
    entries[name] = utf8Decode.decode(payloadBytes)
    offset = dataStart + compressedSize
  }

  const sharedStrings = []
  if (entries['xl/sharedStrings.xml']) {
    const sharedDoc = new DOMParser().parseFromString(entries['xl/sharedStrings.xml'], 'application/xml')
    ;[...sharedDoc.getElementsByTagName('si')].forEach(si => sharedStrings.push(si.textContent || ''))
  }

  const sheetXml = entries['xl/worksheets/sheet1.xml']
  if (!sheetXml) throw new Error('Ficheiro Excel inválido.')
  const doc = new DOMParser().parseFromString(sheetXml, 'application/xml')
  const rowNodes = [...doc.getElementsByTagName('row')]
  const rows = rowNodes.map(row => {
    const cells = [...row.getElementsByTagName('c')]
    const out = []
    cells.forEach(cell => {
      const ref = cell.getAttribute('r') || ''
      const colLetters = ref.replace(/\d+/g, '')
      const colIndex = colLetters.split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1
      const t = cell.getAttribute('t')
      const vNode = cell.getElementsByTagName('v')[0]
      const isNode = cell.getElementsByTagName('is')[0]
      const tNode = isNode?.getElementsByTagName('t')[0]
      let value = tNode?.textContent ?? vNode?.textContent ?? ''
      if (t === 's') value = sharedStrings[parseInt(value, 10)] || ''
      if (t === 'b') value = value === '1' ? 'TRUE' : 'FALSE'
      out[colIndex] = value
    })
    return out
  })

  const headerIndex = rows.findIndex(row => {
    const values = (row || []).map(v => String(v || '').trim())
    return values.includes('Plan Name') && values.includes('Exercise Name')
  })
  if (headerIndex < 0) throw new Error('Não encontrei a grelha do template Excel.')

  const headers = rows[headerIndex].map(v => String(v || '').trim())
  return rows.slice(headerIndex + 1)
    .map(row => {
      const obj = {}
      headers.forEach((header, idx) => {
        if (header) obj[header] = row?.[idx] ?? ''
      })
      return obj
    })
    .filter(row => Object.values(row).some(v => String(v).trim() !== ''))
}

export default function Training({ theme, t, user, userRole = '', lang = 'en', events = [], focusDate = null, onFocusConsumed, onPlansChanged }) {
  const [subTab, setSubTab] = useState('plan')
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(() => { const d=new Date().getDay(); return d===0?6:d-1 })

  // Wizard state
  const [wizard, setWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardType, setWizardType] = useState('golf')
  const [wizardPlanMode, setWizardPlanMode] = useState('week')
  const [wizardStartDate, setWizardStartDate] = useState('')
  const [wizardEndDate, setWizardEndDate] = useState('')
  const [wizardActiveDays, setWizardActiveDays] = useState([0,1,2,3,4,5,6])
  const [wizardDayPlans, setWizardDayPlans] = useState({})
  const [wizardSelectedChips, setWizardSelectedChips] = useState([])
  const [wizardDaySource, setWizardDaySource] = useState('specific')
  const [wizardOpenCat, setWizardOpenCat] = useState(null)
  const [wizardNote, setWizardNote] = useState('')
  const [wizardDailyTemplateName, setWizardDailyTemplateName] = useState('')
  const [wizardDailyTemplateFocus, setWizardDailyTemplateFocus] = useState('')
  const [wizardDailyTemplateObjective, setWizardDailyTemplateObjective] = useState('')
  const [wizardCustom, setWizardCustom] = useState({ name:'', cat:'', desc:'' })
  const [wizardUserLib, setWizardUserLib] = useState([])
  const [wizardError, setWizardError] = useState('')
  const [saving, setSaving] = useState(false)

  const [tooltipId, setTooltipId] = useState(null)
  const [showFreeSession, setShowFreeSession] = useState(false)
  const [freeSession, setFreeSession] = useState({ date:new Date().toISOString().split('T')[0], course:'', notes:'', score:'', holes:'' })
  const [savingFree, setSavingFree] = useState(false)
  const [freeSessionError, setFreeSessionError] = useState(null)
  const [athleteNote, setAthleteNote] = useState('')

  // Track Progress filters
  const [progressType, setProgressType] = useState('all')
  const [progressPeriod, setProgressPeriod] = useState('all')
  const [wizardSessionTypes, setWizardSessionTypes] = useState({})
  const [templates, setTemplates] = useState([])
  const [wizardTemplateName, setWizardTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const excelFileRef = useRef(null)
  const [showLegend, setShowLegend] = useState(false)
  const [phaseOverrides, setPhaseOverrides] = useState({})
  const [editingPhaseWs, setEditingPhaseWs] = useState(null)
  const [savingPhaseOverride, setSavingPhaseOverride] = useState(false)
  const [showCriterios, setShowCriterios] = useState(false)
  const [expandedPhaseKey, setExpandedPhaseKey] = useState(null)
  const [deleteTemplateConfirm, setDeleteTemplateConfirm] = useState(null)

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
    try {
      const data = await getTrainingPlans()
      setPlans(data || [])
    } catch (_) { setPlans([]) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])
  const fetchTemplates = useCallback(async () => {
    try {
      const data = await getTrainingTemplates()
      setTemplates(data || [])
    } catch (_) { setTemplates([]) }
  }, [])
  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  useEffect(() => {
    getPeriodizationOverrides()
      .then(data => {
        const ov = {}
        ;(data || []).forEach(r => { ov[r.week_start] = r.phase })
        setPhaseOverrides(ov)
      })
      .catch(() => {})
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
    setSubTab('plan')
    onFocusConsumed?.()
  }, [focusDate, getWeekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  const golfPlan = plans.find(p => p.week_start===weekStart && p.plan_type==='golf')
  const gymPlan  = plans.find(p => p.week_start===weekStart && p.plan_type==='gym')

  const dayHasComp = (dayIdx) => {
    const ws = new Date(weekStart+'T12:00:00')
    const d = new Date(ws); d.setDate(ws.getDate() + dayIdx)
    const dateStr = d.toISOString().split('T')[0]
    return events.some(e => dateStr >= e.start_date && dateStr <= (e.end_date || e.start_date))
  }

  const dateHasComp = (dateStr) =>
    events.some(e => dateStr >= e.start_date && dateStr <= (e.end_date || e.start_date))

  const compOnDate = (dateStr) =>
    events.find(e => dateStr >= e.start_date && dateStr <= (e.end_date || e.start_date))

  const savePlan = async (newDays, type, ws=weekStart) => {
    setSaving(true)
    const existing = plans.find(p=>p.week_start===ws && p.plan_type===type)
    const payload = { week_start:ws, week_end:getWeekEnd(ws), plan_type:type, days:newDays, updated_at:new Date().toISOString(), updated_by:email }
    await saveTrainingPlan(
      existing ? payload : {...payload, created_by:email, status:'active', title:`${type==='golf'?'Golf':'Gym'} Plan`},
      existing ? existing.id : null
    )
    setSaving(false)
    fetchPlans()
    onPlansChanged?.()
  }

  const datesInRange = (() => {
    if (!wizardStartDate || !wizardEndDate) return []
    if (wizardPlanMode === 'day') return [wizardStartDate]
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

  const dailyTemplates = templates.filter(tpl => {
    const tplDays = (tpl.days || []).filter(d => d?.items?.length || d?.isRest)
    const dayMetaKind = tplDays[0]?.meta?.kind || tpl.days?.[0]?.meta?.kind || null
    return dayMetaKind === 'daily' || tpl.template_kind === 'daily' || tplDays.length === 1
  })
  const weeklyTemplates = templates.filter(tpl => {
    const tplDays = (tpl.days || []).filter(d => d?.items?.length || d?.isRest)
    const dayMetaKind = tplDays[0]?.meta?.kind || tpl.days?.[0]?.meta?.kind || null
    return dayMetaKind !== 'daily' && tpl.template_kind !== 'daily' && tplDays.length !== 1
  })

  const toggleChip = (dateStr) => {
    setWizardSelectedChips(prev =>
      wizardPlanMode === 'day'
        ? [dateStr]
        : prev.includes(dateStr) ? prev.filter(d=>d!==dateStr) : [...prev, dateStr]
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

  const applyTemplate = (tpl) => {
    const tplDays = tpl?.days || []
    const isDailyTpl = tpl.template_kind === 'daily' || tplDays.filter(d => d?.items?.length || d?.isRest).length <= 1
    const newDayPlans = { ...wizardDayPlans }
    const newSessionTypes = { ...wizardSessionTypes }
    const targetDates = wizardSelectedChips.length > 0 ? wizardSelectedChips : datesInRange
    if (isDailyTpl) {
      const dayConfig = tplDays.find(d => d?.items?.length || d?.isRest) || tplDays[0] || {}
      targetDates.forEach(ds => {
        if (dayConfig?.isRest) newDayPlans[ds] = [{ id:'rest', name:'Descanso', cat:'Descanso', isRest:true }]
        else if (dayConfig?.items?.length) {
          newDayPlans[ds] = JSON.parse(JSON.stringify(dayConfig.items))
          if (dayConfig.session_type) newSessionTypes[ds] = dayConfig.session_type
        }
      })
    } else {
      tplDays.forEach((dayConfig, dayIdx) => {
        targetDates.forEach(ds => {
          const d=new Date(ds+'T12:00:00'); const dow=d.getDay(); const di=dow===0?6:dow-1
          if (di===dayIdx) {
            if (dayConfig?.isRest) newDayPlans[ds] = [{id:'rest',name:'Descanso',cat:'Descanso',isRest:true}]
            else if (dayConfig?.items?.length) {
              newDayPlans[ds] = JSON.parse(JSON.stringify(dayConfig.items))
              if (dayConfig.session_type) newSessionTypes[ds] = dayConfig.session_type
            }
          }
        })
      })
    }
    setWizardDayPlans(newDayPlans)
    setWizardSessionTypes(newSessionTypes)
    setWizardDaySource('specific')
  }

  const copyToAllChips = () => {
    if (!primaryChip) return
    const src = wizardDayPlans[primaryChip] || []
    const newPlans = { ...wizardDayPlans }
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
    wizardSelectedChips.forEach(dateStr => {
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
    try {
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
    } catch (err) {
      console.error('saveWizard:', err)
      setWizardError('Erro ao guardar o plano. Tenta novamente.')
      setSaving(false)
      return
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
    setFreeSessionError(null)
    try {
      const dateObj = new Date(freeSession.date+'T12:00:00')
      const dow = dateObj.getDay(); const dayIdx = dow===0?6:dow-1
      const existing = golfPlan
      const baseDays = existing?.days || Array(7).fill(null).map(()=>({sessions:[]}))
      const newDays = JSON.parse(JSON.stringify(baseDays))
      if (!newDays[dayIdx]) newDays[dayIdx]={sessions:[]}
      if (!newDays[dayIdx].sessions) newDays[dayIdx].sessions=[]
      newDays[dayIdx].sessions.push({ id:Date.now(), cat:'Campo', free:true, athlete:email, course:freeSession.course, notes:freeSession.notes, score:freeSession.score, holes:freeSession.holes, items:[] })
      await saveTrainingPlan(
        existing
          ? {days:newDays,updated_at:new Date().toISOString(),updated_by:email}
          : {week_start:weekStart,week_end:getWeekEnd(weekStart),plan_type:'golf',days:newDays,created_by:email,status:'active',title:'Golf Plan'},
        existing ? existing.id : null
      )
      setShowFreeSession(false)
      fetchPlans()
      onPlansChanged?.()
    } catch (err) {
      console.error('addFreeSession:', err)
      setFreeSessionError(err.message || 'Erro ao guardar a sessão.')
    } finally {
      setSavingFree(false)
    }
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
    const comps = evts.filter(isCompetition)
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
    const comps = evts.filter(isCompetition)
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

  const applyWeeklyTemplate = (tpl) => {
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

  const saveAsWeeklyTemplate = async (name) => {
    if(!name.trim()) return
    setSavingTemplate(true)
    try {
      const tplDays=Array(7).fill(null).map((_,dayIdx)=>{
        const ds=datesInRange.find(d=>{ const dd=new Date(d+'T12:00:00'); const dow=dd.getDay(); return (dow===0?6:dow-1)===dayIdx })
        if(!ds) return {items:[],session_type:null,isRest:false}
        const items=wizardDayPlans[ds]||[]
        if(items[0]?.isRest) return {items:[],session_type:null,isRest:true}
        return {items,session_type:wizardSessionTypes[ds]||null,isRest:false}
      })
      await saveTrainingTemplate({
        name:name.trim(),
        plan_type:wizardType,
        days:tplDays,
        created_by:email,
        created_at:new Date().toISOString()
      })
      setShowSaveTemplate(false)
      setWizardTemplateName('')
      fetchTemplates()
    } catch (err) {
      setWizardError(err?.message || 'Não foi possível guardar o template.')
    } finally {
      setSavingTemplate(false)
    }
  }

  const saveAsDailyTemplate = async () => {
    if (!primaryChip || !wizardDailyTemplateName.trim()) return
    const items = wizardDayPlans[primaryChip] || []
    if (!items.length || items[0]?.isRest) return
    setSavingTemplate(true)
    try {
      const dayMeta = {
        kind: 'daily',
        planName: wizardDailyTemplateName.trim(),
        sessionFocus: wizardDailyTemplateFocus.trim(),
        sessionObjective: wizardDailyTemplateObjective.trim(),
        generalObservations: wizardNote.trim(),
        savedAt: new Date().toISOString(),
      }
      const dailyPayload = {
        name: wizardDailyTemplateName.trim(),
        plan_type: wizardType,
        days: [{ items: JSON.parse(JSON.stringify(items)), session_type: wizardSessionTypes[primaryChip] || null, isRest: false, meta: dayMeta }],
        created_by: email,
        created_at: new Date().toISOString(),
      }
      await saveTrainingTemplate(dailyPayload)
      setShowSaveTemplate(false)
      setWizardDailyTemplateName('')
      setWizardDailyTemplateFocus('')
      setWizardDailyTemplateObjective('')
      fetchTemplates()
      setWizardError('')
    } catch (err) {
      setWizardError(err?.message || 'Não foi possível guardar o template diário.')
    } finally {
      setSavingTemplate(false)
    }
  }

  const extractDailyTemplateMeta = (tpl) => {
    const day = (tpl.days || []).find(d => d?.items?.length || d?.isRest) || tpl.days?.[0] || {}
    return day.meta || {}
  }

  const applyDailyTemplate = (tpl) => {
    const day = (tpl.days || []).find(d => d?.items?.length || d?.isRest) || tpl.days?.[0]
    if (!day) return
    const items = day.isRest
      ? [{ id:'rest', name:'Descanso', cat:'Descanso', isRest:true }]
      : JSON.parse(JSON.stringify(day.items || []))
    setWizardDayPlans(prev => ({ ...prev, [primaryChip]: items }))
    setWizardSessionTypes(prev => ({ ...prev, [primaryChip]: day.session_type || prev[primaryChip] || null }))
    const meta = day.meta || {}
    setWizardDailyTemplateName(tpl.name || meta.planName || '')
    setWizardDailyTemplateFocus(meta.sessionFocus || '')
    setWizardDailyTemplateObjective(meta.sessionObjective || '')
    setWizardNote(meta.generalObservations || '')
    setWizardDaySource('saved')
    setShowSaveTemplate(false)
  }

  const exportCurrentDayToExcel = async () => {
    if (!primaryChip) {
      setWizardError('Selecciona um dia para exportar.')
      return
    }
    const items = wizardDayPlans[primaryChip] || []
    const date = primaryChip
    const isRest = items[0]?.isRest === true || items.length === 0
    const rows = isRest
      ? [{
        dayType: 'Rest day',
        sessionType: wizardSessionTypes[primaryChip] || '',
        exerciseName: '',
        exerciseCategory: '',
        quantity: '',
        sets: '',
        reps: '',
        load: '',
        instructions: '',
        notes: '',
        isRest: true,
      }]
      : items.map((item, idx) => ({
        dayType: wizardDaySource === 'saved' ? 'Saved plan' : 'Specific plan',
        sessionType: wizardSessionTypes[primaryChip] || '',
        exerciseName: item.name || item.exerciseName || '',
        exerciseCategory: item.cat || '',
        quantity: item.qty ?? item.default_qty ?? '',
        sets: item.sets ?? item.default_sets ?? '',
        reps: item.reps ?? item.default_reps ?? '',
        load: item.load ?? '',
        instructions: item.desc || item.instructions || '',
        notes: item.notes || '',
        isRest: !!item.isRest,
        order: idx + 1,
      }))

    const workbook = buildDailyTemplateWorkbookV2({
      planName: wizardDailyTemplateName || 'Plano Diário',
      planType: wizardType,
      dayType: isRest ? 'Rest day' : 'Training day',
      sessionType: wizardSessionTypes[primaryChip] || (wizardDaySource === 'saved' ? 'Saved plan' : 'Specific plan'),
      sessionFocus: wizardDailyTemplateFocus || '',
      sessionObjective: wizardDailyTemplateObjective || '',
      generalObservations: wizardNote || '',
      date,
      isRest,
      rows,
    })
    const blob = new Blob([zipStore(Object.entries(workbook).map(([name, data]) => ({ name, data })))], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(wizardDailyTemplateName || 'daily-plan').replace(/[^\w\-]+/g, '_')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importDailyPlanFromExcel = async (file) => {
    if (!primaryChip) {
      setWizardError('Selecciona um dia antes de importar o Excel.')
      return
    }
    try {
      const rows = await parseDailyTemplateXlsxV2(file)
      if (!rows.length) throw new Error('O ficheiro não tem linhas de plano.')
      const first = rows[0]
      const importedPlanName = first['Plan Name'] || wizardDailyTemplateName || 'Plano Diário'
      const importedType = first['Plan Type'] || wizardType
      const importedSessionType = first['Session Type'] || ''
      const importedFocus = first['Session Focus'] || ''
      const importedObjective = first['Session Objective'] || ''
      const importedNotes = first['General Observations'] || ''
      const isRest = String(first['Is Rest']).toLowerCase() === 'yes'
      const importedItems = isRest
        ? [{ id:'rest', name:'Descanso', cat:'Descanso', isRest:true }]
        : rows
            .filter(row => String(row['Exercise Name'] || '').trim())
            .map((row, idx) => ({
              id: `imp_${Date.now()}_${idx}`,
              name: row['Exercise Name'],
              cat: row['Exercise Category'] || (wizardType === 'golf' ? 'Driving Range' : 'Pernas'),
              qty: row['Quantity'] || '',
              sets: row['Sets'] || '',
              reps: row['Reps'] || '',
              load: row['Load'] || '',
              desc: row['Instructions'] || '',
              notes: row['Notes'] || '',
            }))

      setWizardType(importedType === 'gym' ? 'gym' : 'golf')
      setWizardPlanMode('day')
      setWizardStartDate(first.Date || primaryChip)
      setWizardEndDate(first.Date || primaryChip)
      setWizardSelectedChips([primaryChip])
      setWizardDaySource('specific')
      setWizardDayPlans(prev => ({ ...prev, [primaryChip]: importedItems }))
      setWizardSessionTypes(prev => ({ ...prev, [primaryChip]: importedSessionType === 'auto' || importedSessionType === 'Autónomo' ? 'auto' : importedSessionType === 'coach' || importedSessionType === 'Com Coach' ? 'coach' : prev[primaryChip] || null }))
      setWizardDailyTemplateName(importedPlanName)
      setWizardDailyTemplateFocus(importedFocus)
      setWizardDailyTemplateObjective(importedObjective)
      setWizardNote(importedNotes)
      setShowSaveTemplate(false)
      setWizardError('')
    } catch (err) {
      setWizardError(err?.message || 'Não foi possível importar o ficheiro Excel.')
    }
  }

  const deleteTemplate = (id) => setDeleteTemplateConfirm(id)

  const confirmDeleteTemplate = async () => {
    if (!deleteTemplateConfirm) return
    await deleteTrainingTemplate(deleteTemplateConfirm)
    setDeleteTemplateConfirm(null)
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
    await savePeriodizationOverride(ws, phaseId, email)
    setPhaseOverrides(prev => ({ ...prev, [ws]: phaseId }))
    setEditingPhaseWs(null)
    setSavingPhaseOverride(false)
  }

  const clearPhaseOverride = async (ws) => {
    await deletePeriodizationOverride(ws)
    setPhaseOverrides(prev => { const next = { ...prev }; delete next[ws]; return next })
    setEditingPhaseWs(null)
  }
  const resetWizard = () => {
    setWizard(false)
    setWizardStep(1)
    setWizardPlanMode('week')
    setWizardStartDate('')
    setWizardEndDate('')
    setWizardActiveDays([0,1,2,3,4,5,6])
    setWizardDayPlans({})
    setWizardSelectedChips([])
    setWizardDaySource('specific')
    setWizardOpenCat(null)
    setWizardNote('')
    setWizardDailyTemplateName('')
    setWizardDailyTemplateFocus('')
    setWizardDailyTemplateObjective('')
    setWizardCustom({ name:'', cat:'', desc:'' })
    setWizardUserLib([])
    setWizardError('')
    setShowSaveTemplate(false)
    setWizardTemplateName('')
  }

  const startWizard = (type) => {
    resetWizard()
    setWizardType(type)
    setWizard(true)
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
    const { phases: weekPhases, alerts: weekAlerts } = computeAllPhases(wizardWeekStarts, events)

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
            {weeklyTemplates.filter(tpl=>tpl.plan_type===wizardType).length > 0 && (
              <div style={{marginBottom:'20px'}}>
                <div style={{fontSize:'9px',letterSpacing:'2px',color:typeColor,fontWeight:600,marginBottom:'10px'}}>TEMPLATES GUARDADOS</div>
                <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                  {weeklyTemplates.filter(tpl=>tpl.plan_type===wizardType).map(tpl=>(
                    <div key={tpl.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:t.bg,border:`1px solid ${t.border}`,borderRadius:'8px',padding:'10px 14px'}}>
                      <div style={{fontSize:'13px',fontWeight:600,color:t.text}}>{tpl.name}</div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={()=>applyWeeklyTemplate(tpl)} title='Aplicar template'
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

            <div style={{display:'flex',gap:'6px',marginBottom:'14px'}}>
              {[
                { key:'day', label:'Day' },
                { key:'week', label:'Week' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setWizardPlanMode(opt.key)
                    setWizardSelectedChips([])
                    setWizardDaySource('specific')
                    if (opt.key === 'day' && wizardStartDate && !wizardEndDate) setWizardEndDate(wizardStartDate)
                  }}
                  style={{
                    background: wizardPlanMode === opt.key ? typeColor + '18' : 'transparent',
                    border: `1px solid ${wizardPlanMode === opt.key ? typeColor : t.border}`,
                    borderRadius:'20px',
                    color: wizardPlanMode === opt.key ? typeColor : t.textMuted,
                    padding:'5px 12px',
                    cursor:'pointer',
                    fontSize:'11px',
                    fontFamily:F,
                    fontWeight:wizardPlanMode === opt.key ? 700 : 500,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {wizardPlanMode === 'day' ? (
              <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'20px'}}>
                <div>
                  <div style={{fontSize:'10px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'6px'}}>DATA</div>
                  <input type='date' value={wizardStartDate} onChange={e=>{ setWizardStartDate(e.target.value); setWizardEndDate(e.target.value) }} style={{...inp,maxWidth:'200px'}}/>
                </div>
              </div>
            ) : (
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
            )}

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
              {datesInRange.length===0?'Define o período de treino':wizardPlanMode==='day'?'Definir Plano Diário →':'Definir Sessões →'}
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {wizardStep===2 && (
          <div>
            {/* Phase alerts per week */}
            {wizardWeekStarts.map(ws=>{
              const phId = weekPhases[ws]; const ph = PHASES[phId]; const als = weekAlerts[ws]||[]
              if (!ph) return null
              return (
                <div key={ws} style={{...card,marginBottom:'10px',borderLeft:`4px solid ${ph.color}`,background:ph.bg,padding:'10px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                    <div style={{padding:'2px 8px',borderRadius:'4px',fontSize:'8px',fontWeight:700,letterSpacing:'1px',color:'#fff',background:ph.color}}>{ph.label}</div>
                    <div style={{fontSize:'11px',color:ph.color,fontWeight:600}}>{ph.situacao}</div>
                  </div>
                  {als.map((a,i)=>(
                    <div key={i} style={{fontSize:'10px',color:a.level==='red'?'#991b1b':'#854F0B',marginTop:'3px'}}>{a.icon} {a.text}</div>
                  ))}
                </div>
              )
            })}

            {/* Competition warning */}
            {datesInRange.some(ds=>dateHasComp(ds)) && (
              <div style={{fontSize:'11px',color:'#854F0B',marginBottom:'10px',display:'flex',alignItems:'center',gap:'5px',padding:'6px 10px',background:'#FFF3CD',borderRadius:'6px',border:'1px solid #BA751744'}}>
                🏆 Dias com competição não precisam de sessão de treino.
              </div>
            )}

            {/* Chip grid — day selector */}
            <div style={{...card,marginBottom:'14px',padding:'14px 16px'}}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'10px'}}>
                SELECCIONA OS DIAS A CONFIGURAR
              </div>
              {Object.entries(chipsByWeek).map(([ws, wDates])=>(
                <div key={ws} style={{marginBottom:'10px'}}>
                  <div style={{fontSize:'10px',color:t.textMuted,marginBottom:'6px',fontWeight:600}}>
                    Semana de {new Date(ws+'T12:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'short'})}
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                    {wDates.map(ds=>{
                      const d=new Date(ds+'T12:00:00')
                      const dow=d.getDay(); const dayIdx=dow===0?6:dow-1
                      const sel=wizardSelectedChips.includes(ds)
                      const hasData=chipHasData(ds)
                      const isComp=dateHasComp(ds)
                      return (
                        <div key={ds} onClick={()=>isComp?null:toggleChip(ds)}
                          style={{padding:'7px 12px',borderRadius:'8px',cursor:isComp?'default':'pointer',minWidth:'52px',textAlign:'center',
                            border:`2px solid ${isComp?'#BA751744':sel?typeColor:hasData?typeColor+'55':t.border}`,
                            background:isComp?'#FFF3CD':sel?typeColor+'18':hasData?typeColor+'09':t.surface,
                            opacity:isComp?0.7:1}}>
                          <div style={{fontSize:'9px',letterSpacing:'1px',color:isComp?'#854F0B':sel?typeColor:t.textMuted,fontWeight:700}}>{DAYS_SHORT_PT[dayIdx]}</div>
                          <div style={{fontSize:'15px',fontWeight:900,color:isComp?'#854F0B':sel?typeColor:t.text,lineHeight:1.2}}>{d.getDate()}</div>
                          {isComp&&<div style={{fontSize:'8px',color:'#854F0B'}}>🏆</div>}
                          {!isComp&&hasData&&!sel&&<div style={{width:'5px',height:'5px',borderRadius:'50%',background:typeColor,margin:'2px auto 0'}}/>}
                          {!isComp&&sel&&<div style={{fontSize:'8px',color:typeColor,fontWeight:700}}>✓</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div style={{display:'flex',gap:'8px',marginTop:'8px',flexWrap:'wrap'}}>
                <button onClick={()=>setWizardSelectedChips(wizardPlanMode==='day' ? datesInRange.slice(0,1).filter(ds=>!dateHasComp(ds)) : datesInRange.filter(ds=>!dateHasComp(ds)))}
                  style={{background:'transparent',border:`1px solid ${typeColor}`,borderRadius:'6px',color:typeColor,padding:'4px 10px',cursor:'pointer',fontSize:'11px',fontWeight:600,fontFamily:F}}>
                  {wizardPlanMode==='day' ? 'Seleccionar dia' : 'Seleccionar todos'}
                </button>
                <button onClick={()=>setWizardSelectedChips([])}
                  style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'4px 10px',cursor:'pointer',fontSize:'11px',fontFamily:F}}>
                  Limpar
                </button>
                {wizardSelectedChips.length>0&&(
                  <button onClick={markRestDay}
                    style={{background:'transparent',border:'1px solid #f59e0b',borderRadius:'6px',color:'#f59e0b',padding:'4px 10px',cursor:'pointer',fontSize:'11px',fontFamily:F}}>
                    😴 Marcar descanso
                  </button>
                )}
                {wizardSelectedChips.length>0&&(
                  <button onClick={clearRestDay}
                    style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'4px 10px',cursor:'pointer',fontSize:'11px',fontFamily:F}}>
                    ✕ Limpar dias
                  </button>
                )}
              </div>
            </div>

            {/* Session type picker for selected chips */}
            {wizardSelectedChips.length>0 && !isRestDay && (
              <div style={{...card,marginBottom:'14px',padding:'14px 16px'}}>
                <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'8px'}}>TIPO DE SESSÃO</div>
                <div style={{display:'flex',gap:'8px'}}>
                  {[{v:'coach',l:'Com Coach'},{v:'auto',l:'Autónomo'}].map(opt=>{
                    const allMatch = wizardSelectedChips.every(ds=>wizardSessionTypes[ds]===opt.v)
                    return (
                      <button key={opt.v} onClick={()=>{
                        const next={...wizardSessionTypes}
                        wizardSelectedChips.forEach(ds=>{next[ds]=opt.v})
                        setWizardSessionTypes(next)
                      }}
                        style={{flex:1,padding:'9px',borderRadius:'8px',fontFamily:F,fontSize:'12px',fontWeight:allMatch?700:400,cursor:'pointer',
                          border:`1px solid ${allMatch?typeColor:t.border}`,background:allMatch?typeColor+'18':'transparent',color:allMatch?typeColor:t.textMuted}}>
                        {opt.l}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Plan source */}
            {wizardSelectedChips.length>0 && !isRestDay && (
              <div style={{...card,marginBottom:'14px',padding:'14px 16px'}}>
                <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'8px'}}>PLANO PARA ESTE DIA</div>
                <div style={{display:'flex',gap:'6px',marginBottom:'10px',flexWrap:'wrap'}}>
                  <button onClick={()=>setWizardDaySource('specific')}
                    style={{background:wizardDaySource==='specific'?typeColor+'18':'transparent',border:`1px solid ${wizardDaySource==='specific'?typeColor:t.border}`,borderRadius:'16px',color:wizardDaySource==='specific'?typeColor:t.textMuted,padding:'5px 10px',cursor:'pointer',fontSize:'11px',fontWeight:wizardDaySource==='specific'?700:500,fontFamily:F}}>
                    Novo plano
                  </button>
                  <button onClick={()=>setWizardDaySource('saved')}
                    style={{background:wizardDaySource==='saved'?typeColor+'18':'transparent',border:`1px solid ${wizardDaySource==='saved'?typeColor:t.border}`,borderRadius:'16px',color:wizardDaySource==='saved'?typeColor:t.textMuted,padding:'5px 10px',cursor:'pointer',fontSize:'11px',fontWeight:wizardDaySource==='saved'?700:500,fontFamily:F}}>
                    Plano guardado
                  </button>
                  <button onClick={exportCurrentDayToExcel}
                    style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'16px',color:t.textMuted,padding:'5px 10px',cursor:'pointer',fontSize:'11px',fontWeight:600,fontFamily:F}}>
                    Exportar Excel
                  </button>
                  <button onClick={()=>excelFileRef.current?.click()}
                    style={{background:typeColor+'18',border:`1px solid ${typeColor}`,borderRadius:'16px',color:typeColor,padding:'5px 10px',cursor:'pointer',fontSize:'11px',fontWeight:700,fontFamily:F}}>
                    Importar Excel
                  </button>
                  <input ref={excelFileRef} type="file" accept=".xlsx" style={{display:'none'}} onChange={e => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) importDailyPlanFromExcel(file)
                  }} />
                </div>
                {wizardDaySource==='saved' ? (
                  dailyTemplates.length > 0 ? (
                    <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                      {dailyTemplates.map(tpl => (
                        <button key={tpl.id} onClick={()=>applyDailyTemplate(tpl)}
                          style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px',width:'100%',background:t.bg,border:`1px solid ${t.border}`,borderRadius:'8px',padding:'9px 12px',cursor:'pointer',fontFamily:F,textAlign:'left'}}>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:'12px',fontWeight:700,color:t.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tpl.name}</div>
                            <div style={{fontSize:'10px',color:t.textMuted,marginTop:'1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {extractDailyTemplateMeta(tpl).sessionFocus || extractDailyTemplateMeta(tpl).sessionObjective || 'Plano diário guardado'}
                            </div>
                          </div>
                          <div style={{fontSize:'10px',color:typeColor,fontWeight:700,flexShrink:0}}>Aplicar</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon="📋" message="Sem planos guardados." subMessage="Cria um plano e guarda-o para reutilizar." t={t} compact />
                  )
                ) : (
                  <div style={{fontSize:'11px',color:t.textMuted}}>Cria um plano específico e guarda-o para reutilizar em outros dias.</div>
                )}
              </div>
            )}

            {/* Chip summary / rest indicator */}
            {wizardSelectedChips.length>0 && isRestDay && (
              <div style={{...card,marginBottom:'14px',padding:'12px 16px',background:'#fff7ed',border:'1px solid #f59e0b44'}}>
                <div style={{fontSize:'12px',color:'#f59e0b',fontWeight:600}}>😴 Dia de descanso marcado para os dias seleccionados</div>
              </div>
            )}

            {/* Current session for primary chip */}
            {wizardSelectedChips.length>0 && !isRestDay && wizardDaySource==='specific' && (
              <div style={{...card,marginBottom:'14px',padding:'14px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <div style={{fontSize:'9px',letterSpacing:'2px',color:typeColor,fontWeight:600}}>
                    SESSÃO — {primaryItems.length} exercício{primaryItems.length!==1?'s':''}
                    {wizardType==='golf'&&primaryItems.length>0&&totalMins>0&&<span style={{color:t.textMuted,fontWeight:400}}> · {fmtMins(totalMins)}{totalBalls>0&&` · ~${totalBalls} bolas`}</span>}
                  </div>
                  {wizardSelectedChips.length>1&&primaryItems.length>0&&(
                    <button onClick={copyToAllChips}
                      style={{background:'transparent',border:`1px solid ${typeColor}`,borderRadius:'6px',color:typeColor,padding:'3px 10px',cursor:'pointer',fontSize:'11px',fontWeight:600,fontFamily:F}}>
                      Copiar para todos
                    </button>
                  )}
                </div>
                {primaryItems.length===0&&(
                  <div style={{fontSize:'12px',color:t.textMuted,marginBottom:'8px'}}>Adiciona exercícios da biblioteca abaixo.</div>
                )}
                {primaryItems.map((item,ii)=>(
                  <div key={item.id} style={{background:t.bg,border:`1px solid ${t.border}`,borderRadius:'6px',padding:'7px 10px',marginBottom:'4px',display:'flex',alignItems:'center',gap:'8px'}}>
                    <div style={{display:'flex',flexDirection:'column',gap:'2px',marginRight:'2px'}}>
                      <button onClick={()=>moveItem(item.id,'up')} disabled={ii===0} style={{background:'transparent',border:'none',cursor:ii===0?'default':'pointer',color:ii===0?t.border:t.textMuted,fontSize:'10px',padding:'0',lineHeight:1}}>▲</button>
                      <button onClick={()=>moveItem(item.id,'down')} disabled={ii===primaryItems.length-1} style={{background:'transparent',border:'none',cursor:ii===primaryItems.length-1?'default':'pointer',color:ii===primaryItems.length-1?t.border:t.textMuted,fontSize:'10px',padding:'0',lineHeight:1}}>▼</button>
                    </div>
                    <div style={{flex:1,fontSize:'12px',fontWeight:500,color:t.text,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div>
                    {wizardType==='golf'?(
                      <div style={{display:'flex',alignItems:'center',gap:'3px',flexShrink:0}}>
                        <input type='number' value={item.qty||''} onChange={e=>updateItem(item.id,'qty',e.target.value)} placeholder='50' style={{...smInp,width:'54px'}}/>
                        <span style={{fontSize:'9px',color:t.textMuted}}>bolas</span>
                      </div>
                    ):(
                      <div style={{display:'flex',gap:'3px',flexShrink:0}}>
                        <input type='number' value={item.sets||''} onChange={e=>updateItem(item.id,'sets',e.target.value)} placeholder='3' style={{...smInp,width:'40px'}}/>
                        <input type='number' value={item.reps||''} onChange={e=>updateItem(item.id,'reps',e.target.value)} placeholder='10' style={{...smInp,width:'40px'}}/>
                        <input value={item.load||''} onChange={e=>updateItem(item.id,'load',e.target.value)} placeholder='kg' style={{...smInp,width:'38px'}}/>
                      </div>
                    )}
                    <button onClick={()=>removeItem(item.id)} style={{background:'transparent',border:'none',cursor:'pointer',color:'#ef4444',fontSize:'14px',padding:'0',flexShrink:0}}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Exercise library — only shown when chips are selected and not rest */}
            {wizardSelectedChips.length>0 && !isRestDay && wizardDaySource==='specific' && (
              <div style={{...card,marginBottom:'14px',padding:'14px 16px'}}>
                <div style={{fontSize:'9px',letterSpacing:'2px',color:t.textMuted,fontWeight:600,marginBottom:'8px'}}>BIBLIOTECA DE EXERCÍCIOS</div>
                {cats.map(cat=>{
                  const catItems=allLib.filter(e=>e.cat===cat)
                  const open=wizardOpenCat===cat
                  return (
                    <div key={cat} style={{border:`1px solid ${t.border}`,borderRadius:'8px',marginBottom:'4px',overflow:'hidden'}}>
                      <button onClick={()=>setWizardOpenCat(open?null:cat)}
                        style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',background:'transparent',border:'none',cursor:'pointer',fontFamily:F}}>
                        <div style={{fontSize:'12px',fontWeight:600,color:t.text}}>{cat}</div>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <div style={{fontSize:'10px',color:t.textMuted}}>{catItems.filter(e=>isDrillSelected(e.id)).length}/{catItems.length}</div>
                          <div style={{fontSize:'11px',color:t.textMuted}}>{open?'▲':'▼'}</div>
                        </div>
                      </button>
                      {open&&catItems.map(ex=>{
                        const sel=isDrillSelected(ex.id)
                        return (
                          <div key={ex.id} onClick={()=>toggleDrill(ex)}
                            style={{borderTop:`1px solid ${t.border}`,padding:'8px 12px',background:sel?typeColor+'0d':'transparent',cursor:'pointer',display:'flex',gap:'8px',alignItems:'flex-start'}}>
                            <div style={{width:'16px',height:'16px',borderRadius:'3px',flexShrink:0,marginTop:'1px',
                              border:`2px solid ${sel?typeColor:t.border}`,background:sel?typeColor:'transparent',
                              display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'10px',fontWeight:900}}>
                              {sel?'✓':''}
                            </div>
                            <div style={{flex:1}}>
                              <div style={{fontSize:'12px',fontWeight:sel?600:400,color:sel?typeColor:t.text}}>{ex.name}</div>
                              <div style={{fontSize:'10px',color:t.textMuted}}>{ex.desc.length>60?ex.desc.slice(0,60)+'…':ex.desc}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}

                {/* Custom exercise */}
                <div style={{...card,marginTop:'8px',padding:'10px 12px'}}>
                  <div style={{fontSize:'9px',letterSpacing:'1px',color:t.textMuted,fontWeight:600,marginBottom:'6px'}}>EXERCÍCIO PERSONALIZADO</div>
                  <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                    <input placeholder='Nome' value={wizardCustom.name} onChange={e=>setWizardCustom(p=>({...p,name:e.target.value}))} style={{...inp,flex:2,minWidth:'120px'}}/>
                    <select value={wizardCustom.cat} onChange={e=>setWizardCustom(p=>({...p,cat:e.target.value}))} style={{...inp,flex:1,minWidth:'80px'}}>
                      <option value=''>Cat.</option>
                      {cats.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={addCustom} style={{background:typeColor,border:'none',borderRadius:'6px',color:'#fff',padding:'7px 12px',cursor:'pointer',fontSize:'12px',fontWeight:700,fontFamily:F}}>+</button>
                  </div>
                </div>
              </div>
            )}

            {/* Save as template */}
            {wizardSelectedChips.length>0 && primaryItems.length>0 && !isRestDay && (
              <div style={{marginBottom:'14px'}}>
                {wizardSelectedChips.length === 1 ? (
                  !showSaveTemplate ? (
                    <button onClick={()=>setShowSaveTemplate(true)}
                      style={{width:'100%',padding:'9px',background:'transparent',border:`1px dashed ${typeColor}`,borderRadius:'8px',color:typeColor,cursor:'pointer',fontSize:'12px',fontWeight:600,fontFamily:F}}>
                      💾 Guardar como plano diário
                    </button>
                  ) : (
                    <div style={{...card,padding:'12px 14px'}}>
                      <div style={{fontSize:'9px',letterSpacing:'1px',color:typeColor,fontWeight:600,marginBottom:'8px'}}>GUARDAR PLANO DIÁRIO</div>
                      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                        <input value={wizardDailyTemplateName} onChange={e=>setWizardDailyTemplateName(e.target.value)} placeholder='Nome do plano' style={{...inp}}/>
                        <input value={wizardDailyTemplateFocus} onChange={e=>setWizardDailyTemplateFocus(e.target.value)} placeholder='Foco da sessão' style={{...inp}}/>
                        <input value={wizardDailyTemplateObjective} onChange={e=>setWizardDailyTemplateObjective(e.target.value)} placeholder='Objetivo da sessão' style={{...inp}}/>
                        <textarea value={wizardNote} onChange={e=>setWizardNote(e.target.value)} placeholder='Observações gerais' style={{...inp,minHeight:'56px',resize:'vertical'}}/>
                        <div style={{display:'flex',gap:'6px'}}>
                          <button onClick={saveAsDailyTemplate} disabled={savingTemplate||!wizardDailyTemplateName.trim()}
                            style={{background:savingTemplate?t.border:typeColor,border:'none',borderRadius:'6px',color:'#fff',padding:'7px 14px',cursor:'pointer',fontSize:'12px',fontWeight:700,fontFamily:F}}>
                            {savingTemplate?'A guardar...':'Guardar'}
                          </button>
                          <button onClick={()=>setShowSaveTemplate(false)}
                            style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'7px 10px',cursor:'pointer',fontSize:'12px',fontFamily:F}}>
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  !showSaveTemplate ? (
                    <button onClick={()=>setShowSaveTemplate(true)}
                      style={{width:'100%',padding:'9px',background:'transparent',border:`1px dashed ${typeColor}`,borderRadius:'8px',color:typeColor,cursor:'pointer',fontSize:'12px',fontWeight:600,fontFamily:F}}>
                      💾 Guardar como template semanal
                    </button>
                  ) : (
                    <div style={{...card,padding:'12px 14px'}}>
                      <div style={{fontSize:'9px',letterSpacing:'1px',color:typeColor,fontWeight:600,marginBottom:'6px'}}>NOME DO TEMPLATE</div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <input value={wizardTemplateName} onChange={e=>setWizardTemplateName(e.target.value)} placeholder='Ex: Semana de Acumulação' style={{...inp,flex:1}}/>
                        <button onClick={()=>saveAsWeeklyTemplate(wizardTemplateName)} disabled={savingTemplate||!wizardTemplateName.trim()}
                          style={{background:savingTemplate?t.border:typeColor,border:'none',borderRadius:'6px',color:'#fff',padding:'7px 14px',cursor:'pointer',fontSize:'12px',fontWeight:700,fontFamily:F}}>
                          {savingTemplate?'A guardar...':'OK'}
                        </button>
                        <button onClick={()=>setShowSaveTemplate(false)}
                          style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'6px',color:t.textMuted,padding:'7px 10px',cursor:'pointer',fontSize:'12px',fontFamily:F}}>
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {wizardError&&(
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'10px 14px',marginBottom:'12px',fontSize:'12px',color:'#991b1b',fontWeight:600}}>
                ⚠ {wizardError}
              </div>
            )}
            <div style={{display:'flex',justifyContent:'space-between',marginTop:'4px',gap:'8px'}}>
              <button onClick={()=>{setWizardStep(1)}}
                style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'12px 20px',fontSize:'13px',cursor:'pointer',fontFamily:F}}>
                ← Voltar
              </button>
              <button onClick={saveWizard} disabled={saving||wizardSelectedChips.length===0}
                style={{background:saving||wizardSelectedChips.length===0?t.border:typeColor,border:'none',borderRadius:'8px',color:saving||wizardSelectedChips.length===0?t.textMuted:'#fff',
                  padding:'12px 28px',fontSize:'14px',fontWeight:700,cursor:saving||wizardSelectedChips.length===0?'not-allowed':'pointer',fontFamily:F}}>
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

      {/* Confirmação apagar template */}
      {deleteTemplateConfirm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
          <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:'14px',padding:'28px 32px',maxWidth:'360px',width:'100%',fontFamily:F}}>
            <div style={{fontSize:'16px',fontWeight:700,color:t.text,marginBottom:'8px'}}>Apagar este template?</div>
            <div style={{fontSize:'13px',color:t.textMuted,marginBottom:'24px',lineHeight:1.6}}>Esta acção é irreversível. O template será apagado permanentemente.</div>
            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
              <button onClick={()=>setDeleteTemplateConfirm(null)} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'20px',color:t.textMuted,padding:'7px 16px',cursor:'pointer',fontSize:'12px',fontFamily:F}}>Cancelar</button>
              <button onClick={confirmDeleteTemplate} style={{background:'#dc2626',border:'none',borderRadius:'20px',color:'#fff',padding:'7px 16px',cursor:'pointer',fontSize:'12px',fontFamily:F,fontWeight:700}}>Apagar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .train-coach-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .train-stats-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px}
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
                <div style={{fontSize:'10px',letterSpacing:'2px',color:t.textMuted,marginBottom:'5px',fontWeight:600}}>CAMPO</div>
                <input value={freeSession.course} onChange={e=>setFreeSession(p=>({...p,course:e.target.value}))} placeholder='Nome do campo / percurso' style={inp}/>
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
            {freeSessionError && (
              <div style={{color:'#f87171',fontSize:'12px',padding:'8px 10px',background:'rgba(248,113,113,0.1)',borderRadius:'6px',marginBottom:'10px',borderLeft:'3px solid #f87171'}}>
                ⚠ {freeSessionError}
              </div>
            )}
            <div style={{display:'flex',gap:'8px',justifyContent:'flex-end'}}>
              <button onClick={()=>{setShowFreeSession(false);setFreeSessionError(null)}} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:'8px',color:t.textMuted,padding:'8px 16px',cursor:'pointer',fontSize:'13px',fontFamily:F}}>Cancelar</button>
              <button onClick={addFreeSession} disabled={savingFree} style={{background:savingFree?t.border:golfColor,border:'none',borderRadius:'8px',color:'#fff',padding:'8px 20px',cursor:'pointer',fontSize:'13px',fontWeight:700,fontFamily:F}}>{savingFree?'A guardar...':'Guardar'}</button>
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
              onClick={()=>startWizard('golf')}>
              <div style={{fontSize:'9px',letterSpacing:'2px',color:golfColor,fontWeight:700,marginBottom:'2px'}}>COACH GOLF</div>
              <div style={{fontSize:'14px',fontWeight:800,color:golfDark}}>Golf Plan</div>
              <div style={{fontSize:'11px',color:'#185FA5',marginTop:'4px',lineHeight:1.4}}>Drills · bolas · campo</div>
              <div style={{marginTop:'10px',display:'inline-flex',alignItems:'center',gap:'4px',background:golfColor,color:'#fff',padding:'5px 12px',borderRadius:'6px',fontSize:'11px',fontWeight:700}}>
                + Criar
              </div>
            </div>
            <div style={{background:'#eafff0',border:`2px solid ${gymColor}`,borderRadius:'12px',padding:'14px 16px',cursor:'pointer'}}
              onClick={()=>startWizard('gym')}>
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
        const { phases: logPhases } = computeAllPhases(allKnownWeeks, events)
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
                        {session.course&&<div style={{fontSize:'12px',color:t.textMuted}}>{session.course}</div>}
                        {session.notes&&<div style={{fontSize:'12px',color:t.textMuted}}>{session.notes}</div>}
                        {session.score&&<div style={{fontSize:'13px',fontWeight:700,color:t.text}}>Score: {session.score}{session.holes?` (${session.holes}h)`:''}</div>}
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px',flexShrink:0}}>
                        {COACH_ROLES.includes(userRole)&&!session.free&&(
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
              <button onClick={async()=>{const p=golfPlan||gymPlan;if(p)await saveTrainingPlan({athlete_notes:athleteNote,updated_at:new Date().toISOString()},p.id)}}
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
        const golfSessions = allSessions.filter(s => s.plan_type === 'golf' && !s.free)
        const gymSessions = allSessions.filter(s => s.plan_type === 'gym')
        const practiceRounds = allSessions.filter(s => s.plan_type === 'golf' && s.free)
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
                {l:'SESSÕES', v:allSessions.length, c:t.text},
                {l:'GOLF', v:golfSessions.length, c:golfColor},
                {l:'GYM', v:gymSessions.length, c:gymColor},
                {l:'RONDAS', v:practiceRounds.length, c:'#f59e0b'},
                {l:'CONCLUSÃO', v:`${overallComp}%`, c:overallComp>=80?gymColor:overallComp>=50?'#f59e0b':'#ef4444'},
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
                {[...GOLF_CATS].sort((a,b)=>(catCounts[b]||0)-(catCounts[a]||0)).map(cat=>{
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
                {[...GYM_CATS].sort((a,b)=>(catCounts[b]||0)-(catCounts[a]||0)).map(cat=>{
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
                          <div style={{fontSize:'10px',color:t.textMuted}}>
                            {s.free ? 'Ronda de campo' : s.cat}
                            {s.course ? ` · ${s.course}` : ''}
                          </div>
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
        const isCoach = COACH_ROLES.includes(userRole)
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        const currentWsDate = new Date(todayStr+'T12:00:00')
        const dow = currentWsDate.getDay()
        currentWsDate.setDate(currentWsDate.getDate() - (dow===0?6:dow-1))
        const currentWs = currentWsDate.toISOString().split('T')[0]
        const addWeeks = (ws, n) => { const d=new Date(ws+'T12:00:00'); d.setDate(d.getDate()+n*7); return d.toISOString().split('T')[0] }
        const allWeeks = Array.from({length:24}, (_,i) => addWeeks(currentWs, i-4))
        const {phases: autoPhases, alerts: autoAlerts} = computeAllPhases(allWeeks, events)
        const resolvedPhases = {}
        allWeeks.forEach(ws => { resolvedPhases[ws] = phaseOverrides[ws] || autoPhases[ws] || 'acumulacao' })
        const mesociclos = []
        for (let i=0; i<allWeeks.length; i+=4) mesociclos.push(allWeeks.slice(i, i+4))
        const comps = events.filter(isCompetition)
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
        const currentSummary = getPhaseSummary(currentWs, events, currentPhId)

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
