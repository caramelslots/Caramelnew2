import { i18n, type Messages } from '@lingui/core';
import { compileMessage } from '@lingui/message-utils/compileMessage';
import { type Language } from './stateUrl.svelte';

export const stateI18n = $state({
	i18n
});

/** Catalogs are plain ICU strings (not lingui-compile output). Runtime compiler
 *  is required in production — Lingui only auto-enables it when NODE_ENV !==
 *  "production", otherwise `{percent}` / `{n}` stay literal in the UI. */
stateI18n.i18n.setMessagesCompiler(compileMessage);

export const stateI18nDerived = {
	init: (lang: Language, messages: Messages) => {
		stateI18n.i18n.load(lang, messages as Messages);
		stateI18n.i18n.activate(lang);
	},
	/**
	 * Look up by message id and interpolate ICU values.
	 * Do NOT wrap with `i18n.t()` first — that evaluates placeholders with empty
	 * values and returns a plain string that `_` can no longer interpolate.
	 */
	translate: (value: string, values?: Record<string, unknown>) =>
		stateI18n.i18n._(value, values),
};