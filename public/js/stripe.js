/* eslint-disable */
// Minimal Stripe checkout handler using fetch so it doesn't depend on your bundle.
(function () {
  // Replace with your publishable key
  const STRIPE_PUBLISHABLE_KEY =
    'pk_test_51SVfYeRn7CVWorh7JmLB2dNiJq7yzb1PRE6Xuvi7QVf8kbOo4oE2GnEYvR7FIDRtKUcdyRxDZebqFMjeuw6xpLdf00OaCUriS6';

  const bookBtn = document.getElementById('book-tour');

  const bookTour = async (tourId) => {
    try {
      // 1) Get checkout session from the server (send cookies so server can read JWT)
      const res = await fetch(`/api/v1/tours/${tourId}/checkout-session`, {
        credentials: 'same-origin',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Checkout session error:', res.status, errorData);
        throw new Error(
          `Failed to create checkout session: ${res.status} ${
            errorData.message || ''
          }`
        );
      }
      const data = await res.json();

      // 2) Create Stripe instance and redirect to checkout
      const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
      await stripe.redirectToCheckout({ sessionId: data.session.id });
    } catch (err) {
      console.error('Error booking tour:', err);
      alert('Could not initiate booking. Please try again later.');
    }
  };

  if (bookBtn) {
    bookBtn.addEventListener('click', (e) => {
      e.target.textContent = 'Processing...';
      const tourId = e.target.dataset.tourId;
      if (!tourId) {
        console.error('No tour id found on button');
        return;
      }
      bookTour(tourId);
    });
  }
})();
