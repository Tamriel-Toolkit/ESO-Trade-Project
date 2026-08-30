import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Marketplace from './pages/Marketplace.jsx';
import CharacterManager from './pages/CharacterManager.jsx';
import BuildExplorer from './pages/BuildExplorer.jsx';
import TraitTracker from './pages/TraitTracker.jsx';
import NotFound from './pages/NotFound.jsx';
import './App.css';

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/builds" element={<BuildExplorer />} />
            <Route path="/traits" element={<TraitTracker />} />
            <Route path="/characters" element={<CharacterManager />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
