import { readFileSync, writeFileSync } from 'node:fs';

function parseKeyValues(line) {
	const attrs = {};
	const regex = /(\w+)=(?:"([^"]*)"|(\S+))/g;
	let match;
	while ((match = regex.exec(line)) !== null) {
		attrs[match[1]] = match[2] ?? match[3];
	}
	return attrs;
}

function formatAttrs(attrs) {
	return Object.entries(attrs)
		.map(([key, value]) => `${key}="${value}"`)
		.join(' ');
}

function fntToXml(fntPath, xmlPath, faceName, pageFileName) {
	const lines = readFileSync(fntPath, 'utf8').split('\n');
	const parts = [];
	let section = null;
	let chars = [];
	let kernings = [];

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) continue;

		if (line.startsWith('info ')) {
			const attrs = parseKeyValues(line.slice(5));
			attrs.face = faceName;
			parts.push(`  <info ${formatAttrs(attrs)}/>`);
		} else if (line.startsWith('common ')) {
			parts.push(`  <common ${formatAttrs(parseKeyValues(line.slice(7)))}/>`);
		} else if (line.startsWith('page ')) {
			if (!section) {
				parts.push('  <pages>');
				section = 'pages';
			}
			const attrs = parseKeyValues(line.slice(5));
			if (pageFileName) attrs.file = pageFileName;
			parts.push(`    <page ${formatAttrs(attrs)}/>`);
		} else if (line.startsWith('chars ')) {
			if (section === 'pages') {
				parts.push('  </pages>');
				section = 'chars';
			}
			parts.push('  <chars>');
		} else if (line.startsWith('char ')) {
			chars.push(`    <char ${formatAttrs(parseKeyValues(line.slice(5)))}/>`);
		} else if (line.startsWith('kernings ')) {
			if (section === 'chars') {
				parts.push(...chars);
				parts.push('  </chars>');
				section = 'kernings';
			}
			parts.push('  <kernings>');
		} else if (line.startsWith('kerning ')) {
			kernings.push(`    <kerning ${formatAttrs(parseKeyValues(line.slice(8)))}/>`);
		}
	}

	if (section === 'pages') parts.push('  </pages>');
	if (chars.length) {
		parts.push('  <chars>');
		parts.push(...chars);
		parts.push('  </chars>');
	}
	if (kernings.length) {
		parts.push('  <kernings>');
		parts.push(...kernings);
		parts.push('  </kernings>');
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<font>\n${parts.join('\n')}\n</font>\n`;
	writeFileSync(xmlPath, xml);
}

const root = new URL('..', import.meta.url).pathname;
fntToXml(
	`${root}/../../../../designer_assets/krutoi.fnt`,
	`${root}/static/assets/fonts/krutoiFont/krutoi.xml`,
	'krutoi',
);
fntToXml(
	`${root}/../../../../designer_assets/prostoi.fnt`,
	`${root}/static/assets/fonts/prostoiFont/prostoi.xml`,
	'prostoi',
);
fntToXml(
	`${root}/../../../../designer_assets/prostoi white.fnt`,
	`${root}/static/assets/fonts/prostoiWhiteFont/prostoiWhite.xml`,
	'prostoiWhite',
	'prostoiWhite.png',
);
console.log('Converted krutoi.fnt, prostoi.fnt and prostoi white.fnt to XML');
