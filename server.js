const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs');

const app = express();

// Create a logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create a write stream for logging
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Custom logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode} ${duration}ms`;
    console.log(log);
    accessLogStream.write(log + '\n');
  });
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/new-calendar', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'calendar-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/new-calendar'
    }),
    cookie: { 
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: process.env.NODE_ENV === 'production'
    }
  })
);

// Global middleware for user authentication state
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Load routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

// Routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);

// Home route
app.get('/', (req, res) => {
  res.render('index');
});

// Catch-all route for user profiles
// This needs to be AFTER the defined routes but BEFORE the 404 handler
app.get('/:username', async (req, res, next) => {
  try {
    // Check if this might be a user profile
    const User = require('./models/User');
    const username = req.params.username;
    
    // Log the lookup attempt
    console.log(`Looking up user profile for: ${username}`);
    
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log(`User ${username} not found in database`);
      return next(); // Pass to the 404 handler
    }
    
    // We found the user, render their profile
    const userProfile = {
      username: user.username,
      createdAt: user.createdAt
    };
    
    // Log success
    console.log(`Found user profile: ${username}`);
    
    return res.render('user-profile', { profile: userProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    next(error);
  }
});

// Error handling middleware
app.use((req, res, next) => {
  console.log(`404 Not Found: ${req.originalUrl}`);
  res.status(404).render('404', { url: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).render('error', { error: err });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
