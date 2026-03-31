import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HolidaysPage from './components/holidays';
import UzoniaDataPage from './components/uzonia_data';
import UzoniaUploadsPage from './components/uploads';
import CalculationsPage from './components/calculations';
import RepoDataPage from './components/repos';


// import other pages when ready

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CalculationsPage />} />
        <Route path="/holidays" element={<HolidaysPage />} />
        <Route path="/data" element={<UzoniaDataPage />} />
        <Route path="/uploads" element={<UzoniaUploadsPage />} />
        <Route path="/repo" element={<RepoDataPage />} />
        {/* Add other pages as needed */}
      </Routes>
    </Router>
  );
};

export default App;