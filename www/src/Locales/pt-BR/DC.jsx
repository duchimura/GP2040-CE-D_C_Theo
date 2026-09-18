export default {
	// Controller view
	'controller-header': 'Controle',
	'controller-description':
		'Cada botão mostra seu rótulo e pino GPIO. Pressione um botão no seu controle para acendê-lo aqui.',
	'waiting-for-controller': 'Aguardando o controle…',
	'loading-button-map': 'Carregando o mapa de botões…',
	// Layout selector
	'layout-leverless': 'Leverless',
	'layout-arcade': 'Arcade Stick',
	'layout-mirrored': 'Espelhado',
	// General settings
	'general-settings-header': 'Configurações Gerais',
	'input-mode-label': 'Modo de entrada',
	'input-mode-help': 'O console/protocolo que o controle emula via USB.',
	save: 'Salvar',
	saved: 'Salvo',
	'save-failed': 'Falha ao salvar',
	'load-failed': 'Falha ao carregar',
	loading: 'Carregando…',
	// Connection banner
	'conn-searching': 'Procurando seu controle…',
	'conn-connected': 'Controle conectado',
	'conn-connected-named': 'Controle conectado: {{name}}',
	'conn-connected-full-prefix': 'Controle Conectado:',
	'conn-connected-full-details-base': '{{label}} — GP2040-CE {{version}}',
	'conn-connected-full-details-build': 'build {{build}}',
	'conn-lost':
		'Não foi possível acessar o controle. Conecte-o via USB e abra http://192.168.7.1',
	// System stats
	'system-stats-header': 'Estatísticas do Sistema',
	version: 'Versão',
	'version-value': '{{label}} ({{file}}.uf2)',
	current: 'Atual: {{version}}',
	latest: 'Mais recente: {{version}}',
	architecture: 'Arquitetura: {{value}}',
	'build-type': 'Tipo de build: {{value}}',
	'memory-header': 'Memória (KB)',
	'memory-flash': 'Flash: {{used}} / {{total}} ({{pct}}%)',
	'memory-heap': 'Heap: {{used}} / {{total}} ({{pct}}%)',
	'memory-static': 'Alocações estáticas: {{value}}',
	'memory-board': 'Flash da placa: {{value}}',
	none: '—',
	// Interface toggle (Navigation)
	'interface-badge': 'Edição D_C_Theo',
	'switch-to-original': 'Mudar para a interface original',
	'switch-to-dc': 'Mudar para a interface D_C_Theo',
	// Remap mode
	remap: 'Remapear',
	'remap-exit': 'Concluído',
	'remap-save': 'Salvar',
	'remap-saving': 'Salvando…',
	'remap-revert': 'Reverter',
	'remap-pending': '{{count}} alteração(ões) pendente(s)',
	'remap-none-pending': 'Nenhuma alteração',
	'remap-error': 'Falha ao salvar — tente novamente',
	'remap-select-hint':
		'Selecione uma função e clique nos botões para atribuí-la.',
	// Profiles
	profiles: 'Perfis',
	'profile-rename': 'Nome do perfil',
	'profile-add': 'Adicionar perfil',
	'profile-enabled': 'Habilitado',
	'profile-copy-base': 'Copiar da base',
	'profile-n': 'Perfil {{n}}',
};
