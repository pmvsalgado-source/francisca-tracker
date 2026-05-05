import { DAY_TYPES, LOAD_LEVELS } from './periodization/day.js'

function loadLabelFor(loadLevel) {
  return {
    [LOAD_LEVELS.HIGH]: 'Alta',
    [LOAD_LEVELS.MEDIUM]: 'Média',
    [LOAD_LEVELS.LOW]: 'Baixa',
    [LOAD_LEVELS.RECOVERY]: 'Recuperação',
    [LOAD_LEVELS.REST]: 'Descanso',
  }[loadLevel] || (loadLevel || '-')
}

export function getPublicGolfState(day) {
  if (day?.dayType === DAY_TYPES.COMPETITION) {
    return {
      label: 'Competição',
      loadLabel: 'Competição',
      colorKey: 'COMPETITION',
      category: 'competition',
      isCompetition: true,
      isTrainingLoad: false,
    }
  }

  if (day?.dayType === DAY_TYPES.REST) {
    return {
      label: 'Descanso',
      loadLabel: 'Descanso',
      colorKey: 'REST',
      category: 'rest',
      isCompetition: false,
      isTrainingLoad: false,
    }
  }

  if ([
    DAY_TYPES.RECOVERY,
    DAY_TYPES.POST_COMP_RECOVERY,
    DAY_TYPES.LOW_LOAD,
  ].includes(day?.dayType)) {
    return {
      label: 'Recuperação',
      loadLabel: 'Recuperação',
      colorKey: 'RECOVERY',
      category: 'recovery',
      isCompetition: false,
      isTrainingLoad: false,
    }
  }

  if (day?.dayType === DAY_TYPES.ASSESSMENT) {
    return {
      label: 'Avaliação',
      loadLabel: day?.loadLevel ? loadLabelFor(day.loadLevel) : 'Avaliação',
      colorKey: 'ASSESSMENT',
      category: 'assessment',
      isCompetition: false,
      isTrainingLoad: false,
    }
  }

  const loadLabel = loadLabelFor(day?.loadLevel)
  return {
    label: loadLabel,
    loadLabel,
    colorKey: day?.loadLevel || 'MEDIUM',
    category: 'training',
    isCompetition: false,
    isTrainingLoad: [LOAD_LEVELS.LOW, LOAD_LEVELS.MEDIUM, LOAD_LEVELS.HIGH].includes(day?.loadLevel),
  }
}
