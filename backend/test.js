import assert from 'assert';
import { parseSeat, parseBookingData, generateBoardingSequence } from './boarding.js';

console.log('🧪 Running Bus Boarding Sequence Generator Tests...');

try {
  // Test 1: parseSeat
  console.log('  Testing parseSeat...');
  assert.deepStrictEqual(parseSeat('A20'), { column: 'A', row: 20 });
  assert.deepStrictEqual(parseSeat('c2'), { column: 'C', row: 2 });
  assert.deepStrictEqual(parseSeat('10B'), { column: 'B', row: 10 });
  assert.deepStrictEqual(parseSeat('  D1  '), { column: 'D', row: 1 });
  assert.strictEqual(parseSeat('invalid'), null);

  // Test 2: parseBookingData with sample input
  console.log('  Testing parseBookingData (sample input)...');
  const sampleInput = `
Booking_ID\tSeats
101\tA1,B1
120\tA20,C2
  `;
  const parsed = parseBookingData(sampleInput);
  assert.strictEqual(parsed.length, 2);
  assert.strictEqual(parsed[0].bookingId, '101');
  assert.strictEqual(parsed[0].maxRow, 1);
  assert.deepStrictEqual(parsed[0].seats, [{ column: 'A', row: 1 }, { column: 'B', row: 1 }]);
  assert.strictEqual(parsed[1].bookingId, '120');
  assert.strictEqual(parsed[1].maxRow, 20);

  // Test 3: generateBoardingSequence (sample sequence)
  console.log('  Testing generateBoardingSequence (sample sequence)...');
  const sequence = generateBoardingSequence(parsed);
  assert.strictEqual(sequence.length, 2);
  assert.strictEqual(sequence[0].seq, 1);
  assert.strictEqual(sequence[0].bookingId, '120'); // Row 20 first
  assert.strictEqual(sequence[1].seq, 2);
  assert.strictEqual(sequence[1].bookingId, '101'); // Row 1 second

  // Test 4: Ties and string IDs sorting
  console.log('  Testing Ties and String IDs sorting...');
  const tieInput = `
Booking_ID  Seats
BK-10       A5,B5
BK-02       C15
BK-05       A15
BK-01       D5
  `;
  const tieParsed = parseBookingData(tieInput);
  const tieSequence = generateBoardingSequence(tieParsed);
  
  // Farthest rows should board first. Row 15 first, then Row 5.
  // Row 15 contains BK-02 and BK-05. BK-02 should board before BK-05 due to tie-breaker (lexicographical).
  // Row 5 contains BK-10 and BK-01. BK-01 should board before BK-10 due to tie-breaker (lexicographical).
  
  assert.strictEqual(tieSequence[0].bookingId, 'BK-02'); // Row 15
  assert.strictEqual(tieSequence[1].bookingId, 'BK-05'); // Row 15
  assert.strictEqual(tieSequence[2].bookingId, 'BK-01'); // Row 5
  assert.strictEqual(tieSequence[3].bookingId, 'BK-10'); // Row 5

  console.log('✅ All tests passed successfully!');
} catch (error) {
  console.error('❌ Tests failed!');
  console.error(error);
  process.exit(1);
}
