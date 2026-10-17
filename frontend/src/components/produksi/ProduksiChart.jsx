import React from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import {
  TrendingUp,
  Activity,
  Egg,
  AlertTriangle,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react'

// Custom Tooltip dengan Deteksi Anomali HDP > 100% (Light Theme)
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const formattedDate = new Date(data.tanggal).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

    const hdp = data.hdp_percentage
    const isAnomaly = hdp > 100 || data.is_hdp_anomaly

    const hdpColor = isAnomaly
      ? 'text-orange-700 border-orange-300 bg-orange-50 ring-1 ring-orange-400'
      : hdp >= 85
      ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
      : hdp >= 70
      ? 'text-amber-700 border-amber-200 bg-amber-50'
      : 'text-rose-700 border-rose-200 bg-rose-50'

    return (
      <div className="bg-white/95 border border-slate-200 p-3.5 rounded-2xl shadow-xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
        <div className="border-b border-slate-100 pb-1.5">
          <p className="font-bold text-content-primary">{formattedDate}</p>
          <p className="text-[11px] text-amber-700 font-semibold">{data.nama_kandang}</p>
        </div>

        <div className="space-y-1 text-content-secondary">
          <div className="flex items-center justify-between">
            <span className="text-content-muted">Telur Normal:</span>
            <span className="font-bold text-emerald-700">
              {data.jumlah_butir_normal.toLocaleString('id-ID')} butir
            </span>
          </div>

          {(data.jumlah_butir_retak > 0 || data.jumlah_butir_pecah > 0) && (
            <div className="flex items-center justify-between text-amber-700 font-medium">
              <span className="text-content-muted">Retak / Pecah:</span>
              <span>
                {(data.jumlah_butir_retak + data.jumlah_butir_pecah).toLocaleString('id-ID')} butir
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-content-muted">Populasi Ayam:</span>
            <span className="font-medium text-content-primary">
              {data.populasi_ayam.toLocaleString('id-ID')} ekor
            </span>
          </div>

          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-content-muted font-medium">Hen Day Production:</span>
            <span className={`px-2 py-0.5 rounded-full border font-bold text-xs ${hdpColor}`}>
              {hdp}%
            </span>
          </div>

          {isAnomaly && (
            <div className="pt-1 flex items-start gap-1.5 text-[11px] text-orange-800 font-medium leading-tight bg-orange-50 p-1.5 rounded-lg border border-orange-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-orange-600 mt-0.5" />
              <span>Anomali: HDP &gt; 100% (Melebihi Kapasitas Biologis 1 butir/ekor)</span>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

export function ProduksiChart({ analyticsData, loading }) {
  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-white border border-border-subtle flex flex-col items-center justify-center min-h-[300px] text-content-muted shadow-xs">
        <Activity className="w-8 h-8 animate-pulse text-amber-500 mb-2" />
        <p className="text-xs font-medium">Memuat visualisasi grafik performa...</p>
      </div>
    )
  }

  if (!analyticsData || !analyticsData.data_points || analyticsData.data_points.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-dashed border-border-subtle text-center min-h-[220px] flex flex-col items-center justify-center shadow-xs">
        <TrendingUp className="w-10 h-10 text-slate-400 mb-2" />
        <p className="text-sm font-bold text-content-primary">Belum Ada Data Tren Performa</p>
        <p className="text-xs text-content-secondary mt-1 max-w-sm">
          Pilih filter kandang atau rentang tanggal yang memuat catatan produksi untuk menampilkan grafik HDP.
        </p>
      </div>
    )
  }

  const { data_points, summary } = analyticsData

  // Format data for chart
  const chartData = data_points.map((dp) => {
    const d = new Date(dp.tanggal)
    return {
      ...dp,
      displayDate: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    }
  })

  const avgHdp = summary.rata_rata_hdp
  const avgColor =
    avgHdp > 100
      ? 'text-orange-700 bg-orange-50 border-orange-300'
      : avgHdp >= 85
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : avgHdp >= 70
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-rose-700 bg-rose-50 border-rose-200'

  return (
    <div className="p-5 rounded-2xl bg-white border border-border-subtle shadow-xs space-y-5">
      {/* Analytics Summary Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-content-primary text-base tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand" />
              Grafik Tren Performa Hen Day Production (HDP%)
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-muted text-content-secondary border border-border-subtle">
              {chartData.length} Titik Data
            </span>
          </div>
          <p className="text-[11px] text-content-secondary mt-0.5">
            Kombinasi garis rasio HDP (%) terhadap kuantitas panen telur normal per hari.
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex flex-wrap items-center gap-3">
          {summary.total_anomali_hdp > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-800 font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
              <span>{summary.total_anomali_hdp} Hari Anomali (&gt;100%)</span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-muted border border-border-subtle text-xs">
            <span className="text-content-secondary font-medium">Rata-rata HDP:</span>
            <span className={`px-2 py-0.5 rounded-full font-bold border ${avgColor}`}>
              {avgHdp}%
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-muted border border-border-subtle text-xs">
            <span className="text-content-secondary font-medium">Rasio Rusak:</span>
            <span
              className={`font-bold ${
                summary.persentase_telur_abnormal > 5 ? 'text-rose-600' : 'text-content-primary'
              }`}
            >
              {summary.persentase_telur_abnormal}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart Visual Multi-Axis */}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="displayDate"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            {/* Left Y Axis: HDP Percentage */}
            <YAxis
              yAxisId="hdp"
              stroke="#d97706"
              fontSize={11}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            {/* Right Y Axis: Egg Count */}
            <YAxis
              yAxisId="butir"
              orientation="right"
              stroke="#059669"
              fontSize={11}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />

            <Tooltip content={<CustomChartTooltip />} />

            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              formatter={(value) => {
                if (value === 'hdp_percentage') return 'Hen Day Production (HDP%)'
                if (value === 'jumlah_butir_normal') return 'Kuantitas Butir Telur Normal'
                return value
              }}
            />

            {/* Standard Layer Benchmark Line (85% Target) */}
            <ReferenceLine
              yAxisId="hdp"
              y={85}
              label={{
                value: 'Standar Target 85%',
                fill: '#059669',
                fontSize: 10,
                position: 'insideTopRight',
              }}
              stroke="#059669"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />

            {/* Normal Eggs (Bar) on Right Y Axis */}
            <Bar
              yAxisId="butir"
              dataKey="jumlah_butir_normal"
              fill="#10b981"
              opacity={0.45}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />

            {/* HDP% (Line) on Left Y Axis */}
            <Line
              yAxisId="hdp"
              type="monotone"
              dataKey="hdp_percentage"
              stroke="#d97706"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#d97706', stroke: '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: '#b45309', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Benchmark & Anomaly Indicator Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle text-[11px] text-content-secondary">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Optimal (&ge; 85%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Sedang (70 - 84.9%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>Kritis (&lt; 70%)</span>
          </span>
          <span className="flex items-center gap-1.5 text-orange-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            <span>Anomali (&gt; 100%)</span>
          </span>
        </div>
        <span className="text-[10px] text-content-muted">
          *HDP &gt; 100% menandakan anomali input (1 ekor ayam maksimal menghasilkan 1 butir/hari)
        </span>
      </div>
    </div>
  )
}

export default ProduksiChart
