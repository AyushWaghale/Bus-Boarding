import React from 'react';

/**
 * BusLayout Component
 * Renders the 2D visual representation of the bus, showing seats, aisle,
 * and current passenger locations/states during simulation.
 * 
 * Columns: A, B (Left), Aisle (Center), C, D (Right)
 * Rows: 1 to 20 (Row 1 at the bottom/front, Row 20 at the top/back)
 * Entry is at Row 0, Aisle.
 */
export default function BusLayout({ 
  bookedSeats = [], 
  seatedSeats = [], 
  passengers = [], 
  numRows = 20 
}) {
  const columns = ['A', 'B', 'Aisle', 'C', 'D'];
  
  // Build a map of seated seats for quick lookup
  const seatedSet = new Set(seatedSeats);
  const bookedSet = new Set(bookedSeats);

  // Map of passenger position: row -> passenger object
  const aislePassengers = {};
  passengers.forEach(p => {
    if (p.state !== 'seated' && p.currentRow > 0 && p.currentRow <= numRows) {
      aislePassengers[p.currentRow] = p;
    }
  });

  // Generate rows from 20 down to 1 (rear of the bus is at the top of the UI)
  const rowNumbers = Array.from({ length: numRows }, (_, i) => numRows - i);

  // Helper to check if a passenger is stowing luggage or blocking at a row
  const getAisleCellClass = (row) => {
    const p = aislePassengers[row];
    if (!p) return '';
    if (p.state === 'stowing') return 'glow-block';
    if (p.state === 'conflict') return 'glow-block';
    return '';
  };

  return (
    <div className="bus-visualizer">
      <div className="bus-shell">
        <div className="bus-windshield"></div>
        
        <div className="bus-grid">
          {rowNumbers.map((row) => (
            <div key={row} className="bus-row">
              {/* Seat A (Window Left) */}
              <div className="bus-cell">
                <Seat 
                  label={`A${row}`} 
                  isBooked={bookedSet.has(`A${row}`)} 
                  isSeated={seatedSet.has(`A${row}`)} 
                  colorIndex={bookedSet.has(`A${row}`) ? 0 : -1}
                />
              </div>

              {/* Seat B (Aisle Left) */}
              <div className="bus-cell">
                <Seat 
                  label={`B${row}`} 
                  isBooked={bookedSet.has(`B${row}`)} 
                  isSeated={seatedSet.has(`B${row}`)} 
                  colorIndex={bookedSet.has(`B${row}`) ? 1 : -1}
                />
              </div>

              {/* Aisle (Center) */}
              <div className={`bus-cell aisle-cell ${getAisleCellClass(row)}`}>
                {aislePassengers[row] && (
                  <PassengerDot passenger={aislePassengers[row]} />
                )}
                {!aislePassengers[row] && (
                  <span className="bus-row-label">{row}</span>
                )}
              </div>

              {/* Seat C (Aisle Right) */}
              <div className="bus-cell">
                <Seat 
                  label={`C${row}`} 
                  isBooked={bookedSet.has(`C${row}`)} 
                  isSeated={seatedSet.has(`C${row}`)} 
                  colorIndex={bookedSet.has(`C${row}`) ? 2 : -1}
                />
              </div>

              {/* Seat D (Window Right) */}
              <div className="bus-cell">
                <Seat 
                  label={`D${row}`} 
                  isBooked={bookedSet.has(`D${row}`)} 
                  isSeated={seatedSet.has(`D${row}`)} 
                  colorIndex={bookedSet.has(`D${row}`) ? 3 : -1}
                />
              </div>
            </div>
          ))}

          {/* Front Entry Area */}
          <div className="bus-row" style={{ marginTop: '10px' }}>
            <div className="bus-cell"></div>
            <div className="bus-cell"></div>
            <div className="bus-cell entry-marker">
              Entry
            </div>
            <div className="bus-cell"></div>
            <div className="bus-cell"></div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="legend-container">
        <div className="legend-item">
          <div className="legend-color unbooked"></div>
          <span>Empty</span>
        </div>
        <div className="legend-item">
          <div className="legend-color booked"></div>
          <span>Booked</span>
        </div>
        <div className="legend-item">
          <div className="legend-color seated"></div>
          <span>Seated</span>
        </div>
        <div className="legend-item">
          <div className="legend-color active-dot"></div>
          <span>Walking</span>
        </div>
        <div className="legend-item">
          <div className="legend-color stow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#18181b' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" ry="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          </div>
          <span>Stowing</span>
        </div>
        <div className="legend-item">
          <div className="legend-color conflict" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <span>Seat Conflict</span>
        </div>
      </div>
    </div>
  );
}

function Seat({ label, isBooked, isSeated, colorIndex }) {
  let seatClass = 'seat';
  if (isSeated) {
    seatClass += ' seated';
    // Alternate colors to make bookings stand out visually
    if (colorIndex % 2 === 1) {
      seatClass += ' secondary-color';
    }
  } else if (isBooked) {
    seatClass += ' booked';
  }

  return (
    <div className={seatClass} title={label}>
      {label}
    </div>
  );
}

function PassengerDot({ passenger }) {
  let dotClass = 'passenger-dot active-sim';
  
  if (passenger.state === 'stowing') {
    dotClass += ' stowing';
    return (
      <div className={dotClass} title={`Passenger stowing luggage for ${passenger.targetSeat.column}${passenger.targetSeat.row}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><rect x="3" y="7" width="18" height="13" rx="2" ry="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
      </div>
    );
  }
  
  if (passenger.state === 'conflict') {
    dotClass += ' conflict';
    return (
      <div className={dotClass} title={`Seat conflict for passenger going to ${passenger.targetSeat.column}${passenger.targetSeat.row}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
    );
  }

  return (
    <div 
      className={dotClass} 
      title={`Passenger heading to ${passenger.targetSeat.column}${passenger.targetSeat.row}`}
    >
      {passenger.targetSeat.row}
    </div>
  );
}
