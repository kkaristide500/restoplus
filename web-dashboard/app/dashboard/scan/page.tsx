'use client';
// Scan Repas — caméra web (html5-qrcode), appelle la fonction serveur consume_meal.
// C'est ICI que se fait l'anti-double-scan (vérifié côté base, pas juste côté UI).
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';

type MealSlot = 'petit_dejeuner' | 'dejeuner' | 'diner';

const SLOT_LABELS: Record<MealSlot, string> = {
  petit_dejeuner: 'Petit-déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner',
};

export default function ScanPage() {
  const [slot, setSlot] = useState<MealSlot>('dejeuner');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const scannerRef = useRef<any>(null);
  const isProcessingRef = useRef(false);

  async function handleScanResult(decodedText: string) {
    if (isProcessingRef.current) return; // évite de traiter 2 frames de la même image
    isProcessingRef.current = true;

    const { data, error } = await supabase.rpc('consume_meal', {
      p_code_value: decodedText,
      p_slot: slot,
    });

    if (error) {
      setResult({ type: 'error', message: error.message });
    } else {
      setResult({
        type: 'success',
        message: `${data.student_name} — ${SLOT_LABELS[slot]} validé (${data.remaining_after} repas restants)`,
      });
    }

    // Petite pause avant de pouvoir scanner un nouvel élève
    setTimeout(() => { isProcessingRef.current = false; }, 2000);
  }

  useEffect(() => {
    if (!isScanning) return;

    let html5QrCode: any;
    (async () => {
      const { Html5Qrcode } = await import('html5-qrcode');
      html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText: string) => handleScanResult(decodedText),
          () => {} // erreurs de frame ignorées (pas de QR détecté)
        );
      } catch (e) {
        setResult({ type: 'error', message: "Impossible d'accéder à la caméra." });
        setIsScanning(false);
      }
    })();

    return () => {
      html5QrCode?.stop().catch(() => {});
    };
  }, [isScanning, slot]);

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h1>Scan Repas</h1>

      <label style={{ display: 'block', fontWeight: 600, margin: '16px 0 6px' }}>Créneau</label>
      <select value={slot} onChange={(e) => setSlot(e.target.value as MealSlot)} style={inputStyle} disabled={isScanning}>
        <option value="petit_dejeuner">Petit-déjeuner</option>
        <option value="dejeuner">Déjeuner</option>
        <option value="diner">Dîner</option>
      </select>

      {!isScanning ? (
        <button onClick={() => { setResult(null); setIsScanning(true); }} style={btnPrimary}>
          Démarrer le scan
        </button>
      ) : (
        <button onClick={() => setIsScanning(false)} style={btnDanger}>
          Arrêter le scan
        </button>
      )}

      <div id="qr-reader" style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden' }} />

      {result && (
        <div style={{
          marginTop: 16, padding: 14, borderRadius: 10,
          background: result.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: result.type === 'success' ? '#16a34a' : '#dc2626',
          fontWeight: 600,
        }}>
          {result.message}
        </div>
      )}

      <p style={{ fontSize: 12, color: '#888', marginTop: 16 }}>
        Chaque scan est vérifié côté serveur : abonnement actif, créneau inclus dans la formule,
        solde suffisant, et repas pas déjà validé aujourd'hui pour cet élève.
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' };
const btnPrimary: React.CSSProperties = { width: '100%', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, padding: 14, fontWeight: 700, cursor: 'pointer', marginTop: 16 };
const btnDanger: React.CSSProperties = { width: '100%', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: 14, fontWeight: 700, cursor: 'pointer', marginTop: 16 };
