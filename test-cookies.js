// Quick test to see what cookies are being set
const response = await fetch('http://localhost:8000/auth/v1/token?grant_type=password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  },
  body: JSON.stringify({
    email: 'admin@apr.local',
    password: 'admin123'
  })
});
const data = await response.json();
console.log('Cookies from response:', response.headers.get('set-cookie'));
