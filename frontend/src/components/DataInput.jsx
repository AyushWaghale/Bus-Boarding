import React, { useState, useRef } from 'react';

// Custom SVG Icons
function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}

const MINIMAL_SAMPLE = `Booking_ID   Seats
101\tA1,B1
120\tA20,C2`;

const DETAILED_SAMPLE = `Booking_ID   Seats
101   A1,B1
102   C5,D5,A3
103   A12,B12
104   C18,D18
105   A15
106   B2,B3
107   C1,D1
108   A19,B19,C19
109   D10,C10
110   A20,B20
111   A8,B9
112   D2,C2
113   A16,D16
114   B7,C7
115   D14,A14`;

export default function DataInput({ onProcess, isLoading }) {
  const [rawData, setRawData] = useState(MINIMAL_SAMPLE);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // Handle file drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file) => {
    if (!file) return;
    
    // Check file type
    const fileType = file.name.split('.').pop().toLowerCase();
    if (fileType !== 'txt' && fileType !== 'csv' && fileType !== 'tsv') {
      setErrorMsg('Invalid file type. Please upload a .txt, .csv, or .tsv file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setRawData(text);
      setErrorMsg('');
    };
    reader.onerror = () => {
      setErrorMsg('Error reading file.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  // Submit action
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rawData.trim()) {
      setErrorMsg('Please enter or upload booking data first.');
      return;
    }
    setErrorMsg('');
    onProcess(rawData);
  };

  return (
    <div className="sidebar">
      {/* Input panel */}
      <div className="glass-card">
        <div className="card-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <span>Input Booking Data</span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* File Dropzone */}
          <div 
            className={`file-dropzone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept=".txt,.csv,.tsv"
            />
            <div className="dropzone-icon">
              <UploadIcon />
            </div>
            <p className="dropzone-text">Drag & drop your booking file here</p>
            <span className="dropzone-subtext">Supports .txt, .csv, .tsv (click to browse)</span>
          </div>

          {/* Text Area Input */}
          <div className="input-group">
            <span className="input-label">Or Paste / Edit Booking Text</span>
            <textarea 
              className="textarea-input"
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
              placeholder={`Booking_ID\tSeats\n101\tA1,B1\n120\tA20,C2`}
            />
          </div>

          {/* Quick Load Buttons */}
          <div className="input-group">
            <span className="input-label">Load Preset Samples</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
                onClick={() => { setRawData(MINIMAL_SAMPLE); setErrorMsg(''); }}
              >
                Minimal (2 Bookings)
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem' }}
                onClick={() => { setRawData(DETAILED_SAMPLE); setErrorMsg(''); }}
              >
                Bus Load (15 Bookings)
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="status-overlay error" style={{ padding: '0.5rem', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {errorMsg}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Generate Boarding Sequence'}
          </button>
        </form>
      </div>
    </div>
  );
}
