const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

// User dashboard
router.get('/dashboard', isAuthenticated, (req, res) => {
  console.log(`User ${req.session.user.username} accessed dashboard`);
  res.render('dashboard', { user: req.session.user });
});

// User profile (for the logged-in user)
router.get('/profile', isAuthenticated, (req, res) => {
  console.log(`User ${req.session.user.username} accessed their profile`);
  res.render('profile', { user: req.session.user });
});

// View user profile by username - this needs its own dedicated route
router.get('/:username', async (req, res, next) => {
  try {
    const username = req.params.username;
    
    // Debug log
    console.log(`Attempting to view profile for: ${username}`);
    
    // Find user in the database
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log(`User profile not found: ${username}`);
      // Instead of sending to 404 handler, provide a custom message
      return res.status(404).render('404', { 
        url: req.originalUrl,
        message: `User "${username}" not found`
      });
    }
    
    // Don't expose sensitive information
    const userProfile = {
      username: user.username,
      createdAt: user.createdAt
    };
    
    console.log(`Rendering profile for user: ${username}`);
    return res.render('user-profile', { profile: userProfile });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    next(error);
  }
});

module.exports = router;
