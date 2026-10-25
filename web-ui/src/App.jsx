import React, { useState } from 'react';
import { Dashboard } from './views/Dashboard';
import { SegmentList } from './views/SegmentList';
import { SubmitPreview } from './views/SubmitPreview';

function App() {
  const [activeView, setActiveView] = useState('list'); // list | dashboard | preview

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 mr-8">
                Smart Work Tracker
              </h1>
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveView('list')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    activeView === 'list'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Segments
                </button>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    activeView === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveView('preview')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    activeView === 'preview'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Submit Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeView === 'list' && <SegmentList />}
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'preview' && <SubmitPreview />}
      </main>
    </div>
  );
}

export default App;
