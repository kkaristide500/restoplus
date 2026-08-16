'use client';
// Rapports — tendances des repas servis, satisfaction, export CSV
import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDailyMealsServed, getDailySatisfaction, getSatisfactionBreakdown } from '../../../lib/queries/reports';
import { exportToCsv } from '../../../lib/csv-export';

const SLOT_LABELS: Record<string, string> = {
  petit_dejeuner: 'Petit-déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner',
};

export default function ReportsPage() {
  const [mealsRaw, setMealsRaw] = useState<any[]>([]);
  const [satisfaction, setSatisfaction] = useState<any[]>([]);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDailyMealsServed(), getDailySatisfaction(), getSatisfactionBreakdown()]).then(
      ([meals, sat, brk]) => {
        setMealsRaw(meals);
        setSatisfaction(sat);
        setBreakdown(brk);
        setIsLoading(false);
      }
    );
  }, []);

  // Regroupe les repas servis par jour (toutes créneaux confondus) pour le graphique
  const mealsByDay = Object.values(
    mealsRaw.reduce((acc: any, row: any) => {
      acc[row.day] = acc[row.day] || { day: row.day, total: 0 };
      acc[row.day].total += row.meals_count;
      return acc;
    }, {})
  );

  const breakdownData = breakdown
    ? [
        { name: 'Goût', value: breakdown.avg_taste ?? 0 },
        { name: 'Quantité', value: breakdown.avg_quantity ?? 0 },
        { name: 'Service', value: breakdown.avg_service ?? 0 },
      ]
    : [];

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Rapports</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => exportToCsv('repas-servis.csv', mealsRaw)} style={btnSecondary}>Exporter repas (CSV)</button>
          <button onClick={() => exportToCsv('satisfaction.csv', satisfaction)} style={btnSecondary}>Exporter avis (CSV)</button>
        </div>
      </div>

      {isLoading ? <p>Chargement...</p> : (
        <>
          <h3 style={{ marginTop: 24 }}>Repas servis (14 derniers jours)</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mealsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#16a34a" strokeWidth={2} name="Repas servis" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 style={{ marginTop: 24 }}>Répartition par créneau</h3>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#666' }}><th>Date</th><th>Créneau</th><th>Repas servis</th></tr>
            </thead>
            <tbody>
              {mealsRaw.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '4px 0' }}>{r.day}</td>
                  <td>{SLOT_LABELS[r.slot]}</td>
                  <td>{r.meals_count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Évolution de la satisfaction</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={satisfaction}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis domain={[0, 5]} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="avg_rating" stroke="#f59e0b" strokeWidth={2} name="Note moyenne" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 style={{ marginTop: 24 }}>Satisfaction par critère</h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis domain={[0, 5]} fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
            Basé sur les critères détaillés optionnels (goût/quantité/service) renseignés par les usagers.
          </p>
        </>
      )}
    </div>
  );
}

const btnSecondary: React.CSSProperties = { background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' };
