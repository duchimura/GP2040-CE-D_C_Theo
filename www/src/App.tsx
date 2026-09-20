import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import { AppContextProvider } from './Contexts/AppContext';

import Navigation from './Components/Navigation';
import ConnectionBanner from './Components/dc/ConnectionBanner';
import { useConnectionMonitor } from './Hooks/dc/useConnectionMonitor';
import { useDcMode } from './Store/useDcMode';
import { dcElement } from './Data/dc/routeSubstitutions';
import ControllerViewPage from './Pages/dc/ControllerViewPage';

import HomePage from './Pages/HomePage';
import PinMappingPage from './Pages/PinMapping';
import PeripheralMappingPage from './Pages/PeripheralMappingPage';
import ResetSettingsPage from './Pages/ResetSettingsPage';
import SettingsPage from './Pages/SettingsPage';
import DisplayConfigPage from './Pages/DisplayConfig';
import AddonsConfigPage from './Pages/AddonsConfigPage';
import BackupPage from './Pages/BackupPage';
import PlaygroundPage from './Pages/PlaygroundPage';
import InputMacroAddonPage from './Pages/InputMacroAddonPage';
import LedConfigPage from './Pages/LedConfigPage';

import './App.scss';
import BootModeMappingPage from './Pages/BootModeMapping';

const App = () => {
	useConnectionMonitor();
	const dcMode = useDcMode((s) => s.enabled);
	return (
		<AppContextProvider>
			<Router>
				<Navigation />
				<div className="body-content container-lg">
					{dcMode && <ConnectionBanner />}
					<Routes>
						<Route path="/" element={dcElement('/', dcMode, <HomePage />)} />
						<Route path="/settings" element={<SettingsPage />} />
						<Route path="/dc/controller" element={<ControllerViewPage />} />
						<Route
							path="/pin-mapping"
							element={dcElement('/pin-mapping', dcMode, <PinMappingPage />)}
						/>
						<Route
							path="/boot-mode-mapping"
							element={<BootModeMappingPage />}
						/>
						<Route
							path="/peripheral-mapping"
							element={<PeripheralMappingPage />}
						/>
						<Route path="/reset-settings" element={<ResetSettingsPage />} />
						<Route path="/led-config" element={<LedConfigPage />} />
						<Route path="/display-config" element={<DisplayConfigPage />} />
						<Route path="/add-ons" element={<AddonsConfigPage />} />
						<Route path="/backup" element={<BackupPage />} />
						<Route path="/playground" element={<PlaygroundPage />} />
						<Route path="/macro" element={<InputMacroAddonPage />} />
					</Routes>
				</div>
			</Router>
		</AppContextProvider>
	);
};

export default App;
