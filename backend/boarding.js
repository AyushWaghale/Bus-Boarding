/**
 * Parses a seat string (e.g., "A20", "C2", "20D") and returns column and row.
 * Row represents the distance from the front entry.
 * @param {string} seatStr 
 * @returns {{column: string, row: number} | null}
 */
export function parseSeat(seatStr) {
  const cleanSeat = seatStr.trim().replace(/['"]/g, '');
  if (!cleanSeat) return null;

  // Pattern 1: Column followed by Row (e.g., A20, B1)
  const pattern1 = cleanSeat.match(/^([A-Za-z]+)(\d+)$/);
  if (pattern1) {
    return {
      column: pattern1[1].toUpperCase(),
      row: parseInt(pattern1[2], 10)
    };
  }

  // Pattern 2: Row followed by Column (e.g., 20A, 2B)
  const pattern2 = cleanSeat.match(/^(\d+)([A-Za-z]+)$/);
  if (pattern2) {
    return {
      column: pattern2[2].toUpperCase(),
      row: parseInt(pattern2[1], 10)
    };
  }

  return null;
}

/**
 * Parses raw booking data text into an array of booking objects.
 * Supports:
 * - Space/Tab separated: Booking_ID  Seats (e.g., "101 A1,B1")
 * - Comma separated: Booking_ID,Seats (e.g., "101,A1,B1" or "101,A1,B1")
 * @param {string} rawData 
 * @returns {Array<{bookingId: string, seats: Array<{column: string, row: number}>, maxRow: number}>}
 */
export function parseBookingData(rawData) {
  if (!rawData) return [];

  const lines = rawData.split(/\r?\n/);
  const bookings = [];

  for (let line of lines) {
    line = line.trim();
    
    // Skip empty lines or headers
    if (!line) continue;
    if (line.toLowerCase().includes('booking_id') || line.toLowerCase().includes('seats')) {
      continue;
    }

    let bookingId = '';
    let seatsPart = '';

    // Match space/tab separation first
    const spaceMatch = line.match(/^(\S+)\s+(.+)$/);
    if (spaceMatch) {
      bookingId = spaceMatch[1];
      seatsPart = spaceMatch[2];
    } else {
      // Try comma separation
      const firstComma = line.indexOf(',');
      if (firstComma !== -1) {
        bookingId = line.substring(0, firstComma).trim();
        seatsPart = line.substring(firstComma + 1).trim();
      } else {
        // Fallback: entire line as booking ID with no seats
        bookingId = line;
        seatsPart = '';
      }
    }

    // Clean bookingId
    bookingId = bookingId.replace(/['"]/g, '').trim();

    // Parse seats (can be separated by commas, semicolons, or spaces)
    const rawSeats = seatsPart
      .split(/[,;\s]+/)
      .map(s => s.trim())
      .filter(Boolean);

    const seats = [];
    let maxRow = 0;

    for (const seatStr of rawSeats) {
      const parsed = parseSeat(seatStr);
      if (parsed) {
        seats.push(parsed);
        if (parsed.row > maxRow) {
          maxRow = parsed.row;
        }
      }
    }

    // Even if no seats parse successfully, we keep the booking (assign row 0)
    bookings.push({
      bookingId,
      seats,
      maxRow
    });
  }

  return bookings;
}

/**
 * Generates the optimal boarding sequence.
 * Sorts descending by maxRow (farthest rows first).
 * In case of tie, sorts ascending by Booking_ID.
 * @param {Array<{bookingId: string, seats: Array<{column: string, row: number}>, maxRow: number}>} bookings 
 * @returns {Array<{seq: number, bookingId: string, seats: string[], maxRow: number}>}
 */
export function generateBoardingSequence(bookings) {
  // Create a copy to avoid mutating the original array
  const sorted = [...bookings];

  sorted.sort((a, b) => {
    // 1. Primary sort: maxRow descending (back-to-front)
    if (b.maxRow !== a.maxRow) {
      return b.maxRow - a.maxRow;
    }

    // 2. Secondary sort: bookingId ascending (tie-breaker)
    const numA = Number(a.bookingId);
    const numB = Number(b.bookingId);

    // If both are numbers, sort numerically
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    // Otherwise, sort lexicographically (natural sort)
    return String(a.bookingId).localeCompare(String(b.bookingId), undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  });

  // Map to desired output structure with Seq index
  return sorted.map((b, index) => ({
    seq: index + 1,
    bookingId: b.bookingId,
    seats: b.seats.map(s => `${s.column}${s.row}`),
    maxRow: b.maxRow
  }));
}
