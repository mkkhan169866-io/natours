const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.use(authController.isLoggedIn);

router.get('/', viewsController.getOverview);
router.get('/logout', authController.logout);
router.get('/me', viewsController.getAccount);
router.get(
  '/my-bookings',
  authController.protect,
  bookingController.getMyBookings
);
router.get('/signup', viewsController.getSignupForm);
router.get('/tour/:slug', viewsController.getTour);
router.get('/login', viewsController.getLoginForm);

module.exports = router;
