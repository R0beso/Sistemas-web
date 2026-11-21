'use strict';

const express = require('express');
const { login, logout, getSession } = require('../auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', (req, res) => {
  const session = getSession(req);
  res.json({ authenticated: Boolean(session) });
});

module.exports = router;
