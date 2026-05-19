@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #0a0a0f;
  --bg-card: #111118;
  --bg-elevated: #1a1a24;
  --border: rgba(255,255,255,0.06);
  --text-primary: #f0f0f8;
  --text-secondary: #8888aa;
  --accent-green: #00e676;
  --accent-orange: #ff6b35;
  --accent-blue: #4fc3f7;
}

* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'DM Sans', sans-serif;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

/* Print styles for QR Code */
@media print {
  body * { visibility: hidden !important; }
  #qr-print-area, #qr-print-area * { visibility: visible !important; }
  #qr-print-area {
    position: fixed !important;
    inset: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    background: white !important;
    gap: 16px !important;
  }
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

.animate-fade-in { animation: fadeIn 0.35s ease forwards; }
.animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

.pulse-ring::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 2px solid currentColor;
  animation: pulse-ring 1.5s ease-out infinite;
}
