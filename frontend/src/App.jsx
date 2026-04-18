import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import AgentDetails from './pages/AgentDetails';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agent/:agentId" element={<AgentDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;