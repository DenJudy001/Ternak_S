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

// Custom Glassmorphic Tooltip
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
    const hdpColor =
      hdp >= 85
        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
        : hdp >= 70
        ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
        : 'text-rose-400 border-rose-500/30 bg-rose-500/10'

    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[200px]">
        <div className="border-b border-slate-800 pb-1.5">
          <p className="font-semibold text-white">{formattedDate}</p>
          <p className="text-[11px] text-amber-400 font-medium">{data.nama_kandang}</p>
        </div>

        <div className="space-y-1 text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Telur Normal:</span>
            <span className="font-semibold text-emerald-400">
              {data.jumlah_butir_normal.toLocaleString('id-ID')} butir
            </span>
          </div>

          {(data.jumlah_butir_retak > 0 || data.jumlah_butir_pecah > 0) && (
            <div className="flex items-center justify-between text-amber-300">
              <span className="text-slate-400">Retak / Pecah:</span>
              <span>
                {(data.jumlah_butir_retak + data.jumlah_butir_pecah).toLocaleString('id-ID')} butir
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Populasi Ayam:</span>
            <span className="font-medium text-white">
              {data.populasi_ayam.toLocaleString('id-ID')} ekor
            </span>
          </div>

          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Hen Day Production:</span>
            <span className={`px-2 py-0.5 rounded-full border font-bold text-xs ${hdpColor}`}>
              {hdp}%
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function ProduksiChart({ analyticsData, loading }) {
  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center min-h-[300px] text-slate-400">
        <Activity className="w-8 h-8 animate-pulse text-amber-500 mb-2" />
        <p className="text-xs font-medium">Memuat visualisasi grafik performa...</p>
      </div>
    )
  }

  if (!analyticsData || !analyticsData.data_points || analyticsData.data_points.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center min-h-[220px] flex flex-col items-center justify-center">
        <TrendingUp className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-sm font-semibold text-slate-300">Belum Ada Data Tren Performa</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
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
    avgHdp >= 85
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : avgHdp >= 70
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      : 'text-rose-400 bg-rose-500/10 border-rose-500/20'

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
      {/* Analytics Summary Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Grafik Tren Performa Hen Day Production (HDP%)
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {chartData.length} Titik Data
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Kombinasi garis rasio HDP (%) terhadap kuantitas panen telur normal per hari.
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Rata-rata HDP:</span>
            <span className={`px-2 py-0.5 rounded-full font-bold border ${avgColor}`}>
              {avgHdp}%
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Rasio Rusak:</span>
            <span
              className={`font-bold ${
                summary.persentase_telur_abnormal > 5 ? 'text-rose-400' : 'text-slate-200'
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
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis
              dataKey="displayDate"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
            />
            {/* Left Y Axis: HDP Percentage (0 - 100%) */}
            <YAxis
              yAxisId="hdp"
              domain={[0, 100]}
              stroke="#f59e0b"
              fontSize={11}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
            />
            {/* Right Y Axis: Egg Count */}
            <YAxis
              yAxisId="butir"
              orientation="right"
              stroke="#10b981"
              fontSize={11}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
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
                fill: '#10b981',
                fontSize: 10,
                position: 'insideTopRight',
              }}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />

            {/* Normal Eggs (Bar) on Right Y Axis */}
            <Bar
              yAxisId="butir"
              dataKey="jumlah_butir_normal"
              fill="#10b981"
              opacity={0.35}
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />

            {/* HDP% (Line) on Left Y Axis */}
            <Line
              yAxisId="hdp"
              type="monotone"
              dataKey="hdp_percentage"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 4, fill: '#f59e0b', stroke: '#0f172a', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Benchmark Indicator Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
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
        </div>
        <span className="text-[10px] text-slate-500">
          *Standar acuan petelur komersial layer masa puncak produksi
        </span>
      </div>
    </div>
  )
}

export default ProduksiChart
