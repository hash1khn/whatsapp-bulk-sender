import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from '@/pages/Home';
import Chat from '@/pages/Chat';
import NotFound from '@/pages/NotFound';
import Gallery from '@/pages/Gallery';
import SendProgressDemo from '@/pages/SendProgressDemo';
import TemplateEditor from '@/pages/TemplateEditor';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/gallery/:batchId" element={<Gallery />} />
        <Route path="/send-progress-demo" element={<SendProgressDemo />} />
        <Route path="/template" element={<TemplateEditor />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;