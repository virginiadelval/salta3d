import React from 'react'

export default () => (
  <svg viewBox="0 0 24 24" style={{ width: '48px', height: '48px', margin: 'auto', display: 'block' }}>
    <defs>
      <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#e20613', stopOpacity: 1 }} />
        <stop offset="20%" style={{ stopColor: '#f96332', stopOpacity: 1 }} />
        <stop offset="40%" style={{ stopColor: '#fed304', stopOpacity: 1 }} />
        <stop offset="60%" style={{ stopColor: '#4caf50', stopOpacity: 1 }} />
        <stop offset="80%" style={{ stopColor: '#00bcd4', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#9c27b0', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path
      fill="url(#heartGrad)"
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
    />
  </svg>
)
