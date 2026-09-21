import type { BookEvent } from './typesBookEvent';

export type DevMathMode = 'BASE' | 'bonus_normal' | 'bonus_super' | 'bonus_duel';

export type DevMathCell = { name: string; wild?: boolean; multiplier?: number };

export type DevMathEvalRequest = {
	board: DevMathCell[][];
	mode?: DevMathMode;
	sticky?: { reel: number; mult: number }[];
	expand?: { reel: number; row: number; mult: number }[];
};

export type DevMathEvalResult = {
	events: BookEvent[];
	payoutMultiplier: number;
	lines: {
		phase1: number[];
		phase2: number[];
	};
};

const MATH_EVAL_URL = '/__math/eval-board';

export const evalDevMathBoard = async (
	payload: DevMathEvalRequest,
): Promise<DevMathEvalResult> => {
	const res = await fetch(MATH_EVAL_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			board: payload.board,
			mode: payload.mode ?? 'BASE',
			sticky: payload.sticky ?? [],
			expand: payload.expand ?? [],
		}),
	});
	const text = await res.text();
	let data: { error?: string } & Partial<DevMathEvalResult>;
	try {
		data = JSON.parse(text) as { error?: string } & Partial<DevMathEvalResult>;
	} catch {
		throw new Error(
			`Math eval returned non-JSON (${res.status}). Is /tmp/csmath_venv available? ${text.slice(0, 240)}`,
		);
	}
	if (!res.ok || data.error || !Array.isArray(data.events)) {
		throw new Error(data.error || `Math eval failed (${res.status})`);
	}
	return {
		events: data.events,
		payoutMultiplier: Number(data.payoutMultiplier ?? 0),
		lines: {
			phase1: data.lines?.phase1 ?? [],
			phase2: data.lines?.phase2 ?? [],
		},
	};
};
