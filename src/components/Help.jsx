import { useState } from 'react'

const F = "'Inter', sans-serif"

const MODULES = [
  {
    icon: '🏠',
    title: 'Overview',
    desc: 'Página inicial com visão rápida do momento atual da atleta.',
    items: ['Foco da semana', 'Eventos próximos', 'Indicadores principais', 'Acesso rápido ao calendário', 'Estado geral do plano'],
    note: 'Responde à pergunta: "Onde estamos agora e o que é importante esta semana?"',
  },
  {
    icon: '📅',
    title: 'Calendar',
    desc: 'Área onde se organizam treinos, competições e eventos relevantes.',
    items: ['Criar eventos e treinos', 'Marcar torneios', 'Acompanhar a semana', 'Indicar quando uma competição foi jogada'],
    note: 'Só competições marcadas como played contam para Competições & Stats.',
  },
  {
    icon: '🏆',
    title: 'Competições & Stats',
    desc: 'Área onde se analisam os torneios jogados e os resultados da atleta.',
    items: ['Preencher scores por round', 'Registar estatísticas', 'Analisar médias', 'Comparar rounds', 'Acompanhar evolução competitiva'],
    note: 'A média de score é calculada por round, não por torneio.',
  },
  {
    icon: '💪',
    title: 'Training Plan & Progress',
    desc: 'Área dedicada ao planeamento do treino e acompanhamento da execução.',
    items: ['Plano semanal', 'Sessões de treino', 'Registo do que foi feito', 'Evolução física, técnica e mental'],
    note: 'O treino deve estar ligado ao que acontece em competição.',
  },
]

const STEPS = [
  { n: '1', title: 'Criar evento no Calendar', desc: 'Adicionar treino, competição ou outro evento relevante.' },
  { n: '2', title: 'Marcar competição como played', desc: 'Quando o torneio estiver concluído, atualizar o estado para played.' },
  { n: '3', title: 'Preencher stats', desc: 'Na área de Competições & Stats, preencher score, posição e estatísticas principais.' },
  { n: '4', title: 'Validar os dados', desc: 'Confirmar se os rounds aparecem corretamente e se os KPIs fazem sentido.' },
  { n: '5', title: 'Acompanhar evolução', desc: 'Usar Overview, CompStats e Progress para perceber tendências e ajustar o treino.' },
]

const FAQ = [
  {
    q: 'Porque é que uma competição não aparece em Competições & Stats?',
    a: 'Porque provavelmente ainda não está marcada como played no Calendar, ou ainda não tem resultados válidos preenchidos por round.',
  },
  {
    q: 'Porque é que a média de score não usa o total do torneio?',
    a: 'Porque no golfe a média deve ser calculada por round. Um torneio de 3 rounds conta como 3 scores individuais, não como um total de 3 voltas.',
  },
  {
    q: 'O que significa "Por preencher"?',
    a: 'Significa que a competição existe no sistema, mas ainda não tem dados válidos nos rounds. Deve ser editada e preenchida.',
  },
  {
    q: 'Posso editar stats depois de guardar?',
    a: 'Sim. Os resultados e estatísticas podem ser editados em qualquer altura na área de Competições & Stats.',
  },
  {
    q: 'Os torneios cancelados ou confirmados contam para as estatísticas?',
    a: 'Não. Só torneios com estado played entram nos cálculos de estatísticas e KPIs.',
  },
  {
    q: 'O que devo preencher sempre?',
    a: 'No mínimo: score por round e posição final. Quando existirem dados fiáveis: putts, GIR, FIR e penalties.',
  },
  {
    q: 'O que acontece aos dados antigos sem estrutura de rounds?',
    a: 'Se existirem scores antigos fora da estrutura por rounds, ao editar o resultado o sistema pode migrar esse valor para Round 1.',
  },
  {
    q: 'Para que serve o Overview?',
    a: 'Serve para dar uma visão rápida da semana, próximos eventos e estado geral da atleta. Deve ser o ponto de partida diário.',
  },
]

