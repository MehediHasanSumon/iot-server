require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB, getPool } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// 1. GET all devices
app.get('/api/devices', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, name, status, updated_at FROM devices ORDER BY id ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. GET single device by ID
app.get('/api/devices/:id', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id, 10);
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, name, status, updated_at FROM devices WHERE id = ?', [deviceId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Device with ID ${deviceId} not found` });
    }

    // If query string ?format=plain or raw text requested, return just the status (IoT friendly)
    if (req.query.format === 'plain') {
      return res.send(rows[0].status);
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. POST update device status explicitly ('on' or 'off')
app.post('/api/devices/:id/status', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id, 10);
    let { status } = req.body;

    if (!status || !['on', 'off'].includes(status.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid status. Value must be "on" or "off".' });
    }

    status = status.toLowerCase();
    const pool = getPool();

    const [result] = await pool.query('UPDATE devices SET status = ? WHERE id = ?', [status, deviceId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Device with ID ${deviceId} not found` });
    }

    const [updatedRow] = await pool.query('SELECT id, name, status, updated_at FROM devices WHERE id = ?', [deviceId]);

    res.json({
      success: true,
      message: `${updatedRow[0].name} status updated to ${status}`,
      data: updatedRow[0],
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. POST toggle device status
app.post('/api/devices/:id/toggle', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id, 10);
    const pool = getPool();

    const [rows] = await pool.query('SELECT id, name, status FROM devices WHERE id = ?', [deviceId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Device with ID ${deviceId} not found` });
    }

    const currentStatus = rows[0].status;
    const newStatus = currentStatus === 'on' ? 'off' : 'on';

    await pool.query('UPDATE devices SET status = ? WHERE id = ?', [newStatus, deviceId]);
    const [updated] = await pool.query('SELECT id, name, status, updated_at FROM devices WHERE id = ?', [deviceId]);

    res.json({
      success: true,
      message: `${updated[0].name} toggled to ${newStatus}`,
      data: updated[0],
    });
  } catch (error) {
    console.error('Error toggling device status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. GET shortcut for IoT microcontrollers (e.g. GET /api/devices/1/set/on)
app.get('/api/devices/:id/set/:status', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id, 10);
    const status = req.params.status.toLowerCase();

    if (!['on', 'off'].includes(status)) {
      return res.status(400).send('INVALID_STATUS');
    }

    const pool = getPool();
    const [result] = await pool.query('UPDATE devices SET status = ? WHERE id = ?', [status, deviceId]);

    if (result.affectedRows === 0) {
      return res.status(404).send('DEVICE_NOT_FOUND');
    }

    res.send(`OK:${status.toUpperCase()}`);
  } catch (error) {
    console.error('Error setting device status via GET:', error);
    res.status(500).send('ERROR');
  }
});

// Start server after initializing DB
async function startServer() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` IoT Controller Server running on port ${PORT}`);
    console.log(` Dashboard: http://localhost:${PORT}`);
    console.log(` API Endpoint: http://localhost:${PORT}/api/devices`);
    console.log(`===============================================`);
  });
}

startServer();
