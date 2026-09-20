export default {
	// Controller view
	'controller-header': 'Controller',
	'controller-description':
		'Each button shows its label and GPIO pin. Press a button on your controller to light it up here.',
	'waiting-for-controller': 'Waiting for controller…',
	'loading-button-map': 'Loading button map…',
	// Layout selector
	'layout-leverless': 'Leverless',
	'layout-arcade': 'Arcade Stick',
	'layout-mirrored': 'Flip',
	// Input mode selector
	'input-mode-label': 'Input mode',
	'input-mode-saving': 'Saving…',
	'input-mode-saved': 'Saved — reboot to apply',
	'input-mode-save-failed': 'Save failed — try again',
	// Connection banner
	'conn-searching': 'Searching for your controller…',
	'conn-connected': 'Controller connected',
	'conn-connected-named': 'Controller connected: {{name}}',
	'conn-connected-full-prefix': 'Connected Controller :',
	'conn-connected-full-details-base': '{{label}} — GP2040-CE {{version}}',
	'conn-connected-full-details-build': 'build {{build}}',
	'conn-lost':
		"Can't reach the controller. Plug it in via USB and open http://192.168.7.1",
	// System stats
	'system-stats-header': 'System Stats',
	version: 'Version',
	'version-value': '{{label}} ({{file}}.uf2)',
	current: 'Current: {{version}}',
	latest: 'Latest: {{version}}',
	architecture: 'Architecture: {{value}}',
	'build-type': 'Build type: {{value}}',
	'memory-header': 'Memory (KB)',
	'memory-flash': 'Flash: {{used}} / {{total}} ({{pct}}%)',
	'memory-heap': 'Heap: {{used}} / {{total}} ({{pct}}%)',
	'memory-static': 'Static allocations: {{value}}',
	'memory-board': 'Board flash: {{value}}',
	none: '—',
	// Interface toggle (Navigation)
	'interface-badge': 'D_C_Theo Edition',
	'switch-to-original': 'Switch to the original interface',
	'switch-to-dc': 'Switch to the D_C_Theo interface',
	// Remap mode
	remap: 'Remap',
	'remap-exit': 'Done',
	'remap-save': 'Save',
	'remap-saving': 'Saving…',
	'remap-revert': 'Revert',
	'remap-pending': '{{count}} pending change(s)',
	'remap-none-pending': 'No changes',
	'remap-error': 'Save failed — try again',
	'remap-select-hint':
		'Select a function, then click the buttons to assign it.',
	// Profiles
	profiles: 'Profiles',
	'profile-rename': 'Profile name',
	'profile-add': 'Add profile',
	'profile-enabled': 'Enabled',
	'profile-copy-base': 'Copy from base',
	'profile-n': 'Profile {{n}}',
};
