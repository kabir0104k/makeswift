import { Action, ActionTypes } from '../actions'

import { LocaleString, localeStringSchema } from '../../../types/locale'

export type State = {
  locales: LocaleString[]
  locale: LocaleString | null
  defaultLocale: LocaleString | null
}

export function getInitialState(initialState?: State): State {
  return {
    locales: initialState?.locales ?? [],
    locale: initialState?.locale ?? null,
    defaultLocale: initialState?.defaultLocale ?? null,
  }
}

export function reducer(state: State = getInitialState(), action: Action): State {
  switch (action.type) {
    case ActionTypes.SET_LOCALES: {
      const locales = action.payload.locales

      return { ...state, locales }
    }

    case ActionTypes.SET_LOCALE: {
      if (action.payload.locale === state.locale) return state

      return { ...state, locale: action.payload.locale }
    }

    case ActionTypes.SET_DEFAULT_LOCALE: {
      if (action.payload.defaultLocale === state.defaultLocale) return state

      return { ...state, defaultLocale: action.payload.defaultLocale }
    }

    default:
      return state
  }
}

export type LocalesInput = {
  locales: LocaleString[]
  defaultLocale: LocaleString
}

export function parseLocalesInput(input: LocalesInput): State {
  if (input.locales == null) {
    throw new Error(`Locales cannot be null or undefined. Please provide the locales array.`)
  }

  if (input.locales.includes(input.defaultLocale) === false) {
    throw new Error(
      `Default locale "${input.defaultLocale}" is not included in locales: ${input.locales}. Please add the default locale to the locales array.`,
    )
  }

  return {
    locales: input.locales.map(locale => localeStringSchema.parse(locale)),
    defaultLocale: localeStringSchema.parse(input.defaultLocale),
    locale: null,
  }
}
