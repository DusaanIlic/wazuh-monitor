import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import AgentDetails from './pages/AgentDetails';
import RulesPage from './pages/RulesPage';
import { startKolokvijum, stopKolokvijum } from './services/api';

function App() {
  const [kolokvijumAktivan, setKolokvijumAktivan] = useState(
    () => localStorage.getItem('kolokvijumAktivan') === 'true'
  );
  const [kolokvijumPocetak, setKolokvijumPocetak] = useState(
    () => localStorage.getItem('kolokvijumPocetak') || null
  );

  const handleStart = async () => {
    try {
      const res = await startKolokvijum();
      const pocetak = res.pocetak;
      localStorage.setItem('kolokvijumAktivan', 'true');
      localStorage.setItem('kolokvijumPocetak', pocetak);
      setKolokvijumAktivan(true);
      setKolokvijumPocetak(pocetak);
    } catch {
      // backend nedostupan — postavljamo lokalno
      const pocetak = new Date().toISOString();
      localStorage.setItem('kolokvijumAktivan', 'true');
      localStorage.setItem('kolokvijumPocetak', pocetak);
      setKolokvijumAktivan(true);
      setKolokvijumPocetak(pocetak);
    }
  };

  const handleStop = async () => {
    try {
      await stopKolokvijum();
    } catch {
      // ignorišemo grešku
    }
    localStorage.setItem('kolokvijumAktivan', 'false');
    localStorage.removeItem('kolokvijumPocetak');
    setKolokvijumAktivan(false);
    setKolokvijumPocetak(null);
  };

  return (
    <BrowserRouter>
      <Navbar kolokvijumAktivan={kolokvijumAktivan} kolokvijumPocetak={kolokvijumPocetak} />
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              kolokvijumAktivan={kolokvijumAktivan}
              onStartKolokvijum={handleStart}
              onStopKolokvijum={handleStop}
            />
          }
        />
        <Route path="/agent/:agentId" element={<AgentDetails />} />
        <Route path="/rules" element={<RulesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
