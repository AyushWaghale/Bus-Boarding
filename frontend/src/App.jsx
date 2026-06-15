import React, { useState, useEffect } from 'react';
import DataInput from './components/DataInput';
import Simulator from './components/Simulator';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Simple Icons
function BusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <path d="M8 21h8"/>
      <path d="M3 8h18"/>
      <circle cx="6.5" cy="16.5" r="1.5"/>
      <circle cx="17.5" cy="16.5" r="1.5"/>
    </svg>
  );
}

function TicketsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22"/>
      <line x1="17" y1="5" x2="9" y2="5"/>
      <line x1="15" y1="10" x2="9" y2="10"/>
      <line x1="17" y1="15" x2="9" y2="15"/>
      <line x1="15" y1="20" x2="9" y2="20"/>
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

export default function App() {
  const [sequence, setSequence] = useState([]);
  const [originalParsed, setOriginalParsed] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-process default input on mount so the app isn't blank
  useEffect(() => {
    const defaultData = `Booking_ID   Seats
101\tA1,B1
120\tA20,C2`;
    processBookingData(defaultData);
  }, []);

  const processBookingData = async (rawDataText) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/sequence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rawData: rawDataText })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to process boarding sequence');
      }

      setSequence(data.sequence || []);
      setOriginalParsed(data.originalParsed || []);
    } catch (err) {
      console.error('API Error:', err);
      setError(err.message || 'Connection error. Make sure the backend server is running on port 5000.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper calculations for metrics
  const totalBookings = originalParsed.length;
  const totalSeats = originalParsed.reduce((sum, b) => sum + b.seats.length, 0);
  const maxRowIndex = originalParsed.reduce((max, b) => Math.max(max, b.maxRow), 0);

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-icon">
            <BusIcon />
          </div>
          <div className="logo-text">
            <h1>Bus Boarding Sequence Generator</h1>
            <p>Booking-Wise Boarding Sequence Optimizer</p>
          </div>
        </div>
        <div>
          <span className="badge-dev">Back-To-Front algorithm</span>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="app-dashboard">
        
        {/* Left column: Sidebar input and boarding sequence output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <DataInput onProcess={processBookingData} isLoading={isLoading} />
          
          {error && (
            <div className="glass-card status-overlay error">
              <ErrorIcon />
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Backend Connection Error</strong>
                <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>{error}</span>
              </div>
            </div>
          )}

          {sequence.length > 0 && (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                <span>Boarding Sequence Output</span>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Sorted by farthest row in booking (descending), with earlier Booking IDs taking tie-breaker priority.
              </p>

              <div className="results-table-container tall">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Seq</th>
                      <th>Booking ID</th>
                      <th>Seats</th>
                      <th>Max Row</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sequence.map((item) => (
                      <tr key={item.seq}>
                        <td style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>{item.seq}</td>
                        <td style={{ fontWeight: 'bold' }}>{item.bookingId}</td>
                        <td>
                          <span style={{ 
                            background: 'rgba(15, 23, 42, 0.05)', 
                            color: 'var(--text-primary)',
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '0.75rem'
                          }}>
                            {item.seats.join(', ')}
                          </span>
                        </td>
                        <td>{item.maxRow}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Simulator and Dashboard Cards */}
        <div className="main-display">
          
          {sequence.length > 0 && (
            <Simulator bookings={originalParsed} optimizedSequence={sequence} />
          )}

        </div>
      </main>
    </>
  );
}
