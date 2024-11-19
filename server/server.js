const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT || "http://localhost:3000",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use(express.json());

let cachedDb = null;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.token = token;
  next();
};

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db("usersDB");
  cachedDb = db;
  return db;
}

// Initialize database indexes
async function initializeIndexes() {
  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    await usersCollection.dropIndexes();
    
    await usersCollection.createIndex({ googleId: 1 }, { unique: true });
    
    console.log('Database indexes initialized successfully');
  } catch (error) {
    console.error('Error initializing database indexes:', error);
  }
}

// Call this when the server starts
initializeIndexes();

app.post('/api/users', async (req, res) => {
  const { googleId, email, name, picture, xp, level } = req.body;
  const authHeader = req.headers.authorization;

  const token = authHeader?.split(' ')[1];

  if (!token || !googleId) {
    console.error('Missing token or googleId:', { token, googleId });
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    const existingUser = await usersCollection.findOne({ googleId });
    
    if (existingUser) {
      console.log('User found:', existingUser);
      return res.json({
        userId: existingUser._id.toString(),
        exists: true,
        xp: existingUser.xp,
        level: existingUser.level,
        tasksCompleted: existingUser.tasksCompleted,
        tasks: existingUser.tasks || [],
        completedTasks: existingUser.completedTasks || []
      });
    }

    const newUser = {
      googleId,
      email,
      name,
      picture,
      xp: xp || 0,
      level: level || 1,
      tasksCompleted: 0,
      tasks: [],
      completedTasks: [],
      isOptIn: false,
      createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    console.log('New user created with ID:', result.insertedId.toString());

    res.json({
      userId: result.insertedId.toString(),
      exists: false,
      xp: newUser.xp,
      level: newUser.level,
      tasksCompleted: newUser.tasksCompleted,
      tasks: [],
      completedTasks: []
    });

  } catch (error) {
    console.error('Error in user creation/lookup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const { xp, tasksCompleted, level, tasks, completedTasks } = req.body;
  
  const numXP = Number(xp) || 0;
  const numTasksCompleted = Number(tasksCompleted) || 0;
  const numLevel = Number(level) || 1;
  
  if (isNaN(numXP) || isNaN(numTasksCompleted) || isNaN(numLevel)) {
    return res.status(400).json({ error: 'Invalid xp, tasksCompleted, or level value' });
  }

  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: { 
          xp: numXP,
          tasksCompleted: numTasksCompleted,
          level: numLevel,
          tasks: tasks || [],
          completedTasks: completedTasks || [],
          updatedAt: new Date() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/leaderboard', authenticateToken, async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;
  
  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    const leaderboard = await usersCollection.find({ isOptIn: true })
      .sort({ xp: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Modify endpoint to toggle opt-in status
app.put('/api/users/:id/opt-in', authenticateToken, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    // Get current user to check current status
    const user = await usersCollection.findOne({ _id: new ObjectId(req.params.id) });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Toggle the isOptIn status
    const newStatus = !user.isOptIn;
    
    await usersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { isOptIn: newStatus } }
    );
    
    res.json({ 
      message: `Opt-in status updated successfully`,
      isOptIn: newStatus 
    });
  } catch (error) {
    console.error('Error updating opt-in status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new endpoint to get user data
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.params.id) }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = app;