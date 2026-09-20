export default {
	// Controller view
	'controller-header': 'Manette',
	'controller-description':
		'Chaque bouton affiche son libellé et sa broche GPIO. Appuyez sur un bouton de votre manette pour l’allumer ici.',
	'waiting-for-controller': 'En attente de la manette…',
	'loading-button-map': 'Chargement de la disposition des boutons…',
	// Layout selector
	'layout-leverless': 'Leverless',
	'layout-arcade': 'Arcade Stick',
	'layout-mirrored': 'Miroir',
	// Input mode selector
	'input-mode-label': "Mode d'entrée",
	'input-mode-saving': 'Enregistrement…',
	'input-mode-saved': 'Enregistré – redémarrez pour appliquer',
	'input-mode-save-failed': 'Échec de l’enregistrement – réessayez',
	// Connection banner
	'conn-searching': 'Recherche de votre manette…',
	'conn-connected': 'Manette connectée',
	'conn-connected-named': 'Manette connectée : {{name}}',
	'conn-connected-full-prefix': 'Manette connectée :',
	'conn-connected-full-details-base': '{{label}} — GP2040-CE {{version}}',
	'conn-connected-full-details-build': 'build {{build}}',
	'conn-lost':
		'Impossible de joindre la manette. Branchez-la en USB et ouvrez http://192.168.7.1',
	// System stats
	'system-stats-header': 'Statistiques Système',
	version: 'Version',
	'version-value': '{{label}} ({{file}}.uf2)',
	current: 'Actuelle : {{version}}',
	latest: 'Dernière : {{version}}',
	architecture: 'Architecture : {{value}}',
	'build-type': 'Type de build : {{value}}',
	'memory-header': 'Mémoire (Ko)',
	'memory-flash': 'Flash : {{used}} / {{total}} ({{pct}}%)',
	'memory-heap': 'Heap : {{used}} / {{total}} ({{pct}}%)',
	'memory-static': 'Allocations statiques : {{value}}',
	'memory-board': 'Flash de la carte : {{value}}',
	none: '—',
	// Interface toggle (Navigation)
	'interface-badge': 'Édition D_C_Theo',
	'switch-to-original': "Passer à l'interface d'origine",
	'switch-to-dc': "Passer à l'interface D_C_Theo",
	// Remap mode
	remap: 'Réaffecter',
	'remap-exit': 'Terminé',
	'remap-save': 'Enregistrer',
	'remap-saving': 'Enregistrement…',
	'remap-revert': 'Annuler',
	'remap-pending': '{{count}} changement(s) en attente',
	'remap-none-pending': 'Aucun changement',
	'remap-error': "Échec de l'enregistrement — réessayez",
	'remap-select-hint':
		'Sélectionnez une fonction, puis cliquez sur les boutons pour l’assigner.',
	// Profiles
	profiles: 'Profils',
	'profile-rename': 'Nom du profil',
	'profile-add': 'Ajouter un profil',
	'profile-enabled': 'Activé',
	'profile-copy-base': 'Copier depuis la base',
	'profile-n': 'Profil {{n}}',
};
