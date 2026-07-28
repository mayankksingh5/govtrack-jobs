if (process.env.VERCEL_ENV !== 'production') process.exit(0);
if (!process.env.VITE_API_URL) {
  throw new Error('VITE_API_URL is required for a production deployment');
}
const apiUrl = new URL(process.env.VITE_API_URL);
if (apiUrl.protocol !== 'https:') {
  throw new Error('VITE_API_URL must use HTTPS in production');
}
