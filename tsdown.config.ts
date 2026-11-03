import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['src/**/index.ts'],
	format: ['esm'],
	dts: true,
	clean: true,
	outDir: 'dist',
	fixedExtension: false,
	// The peer dependencies, subpaths included (@ghia/solid/jsx-runtime).
	deps: { neverBundle: [/^@ghia\/solid(\/|$)/, /^solid-js(\/|$)/] },
});
