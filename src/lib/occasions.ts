// Shared between WhatsAppPopup.tsx and WAInlineForm.tsx — both forms offer the
// same occasion dropdown, so the values and translated labels live here once.
export const OCCASION_VALUES = ['family_vacation', 'birthday', 'anniversary', 'friends', 'work_retreat', 'relaxation', 'wedding', 'other'] as const;

export const OCCASION_LABELS = {
  en: {
    family_vacation: 'Family vacation', birthday: 'Birthday', anniversary: 'Anniversary',
    friends: 'Trip with friends', work_retreat: 'Team / work retreat', relaxation: 'Just relaxing',
    wedding: 'Wedding', other: 'Other',
  },
  es: {
    family_vacation: 'Vacaciones familiares', birthday: 'Cumpleaños', anniversary: 'Aniversario',
    friends: 'Viaje con amigos', work_retreat: 'Retiro de trabajo / equipo', relaxation: 'Solo relajarnos',
    wedding: 'Boda', other: 'Otro',
  },
} as const;
