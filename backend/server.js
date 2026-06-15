import express from 'express';
import cors from 'cors';
import { parseBookingData, generateBoardingSequence } from './boarding.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'text/*' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Main endpoint to generate boarding sequence
app.post('/api/sequence', (req, res) => {
  try {
    let rawData = '';

    // Handle both JSON payload and raw text payload
    if (req.is('json')) {
      rawData = req.body.rawData || req.body.data || '';
    } else if (typeof req.body === 'string') {
      rawData = req.body;
    }

    if (!rawData || !rawData.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No booking data provided. Please provide booking data in the request body.'
      });
    }

    const parsedBookings = parseBookingData(rawData);
    
    if (parsedBookings.length === 0) {
      return res.status(400).json({
        error: 'Parsing Error',
        message: 'Could not parse any valid bookings from the input data.'
      });
    }

    const sequence = generateBoardingSequence(parsedBookings);

    res.json({
      success: true,
      bookingsCount: parsedBookings.length,
      sequence,
      originalParsed: parsedBookings // useful for frontend visualizer
    });
  } catch (error) {
    console.error('Error generating sequence:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Bus Boarding Backend running on http://localhost:${PORT}`);
});
