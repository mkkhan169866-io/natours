const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('./../models/tourModel');
const Booking = require('./../models/bookingModel');
const catchAsync = require('../utils/catchAsync');

// Create Checkout Session
exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  if (!tour)
    return res.status(404).json({ status: 'fail', message: 'Tour not found' });

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?alert=booking`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user ? req.user.email : undefined,
    client_reference_id: req.params.tourId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: tour.name,
            description: tour.summary,
            images: [
              `${req.protocol}://${req.get('host')}/img/tours/${
                tour.imageCover
              }`,
            ],
          },
          unit_amount: tour.price * 100,
        },
        quantity: 1,
      },
    ],
    metadata: {
      tour: req.params.tourId,
      user: req.user ? req.user.id : undefined,
    },
  });

  // 3) Send session to client
  res.status(200).json({ status: 'success', session });
});

// Create booking in DB from Stripe session
const createBookingCheckout = async (session) => {
  const tourId = session.metadata.tour;
  const userId = session.metadata.user;
  const price = session.amount_total / 100;
  if (!tourId || !userId) return;

  await Booking.create({
    tour: tourId,
    user: userId,
    price,
    sessionId: session.id,
    paid: true,
  });
};

// Webhook to handle checkout.session.completed
exports.webhookCheckout = (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    createBookingCheckout(session)
      .then(() => res.status(200).json({ received: true }))
      .catch((err) => {
        console.error('Failed to create booking from session:', err);
        res.status(500).json({ error: 'Failed to create booking' });
      });
  } else {
    res.status(200).json({ received: true });
  }
};

// Get all bookings for the logged-in user
exports.getMyBookings = catchAsync(async (req, res, next) => {
  // Find all bookings for the current user and populate tour details
  const bookings = await Booking.find({ user: req.user.id }).populate('tour');

  res.status(200).render('myBookings', {
    title: 'My Bookings',
    bookings,
  });
});

// === BOOKING API ENDPOINTS ===

// Get all bookings (admin-only)
exports.getAllBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find().populate('user').populate('tour');

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: {
      bookings,
    },
  });
});

// Get a single booking by ID
exports.getBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('user')
    .populate('tour');

  if (!booking) {
    return res.status(404).json({
      status: 'fail',
      message: 'Booking not found',
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      booking,
    },
  });
});

// Create a booking manually (admin-only)
exports.createBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      booking,
    },
  });
});

// Update a booking (admin-only)
exports.updateBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!booking) {
    return res.status(404).json({
      status: 'fail',
      message: 'Booking not found',
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      booking,
    },
  });
});

// Delete a booking (admin-only)
exports.deleteBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findByIdAndDelete(req.params.id);

  if (!booking) {
    return res.status(404).json({
      status: 'fail',
      message: 'Booking not found',
    });
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