function FaqItem({ q, a, t }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: '14px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'transparent', border: 'none', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', cursor: 'pointer', fontFamily: F, textAlign: 'left' }}
      >
        <span style={{ fontSize: '14px', fontWeight: 700, color: t.text, lineHeight: 1.4 }}>{q}</span>
        <span style={{ fontSize: '18px', color: t.textMuted, flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
      </button>
      {open && (
        <div style={{ padding: '0 18px 16px', fontSize: '14px', color: t.textMuted, lineHeight: 1.6 }}>{a}</div>
      )}
    </div>
  )
}

export default function Help({ theme, t }) {
  const card = { background: t.surface, border: `1px solid ${t.border}`, borderRadius: '18px', padding: '20px 22px' }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: F }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1a2744, #0f172a)', borderRadius: '22px', padding: '36px 32px', color: '#fff' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px', color: '#52E8A0', marginBottom: '10px', textTransform: 'uppercase' }}>Manual da Plataforma</div>
        <h1 style={{ margin: '0 0 10px', fontSize: '26px', fontWeight: 900, lineHeight: 1.2 }}>Ajuda & Manual da Plataforma</h1>
        <p style={{ margin: '0 0 18px', fontSize: '15px', opacity: 0.8, lineHeight: 1.6 }}>
          Guia rápido para perceber como usar a plataforma de acompanhamento da performance da Francisca.
        </p>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.65, lineHeight: 1.7 }}>
          Esta plataforma foi criada para acompanhar a evolução desportiva da atleta, centralizando calendário, competições,
          estatísticas, plano de treino e progresso numa única ferramenta.
          O objetivo não é apenas guardar dados — é transformar esses dados em informação útil para melhorar decisões de treino,
          preparação e competição.
        </p>
      </div>

      {/* Objetivo */}
      <div style={card}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: t.textMuted, marginBottom: '12px', textTransform: 'uppercase' }}>Objetivo principal</div>
        <p style={{ margin: '0 0 14px', fontSize: '14px', color: t.text, lineHeight: 1.6 }}>
          A plataforma existe para ajudar a acompanhar e melhorar a performance desportiva da Francisca de forma estruturada.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '18px' }}>
          {['Planear treinos e competições', 'Registar resultados de torneios', 'Analisar estatísticas por round', 'Acompanhar evolução ao longo do tempo', 'Ligar treino, competição e progresso'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#52E8A0', fontWeight: 800, marginTop: '1px', flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: '13px', color: t.text, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
        <div style={{ background: t.successBg, border: '1px solid #52E8A0', borderRadius: '12px', padding: '12px 16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: t.success }}>Regra de ouro: </span>
          <span style={{ fontSize: '13px', color: t.text }}>Os dados só têm valor se forem preenchidos de forma consistente. Cada competição deve estar corretamente registada no calendário e os resultados preenchidos por round.</span>
        </div>
      </div>

      {/* Grandes áreas */}
      <div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: t.text, marginBottom: '14px' }}>Grandes áreas da plataforma</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {MODULES.map(mod => (
            <div key={mod.title} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>{mod.icon}</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: t.text }}>{mod.title}</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: t.textMuted, lineHeight: 1.5 }}>{mod.desc}</p>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {mod.items.map((item, i) => (
                  <li key={i} style={{ fontSize: '13px', color: t.text, lineHeight: 1.5 }}>{item}</li>
                ))}
              </ul>
              <div style={{ background: t.subtleBg, borderRadius: '10px', padding: '10px 12px', marginTop: 'auto' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: t.text }}>⚑ </span>
                <span style={{ fontSize: '12px', color: t.text }}>{mod.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regra principal */}
      <div style={{ ...card, background: t.accentBg, border: '1px solid #93c5fd' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: t.text }}>Regra principal dos dados</span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: '14px', color: t.text, lineHeight: 1.6 }}>
          Para que os dados sejam usados corretamente nas estatísticas, devem cumprir duas condições:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {[
            'A competição tem de estar marcada como played no Calendar.',
            'Os resultados devem estar preenchidos por round.',
          ].map((rule, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1d4ed8', color: t.navTextActive, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: '14px', color: t.text, lineHeight: 1.5, paddingTop: '2px' }}>{rule}</span>
            </div>
          ))}
        </div>
        <div style={{ background: t.accentBg, borderRadius: '10px', padding: '12px 14px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8' }}>Exemplo: </span>
          <span style={{ fontSize: '13px', color: t.text }}>Se uma competição teve 2 voltas com 78 e 70, a competição mostra 148, mas a média de score usa 78 e 70 como dois valores separados. Isto evita médias erradas e garante KPIs corretos.</span>
        </div>
      </div>

      {/* 5 passos */}
      <div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: t.text, marginBottom: '14px' }}>Como usar a plataforma em 5 passos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {STEPS.map(step => (
            <div key={step.n} style={{ ...card, display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '16px 20px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: t.text, color: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>{step.n}</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: t.text, marginBottom: '3px' }}>{step.title}</div>
                <div style={{ fontSize: '13px', color: t.textMuted, lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalhe das áreas */}
      <div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: t.text, marginBottom: '14px' }}>Como funcionam as principais áreas</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div style={card}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: t.text, marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>🏆 Competições & Stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {[
                { label: 'Score', desc: 'Deve ser preenchido por round. Se houver 3 rounds, devem existir 3 scores.' },
                { label: 'Média Score', desc: 'Calculada com base em todos os rounds válidos. Não usa o total da competição.' },
                { label: 'Posição', desc: 'Dado da competição, não do round individual.' },
                { label: 'GIR / FIR / Putts / Penalties', desc: 'Estatísticas de performance. Preencher quando existirem dados fiáveis.' },
                { label: 'Por preencher', desc: 'A competição existe mas ainda não tem dados válidos nos rounds.' },
                { label: 'Dados antigos (legacy)', desc: 'Se existir um score fora dos rounds, ao editar o sistema pode migrar para Round 1.' },
              ].map((item, i) => (
                <div key={i} style={{ background: t.subtleBg, borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: t.text, marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: t.text, marginBottom: '14px' }}>📅 Calendar</div>
            <p style={{ margin: '0 0 12px', fontSize: '14px', color: t.textMuted, lineHeight: 1.6 }}>Organiza todos os eventos da atleta: torneios, treinos de golfe, ginásio, treinador, mental coach, fisioterapia, recuperação e outros.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
              {[
                { label: 'confirmed', color: '#6b7280' },
                { label: 'played', color: '#16a34a' },
                { label: 'in_progress', color: '#2563eb' },
                { label: 'cancelled', color: '#dc2626' },
              ].map(s => (
                <div key={s.label} style={{ background: s.color + '22', border: `1px solid ${s.color}55`, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, color: s.color }}>{s.label}</div>
              ))}
            </div>
            <div style={{ background: t.subtleBg, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: t.text }}>
              <strong>Regra:</strong> Apenas torneios com estado <strong>played</strong> aparecem em Competições & Stats.
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: t.text, marginBottom: '10px' }}>🏠 Overview</div>
            <p style={{ margin: '0 0 10px', fontSize: '14px', color: t.textMuted, lineHeight: 1.6 }}>Resume a situação atual da atleta, incluindo foco da semana, próximos eventos, indicadores principais e ligação rápida ao calendário.</p>
            <div style={{ background: t.subtleBg, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: t.text }}>
              Ao clicar num dia da semana, a aplicação abre o Calendar diretamente nesse dia. O Overview deve ser usado como ponto de partida diário.
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: t.text, marginBottom: '10px' }}>💪 Training Plan & Progress</div>
            <p style={{ margin: '0 0 10px', fontSize: '14px', color: t.textMuted, lineHeight: 1.6 }}>Liga planeamento, execução e evolução. Permite definir o que deve ser treinado, registar o que foi feito e avaliar energia, sono, cansaço, dores e stress.</p>
            <div style={{ background: t.successBg, border: '1px solid #52E8A0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: t.text }}>
              O objetivo não é preencher por preencher. O objetivo é perceber se o treino está a ajudar a competir melhor.
            </div>
          </div>

        </div>
      </div>

      {/* FAQ */}
      <div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: t.text, marginBottom: '14px' }}>Perguntas frequentes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQ.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} t={t} />)}
        </div>
      </div>

      <div style={{ height: '16px' }} />
    </div>
  )
}
