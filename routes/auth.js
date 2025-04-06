const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET register page
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/user/dashboard');
  }
  res.render('register');
});

// POST register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.render('register', { error: 'All fields are required' });
    }
    
    if (password !== confirmPassword) {
      return res.render('register', { error: 'Passwords do not match' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.render('register', { error: 'Username or email already in use' });
    }
    
    // Create new user
    const user = new User({ username, email, password });
    await user.save();
    
    // Log success
    console.log(`New user registered: ${username}`);
    
    // Store user in session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email
    };
    
    // Critical fix: redirect to the correct route
    return res.redirect(`/user/dashboard`);
  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', { error: 'An error occurred during registration' });
  }
});

// GET login page
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/user/dashboard');
  }
  res.render('login');
});

// POST login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.render('login', { error: 'Username and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      console.log(`Failed login attempt: User ${username} not found`);
      return res.render('login', { error: 'Invalid username or password' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Failed login attempt: Incorrect password for ${username}`);
      return res.render('login', { error: 'Invalid username or password' });
    }
    
    // Update last login
    user.lastLogin = Date.now();
    await user.save();
    
    // Store user in session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email
    };
    
    console.log(`User logged in: ${username}`);
    
    // Critical fix: ensure proper redirection
    return res.redirect('/user/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { error: 'An error occurred during login' });
  }
});

// GET logout
router.get('/logout', (req, res) => {
  const username = req.session.user ? req.session.user.username : 'Unknown user';
  console.log(`User logging out: ${username}`);
  
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;
