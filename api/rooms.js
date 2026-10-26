export default function handler(req, res) {
  // Generate random room code
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let roomId = '';
  for (let i = 0; i < 6; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ roomId, success: true });
}
