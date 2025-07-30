import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from '@/pages/Home';
import Chat from '@/pages/Chat';
import { Contacts } from '@/pages/Contacts';
import NotFound from '@/pages/NotFound';
import Gallery from '@/pages/Gallery';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/gallery/:batchId" element={<Gallery />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;