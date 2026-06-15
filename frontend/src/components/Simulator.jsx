import React, { useState, useEffect, useRef } from 'react';
import BusLayout from './BusLayout';

// Custom SVG Icons
function PlayIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>;
}

function PauseIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>;
}

function RotateCcwIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/></svg>;
}

function PlayCircleIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>;
}

/**
 * Simulator Component
 * Manages simulation parameters, running background simulations,
 * showing comparisons, and animating the selected boarding strategy.
 */
export default function Simulator({ bookings = [], optimizedSequence = [] }) {
  // Configurable Parameters
  const [stowingDelay, setStowingDelay] = useState(4);
  const [conflictDelay, setConflictDelay] = useState(3);
  const [spawnSpacing, setSpawnSpacing] = useState(2);
  const [speedMs, setSpeedMs] = useState(300); // Ms per simulation tick

  // Simulation State
  const [strategy, setStrategy] = useState('back-to-front'); // 'back-to-front' | 'front-to-back' | 'random'
  const [simState, setSimState] = useState('idle'); // 'idle' | 'running' | 'paused' | 'finished'
  const [tick, setTick] = useState(0);
  const [passengers, setPassengers] = useState([]);
  const [seatedSeats, setSeatedSeats] = useState([]);
  const [queue, setQueue] = useState([]);
  const [spawnCooldown, setSpawnCooldown] = useState(0);
  
  // Real-time metrics
  const [stats, setStats] = useState({
    aisleBlocks: 0,
    seatConflicts: 0
  });

  // Background Comparison Results
  const [comparison, setComparison] = useState(null);

  const timerRef = useRef(null);

  // Re-run the background comparisons whenever parameters or bookings change
  useEffect(() => {
    if (bookings.length > 0) {
      runBackgroundComparisons();
      resetSimulation();
    }
  }, [bookings, stowingDelay, conflictDelay, spawnSpacing]);

  // Handle active timer
  useEffect(() => {
    if (simState === 'running') {
      timerRef.current = setInterval(() => {
        handleTick();
      }, speedMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [simState, speedMs, passengers, queue, seatedSeats, spawnCooldown, tick, stats]);

  // Helper to generate queue based on strategy
  const getQueueForStrategy = (strat) => {
    let sortedBookings = [...bookings];

    if (strat === 'back-to-front') {
      // Farthest maxRow first. Tie-breaker bookingId. (Optimized)
      sortedBookings.sort((a, b) => {
        if (b.maxRow !== a.maxRow) return b.maxRow - a.maxRow;
        return String(a.bookingId).localeCompare(String(b.bookingId), undefined, { numeric: true });
      });
    } else if (strat === 'front-to-back') {
      // Closest maxRow first. Tie-breaker bookingId. (Worst-case)
      sortedBookings.sort((a, b) => {
        if (a.maxRow !== b.maxRow) return a.maxRow - b.maxRow;
        return String(a.bookingId).localeCompare(String(b.bookingId), undefined, { numeric: true });
      });
    } else {
      // Random / Original Booking Order
      // Maintain input ordering
    }

    // Flatten bookings into individual passengers
    const passengerQueue = [];
    sortedBookings.forEach((b, bIdx) => {
      b.seats.forEach((seat, sIdx) => {
        passengerQueue.push({
          id: `${b.bookingId}-${seat.column}${seat.row}`,
          bookingId: b.bookingId,
          targetSeat: seat,
          currentRow: 0, // 0 means waiting in lobby/entryway
          state: 'walking', // 'walking' | 'stowing' | 'conflict' | 'seated'
          delayRemaining: 0,
          colorIndex: bIdx // Used to color seat groupings in BusLayout
        });
      });
    });

    return passengerQueue;
  };

  // Run a complete simulation silently in the background
  const runSilentSimulation = (strat) => {
    let currentQueue = getQueueForStrategy(strat);
    let activePassengers = [];
    let activeSeated = [];
    let currentTick = 0;
    let spawnCooldownTimer = 0;
    
    let aisleBlocks = 0;
    let seatConflicts = 0;

    // Run until all passengers are seated
    while (currentQueue.length > 0 || activePassengers.some(p => p.state !== 'seated')) {
      currentTick++;

      // Process movements (rear of bus first)
      activePassengers.sort((a, b) => b.currentRow - a.currentRow);
      
      activePassengers = activePassengers.map(p => {
        if (p.state === 'seated') return p;

        if (p.state === 'stowing') {
          const delay = p.delayRemaining - 1;
          if (delay > 0) {
            return { ...p, delayRemaining: delay };
          } else {
            // Check seat conflict
            const targetCol = p.targetSeat.column;
            const row = p.targetSeat.row;
            let hasConflict = false;
            
            if (targetCol === 'A' && activeSeated.includes(`B${row}`)) {
              hasConflict = true;
            } else if (targetCol === 'D' && activeSeated.includes(`C${row}`)) {
              hasConflict = true;
            }

            if (hasConflict) {
              seatConflicts++;
              return {
                ...p,
                state: 'conflict',
                delayRemaining: conflictDelay
              };
            } else {
              activeSeated.push(`${p.targetSeat.column}${p.targetSeat.row}`);
              return { ...p, state: 'seated', currentRow: -1 };
            }
          }
        }

        if (p.state === 'conflict') {
          const delay = p.delayRemaining - 1;
          if (delay > 0) {
            return { ...p, delayRemaining: delay };
          } else {
            activeSeated.push(`${p.targetSeat.column}${p.targetSeat.row}`);
            return { ...p, state: 'seated', currentRow: -1 };
          }
        }

        if (p.state === 'walking') {
          const nextRow = p.currentRow + 1;
          
          // Check if nextRow is occupied
          const isOccupied = activePassengers.some(other => 
            other.id !== p.id && 
            other.state !== 'seated' && 
            other.currentRow === nextRow
          );

          if (isOccupied) {
            aisleBlocks++;
            return p; // blocked
          } else {
            if (nextRow >= p.targetSeat.row) {
              return {
                ...p,
                currentRow: p.targetSeat.row,
                state: 'stowing',
                delayRemaining: stowingDelay
              };
            } else {
              return { ...p, currentRow: nextRow };
            }
          }
        }
        return p;
      });

      // Spawn new passenger
      const isEntryOccupied = activePassengers.some(p => p.state !== 'seated' && p.currentRow === 1);
      
      if (spawnCooldownTimer > 0) {
        spawnCooldownTimer--;
      }

      if (spawnCooldownTimer <= 0 && currentQueue.length > 0 && !isEntryOccupied) {
        const nextPassenger = currentQueue.shift();
        const startState = nextPassenger.targetSeat.row === 1 ? 'stowing' : 'walking';
        const startDelay = nextPassenger.targetSeat.row === 1 ? stowingDelay : 0;
        activePassengers.push({
          ...nextPassenger,
          currentRow: 1,
          state: startState,
          delayRemaining: startDelay
        });
        spawnCooldownTimer = spawnSpacing;
      }
    }

    return {
      ticks: currentTick,
      aisleBlocks,
      seatConflicts
    };
  };

  // Run comparisons for all 3 strategies
  const runBackgroundComparisons = () => {
    const b2f = runSilentSimulation('back-to-front');
    const f2b = runSilentSimulation('front-to-back');
    const rnd = runSilentSimulation('random');
    
    setComparison({
      'back-to-front': b2f,
      'front-to-back': f2b,
      'random': rnd
    });
  };

  // Reset simulation to start
  const resetSimulation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    setSimState('idle');
    setTick(0);
    setSeatedSeats([]);
    setStats({ aisleBlocks: 0, seatConflicts: 0 });
    setSpawnCooldown(0);
    
    const initialQueue = getQueueForStrategy(strategy);
    setQueue(initialQueue);
    setPassengers([]);
  };

  // Change active strategy
  const handleStrategyChange = (newStrat) => {
    setStrategy(newStrat);
    resetSimulation();
  };

  // Perform one step/tick of simulation
  const handleTick = () => {
    let nextTick = tick + 1;
    let nextQueue = [...queue];
    let nextPassengers = passengers.map(p => ({ ...p }));
    let nextSeatedSeats = [...seatedSeats];
    let nextAisleBlocks = stats.aisleBlocks;
    let nextSeatConflicts = stats.seatConflicts;
    let nextSpawnCooldown = spawnCooldown;

    // Check if simulation is finished
    const activePassengersInAisle = nextPassengers.some(p => p.state !== 'seated');
    if (nextQueue.length === 0 && !activePassengersInAisle) {
      setSimState('finished');
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // 1. Update existing passengers (from front of bus / highest row down to entry / lowest row)
    nextPassengers.sort((a, b) => b.currentRow - a.currentRow);

    nextPassengers = nextPassengers.map(p => {
      if (p.state === 'seated') return p;

      if (p.state === 'stowing') {
        const delay = p.delayRemaining - 1;
        if (delay > 0) {
          return { ...p, delayRemaining: delay };
        } else {
          // Check for seat conflict
          const targetCol = p.targetSeat.column;
          const row = p.targetSeat.row;
          let hasConflict = false;
          
          if (targetCol === 'A' && nextSeatedSeats.includes(`B${row}`)) {
            hasConflict = true;
          } else if (targetCol === 'D' && nextSeatedSeats.includes(`C${row}`)) {
            hasConflict = true;
          }

          if (hasConflict) {
            nextSeatConflicts++;
            return {
              ...p,
              state: 'conflict',
              delayRemaining: conflictDelay
            };
          } else {
            nextSeatedSeats.push(`${p.targetSeat.column}${p.targetSeat.row}`);
            return { ...p, state: 'seated', currentRow: -1 };
          }
        }
      }

      if (p.state === 'conflict') {
        const delay = p.delayRemaining - 1;
        if (delay > 0) {
          return { ...p, delayRemaining: delay };
        } else {
          nextSeatedSeats.push(`${p.targetSeat.column}${p.targetSeat.row}`);
          return { ...p, state: 'seated', currentRow: -1 };
        }
      }

      if (p.state === 'walking') {
        const nextRow = p.currentRow + 1;
        
        // Check if next row in aisle is occupied
        const isOccupied = nextPassengers.some(other => 
          other.id !== p.id && 
          other.state !== 'seated' && 
          other.currentRow === nextRow
        );

        if (isOccupied) {
          nextAisleBlocks++;
          return p; // Blocked, stay where you are
        } else {
          if (nextRow >= p.targetSeat.row) {
            // Reached row, start stowing luggage
            return {
              ...p,
              currentRow: p.targetSeat.row,
              state: 'stowing',
              delayRemaining: stowingDelay
            };
          } else {
            return { ...p, currentRow: nextRow };
          }
        }
      }

      return p;
    });

    // 2. Spawn next passenger from queue
    const isEntryOccupied = nextPassengers.some(p => p.state !== 'seated' && p.currentRow === 1);
    
    if (nextSpawnCooldown > 0) {
      nextSpawnCooldown--;
    }

    if (nextSpawnCooldown <= 0 && nextQueue.length > 0 && !isEntryOccupied) {
      const nextPassenger = nextQueue.shift();
      const startState = nextPassenger.targetSeat.row === 1 ? 'stowing' : 'walking';
      const startDelay = nextPassenger.targetSeat.row === 1 ? stowingDelay : 0;
      nextPassengers.push({
        ...nextPassenger,
        currentRow: 1,
        state: startState,
        delayRemaining: startDelay
      });
      nextSpawnCooldown = spawnSpacing;
    }

    setTick(nextTick);
    setQueue(nextQueue);
    setPassengers(nextPassengers);
    setSeatedSeats(nextSeatedSeats);
    setSpawnCooldown(nextSpawnCooldown);
    setStats({
      aisleBlocks: nextAisleBlocks,
      seatConflicts: nextSeatConflicts
    });
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (simState === 'running') {
      setSimState('paused');
    } else {
      setSimState('running');
    }
  };

  // Handle Strategy Display Name
  const getStrategyName = (id) => {
    switch (id) {
      case 'back-to-front': return 'Back-to-Front (Optimized)';
      case 'front-to-back': return 'Front-to-Back (Worst Case)';
      case 'random': return 'Random / Input Order';
      default: return id;
    }
  };

  // Calculate efficiency percentages relative to back-to-front
  const calculateEfficiency = (stratTicks) => {
    if (!comparison) return null;
    const b2fTicks = comparison['back-to-front'].ticks;
    if (stratTicks === b2fTicks) return 'Baseline (Optimal)';
    const diff = ((stratTicks - b2fTicks) / b2fTicks * 100).toFixed(0);
    return `+${diff}% slower`;
  };

  const allBookedSeats = bookings.flatMap(b => b.seats.map(s => `${s.column}${s.row}`));

  return (
    <div className="simulator-workspace">
      {/* Left Column: The Bus Layout (no nested card, just the visualizer) */}
      <div className="bus-visualizer-container">
        <BusLayout 
          bookedSeats={allBookedSeats}
          seatedSeats={seatedSeats}
          passengers={passengers}
          numRows={20}
        />
      </div>

      {/* Right Column: Controls, Stats, Parameters, and Comparison Dashboard */}
      <div className="sim-controls-panel">
        
        {/* Strategy Selector & Basic Controls */}
        <div className="glass-card">
          <div className="card-title">
            <PlayCircleIcon />
            <span>Animation Control Panel</span>
          </div>

          {/* Strategy Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
            <span className="input-label">Boarding Strategy (For Animation)</span>
            <div className="strategy-selector">
              <div 
                className={`strategy-pill ${strategy === 'back-to-front' ? 'active' : ''}`}
                onClick={() => handleStrategyChange('back-to-front')}
              >
                Back-to-Front (Optimized)
              </div>
              <div 
                className={`strategy-pill ${strategy === 'random' ? 'active' : ''}`}
                onClick={() => handleStrategyChange('random')}
              >
                Random (Input Order)
              </div>
              <div 
                className={`strategy-pill ${strategy === 'front-to-back' ? 'active' : ''}`}
                onClick={() => handleStrategyChange('front-to-back')}
              >
                Front-to-Back (Worst Case)
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button 
              className={`btn ${simState === 'running' ? 'btn-secondary' : 'btn-primary'}`} 
              onClick={togglePlay}
              disabled={simState === 'finished'}
              style={{ flex: 1.2 }}
            >
              {simState === 'running' ? <PauseIcon /> : <PlayIcon />}
              {simState === 'running' ? 'Pause' : 'Start Animation'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={handleTick}
              disabled={simState === 'running' || simState === 'finished'}
              style={{ flex: 0.8 }}
            >
              Step ➡️
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={resetSimulation}
              style={{ flex: 0.8 }}
            >
              <RotateCcwIcon />
              Reset
            </button>
          </div>

          {/* Live Stats Row */}
          <div className="sim-stats-row">
            <div className="sim-stat-badge">
              <span className="sim-stat-value">{tick}</span>
              <span className="sim-stat-label">Time Ticks</span>
            </div>
            <div className="sim-stat-badge" style={{ color: stats.aisleBlocks > 0 ? 'var(--accent-amber)' : 'inherit' }}>
              <span className="sim-stat-value">{stats.aisleBlocks}</span>
              <span className="sim-stat-label">Aisle Blocks</span>
            </div>
            <div className="sim-stat-badge" style={{ color: stats.seatConflicts > 0 ? 'var(--accent-rose)' : 'inherit' }}>
              <span className="sim-stat-value">{stats.seatConflicts}</span>
              <span className="sim-stat-label">Seat Conflicts</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.75rem', color: 'var(--text-secondary)' }}>
            <span>Seated Passengers: <b>{seatedSeats.length} / {allBookedSeats.length}</b></span>
            <span>Status: <b style={{ color: simState === 'running' ? 'var(--secondary)' : simState === 'finished' ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>{simState.toUpperCase()}</b></span>
          </div>
        </div>

        {/* Simplified Parameters */}
        <div className="glass-card">
          <div className="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Simulation Parameters</span>
          </div>

          <div className="sim-settings-grid">
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span className="input-label">Animation Speed</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>{speedMs}ms / tick</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="1000" 
                step="50"
                value={speedMs} 
                onChange={(e) => setSpeedMs(Number(e.target.value))}
                className="slider-input"
              />
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span className="input-label">Luggage Stow Time</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: 'bold' }}>{stowingDelay} ticks</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={stowingDelay} 
                onChange={(e) => setStowingDelay(Number(e.target.value))}
                className="slider-input"
              />
            </div>
          </div>
        </div>

        {/* Comparative Analysis Dashboard */}
        {comparison && (
          <div className="glass-card">
            <div className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <span>Algorithm Comparison Dashboard</span>
            </div>

            <div className="results-table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Strategy</th>
                    <th>Boarding Time (Ticks)</th>
                    <th>Aisle Blockages</th>
                    <th>Seat Conflicts</th>
                    <th>Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={strategy === 'back-to-front' ? 'highlighted' : ''}>
                    <td style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>Back-to-Front (Optimized)</td>
                    <td style={{ fontWeight: 'bold' }}>{comparison['back-to-front'].ticks}</td>
                    <td>{comparison['back-to-front'].aisleBlocks}</td>
                    <td>{comparison['back-to-front'].seatConflicts}</td>
                    <td style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>
                      {calculateEfficiency(comparison['back-to-front'].ticks)}
                    </td>
                  </tr>
                  <tr className={strategy === 'random' ? 'highlighted' : ''}>
                    <td style={{ fontWeight: 'bold' }}>Random (Input Order)</td>
                    <td style={{ fontWeight: 'bold' }}>{comparison['random'].ticks}</td>
                    <td>{comparison['random'].aisleBlocks}</td>
                    <td>{comparison['random'].seatConflicts}</td>
                    <td style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>
                      {calculateEfficiency(comparison['random'].ticks)}
                    </td>
                  </tr>
                  <tr className={strategy === 'front-to-back' ? 'highlighted' : ''}>
                    <td style={{ fontWeight: 'bold', color: 'var(--accent-rose)' }}>Front-to-Back (Worst Case)</td>
                    <td style={{ fontWeight: 'bold' }}>{comparison['front-to-back'].ticks}</td>
                    <td>{comparison['front-to-back'].aisleBlocks}</td>
                    <td>{comparison['front-to-back'].seatConflicts}</td>
                    <td style={{ color: 'var(--accent-rose)', fontWeight: 'bold' }}>
                      {calculateEfficiency(comparison['front-to-back'].ticks)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="help-text" style={{ marginTop: '0.6rem', fontSize: '0.72rem' }}>
              💡 Back-to-front boarding minimizes aisle blocks by seating passengers from back to front, keeping the aisle clear.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
