const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Transaction = require('./models/Transaction');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/spendpaisa')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware to require userId
const requireUserId = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ message: 'x-user-id header is required' });
  }
  req.userId = userId;
  next();
};

// Routes

// Get all transactions
app.get('/api/transactions', requireUserId, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId }).sort({ date: 1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a transaction
app.post('/api/transactions', requireUserId, async (req, res) => {
  try {
    const newTransaction = new Transaction({ ...req.body, userId: req.userId });
    const savedTransaction = await newTransaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a transaction
app.delete('/api/transactions/:id', requireUserId, async (req, res) => {
  try {
    const deletedTransaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!deletedTransaction) return res.status(404).json({ message: 'Transaction not found or unauthorized' });
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Clear all transactions
app.delete('/api/transactions', requireUserId, async (req, res) => {
  try {
    await Transaction.deleteMany({ userId: req.userId });
    res.json({ message: 'All transactions deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
