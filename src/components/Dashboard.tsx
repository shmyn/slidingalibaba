import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { auth, db } from '../firebase';
import { collectionGroup, getDocs, query, collection } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { puzzles } from '../data/puzzles';
import { LayoutDashboard, Users, Trophy, AlertTriangle, Clock, ArrowLeft, Filter, SortAsc, SortDesc } from 'lucide-react';

interface RunData {
  uid: string;
  chapterId: number;
  stageId: number;
  status: 'completed' | 'failed_time' | 'skipped' | 'abandoned' | 'restarted';
  durationMs?: number;
  firstMoveTimeMs?: number;
  moveCount: number;
  gridSize: number;
}

interface MetricConfig {
  id: string;
  name: string;
  color: string;
  type: 'bar' | 'line';
  yAxisId: 'left' | 'right';
}

const METRICS: MetricConfig[] = [
  { id: 'avgClearTime', name: 'Avg Clear Time (s)', color: '#10b981', type: 'bar', yAxisId: 'left' },
  { id: 'timeLimit', name: 'Time Limit (s)', color: '#ef4444', type: 'bar', yAxisId: 'left' },
  { id: 'successRate', name: 'Success Rate (%)', color: '#f59e0b', type: 'line', yAxisId: 'right' },
  { id: 'abandonRate', name: 'Abandon/Skip Rate (%)', color: '#8b5cf6', type: 'line', yAxisId: 'right' },
  { id: 'avgFirstMove', name: 'Avg First Move (s)', color: '#3b82f6', type: 'line', yAxisId: 'left' },
];

export const Dashboard: React.FC = () => {
  const { setScreen } = useAppStore();
  const [runs, setRuns] = useState<RunData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapterFilter, setChapterFilter] = useState<number | 'all'>('all');
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'top' | 'bottom'>('all');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['avgClearTime', 'timeLimit', 'successRate']);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const runsSnap = await getDocs(collectionGroup(db, 'runs'));
        const runsData = runsSnap.docs.map(doc => doc.data() as RunData);
        setRuns(runsData);
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredRuns = useMemo(() => {
    let result = [...runs];
    
    // Chapter Filter
    if (chapterFilter !== 'all') {
      result = result.filter(r => r.chapterId === chapterFilter);
    }

    // User Segment Filter
    if (segmentFilter !== 'all') {
      const userStatsMap: Record<string, { completed: number; totalMoves: number }> = {};
      runs.forEach(r => {
        if (!userStatsMap[r.uid]) userStatsMap[r.uid] = { completed: 0, totalMoves: 0 };
        if (r.status === 'completed') {
          userStatsMap[r.uid].completed += 1;
          userStatsMap[r.uid].totalMoves += r.moveCount;
        }
      });

      const userList = Object.entries(userStatsMap).map(([uid, stats]) => ({
        uid,
        score: stats.completed // Simple score: total stages completed
      })).sort((a, b) => b.score - a.score);

      const topCount = Math.ceil(userList.length * 0.3);
      const bottomCount = Math.ceil(userList.length * 0.3);

      if (segmentFilter === 'top') {
        const topUids = new Set(userList.slice(0, topCount).map(u => u.uid));
        result = result.filter(r => topUids.has(r.uid));
      } else if (segmentFilter === 'bottom') {
        const bottomUids = new Set(userList.slice(-bottomCount).map(u => u.uid));
        result = result.filter(r => bottomUids.has(r.uid));
      }
    }

    return result;
  }, [runs, chapterFilter, segmentFilter]);

  const stats = useMemo(() => {
    if (filteredRuns.length === 0) return null;

    const total = filteredRuns.length;
    const completed = filteredRuns.filter(r => r.status === 'completed').length;
    const failed = filteredRuns.filter(r => r.status === 'failed_time').length;
    const skipped = filteredRuns.filter(r => r.status === 'skipped').length;
    const abandoned = filteredRuns.filter(r => r.status === 'abandoned').length;
    const restarted = filteredRuns.filter(r => r.status === 'restarted').length;

    const avgFirstMove = filteredRuns.reduce((acc, r) => acc + (r.firstMoveTimeMs || 0), 0) / total;
    const avgClearTime = filteredRuns.filter(r => r.status === 'completed').reduce((acc, r) => acc + (r.durationMs || 0), 0) / (completed || 1);

    // Difficulty Analysis (by Stage)
    const stageStats: Record<string, { 
      total: number; 
      completed: number; 
      totalClearTime: number; 
      timeLimit: number;
      totalFirstMove: number;
      abandonedOrSkipped: number;
    }> = {};

    filteredRuns.forEach(r => {
      const key = `C${r.chapterId}S${r.stageId}`;
      if (!stageStats[key]) {
        const p = puzzles.find(p => p.chapter === r.chapterId && p.stage === r.stageId);
        stageStats[key] = { 
          total: 0, 
          completed: 0, 
          totalClearTime: 0, 
          timeLimit: (p?.timeLimit || 0) * 1000,
          totalFirstMove: 0,
          abandonedOrSkipped: 0
        };
      }
      stageStats[key].total += 1;
      stageStats[key].totalFirstMove += (r.firstMoveTimeMs || 0);
      
      if (r.status === 'completed') {
        stageStats[key].completed += 1;
        stageStats[key].totalClearTime += (r.durationMs || 0);
      } else if (['skipped', 'abandoned', 'restarted'].includes(r.status)) {
        stageStats[key].abandonedOrSkipped += 1;
      }
    });

    const difficultyData = Object.entries(stageStats).map(([key, s]) => {
      const chapter = parseInt(key.match(/C(\d+)/)?.[1] || '0');
      const stage = parseInt(key.match(/S(\d+)/)?.[1] || '0');
      return {
        name: key,
        chapter,
        stage,
        avgClearTime: Math.round(s.totalClearTime / (s.completed || 1) / 1000),
        timeLimit: Math.round(s.timeLimit / 1000),
        successRate: Math.round((s.completed / s.total) * 100),
        abandonRate: Math.round((s.abandonedOrSkipped / s.total) * 100),
        avgFirstMove: Math.round(s.totalFirstMove / s.total / 1000 * 10) / 10
      };
    });

    // Apply Sorting
    difficultyData.sort((a, b) => {
      let valA: any = a[sortKey as keyof typeof a];
      let valB: any = b[sortKey as keyof typeof b];

      if (sortKey === 'name') {
        // Special handling for stage order
        if (a.chapter !== b.chapter) return sortOrder === 'asc' ? a.chapter - b.chapter : b.chapter - a.chapter;
        return sortOrder === 'asc' ? a.stage - b.stage : b.stage - a.stage;
      }

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

    return {
      total,
      completed,
      failed,
      skipped,
      abandoned,
      restarted,
      avgFirstMove: Math.round(avgFirstMove / 1000 * 10) / 10,
      avgClearTime: Math.round(avgClearTime / 1000 * 10) / 10,
      difficultyData,
      statusData: [
        { name: 'Success', value: completed, color: '#10b981' },
        { name: 'Time Out', value: failed, color: '#ef4444' },
        { name: 'Skipped', value: skipped, color: '#f59e0b' },
        { name: 'Abandoned', value: abandoned, color: '#6b7280' },
        { name: 'Restarted', value: restarted, color: '#8b5cf6' }
      ]
    };
  }, [filteredRuns, sortKey, sortOrder]);

  const toggleMetric = (id: string) => {
    setSelectedMetrics(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setScreen('title')}
              className="p-2 hover:bg-stone-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-serif font-bold text-amber-500 flex items-center gap-2">
                <LayoutDashboard className="w-8 h-8" />
                Admin Analytics
              </h1>
              <p className="text-stone-400 text-sm">Real-time player behavior & difficulty monitoring</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 bg-stone-900 p-2 rounded-xl border border-stone-800">
            <div className="flex items-center gap-2 px-3 border-r border-stone-800">
              <Filter className="w-4 h-4 text-stone-500" />
              <select 
                value={chapterFilter} 
                onChange={(e) => setChapterFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-transparent text-sm focus:outline-none cursor-pointer"
              >
                <option value="all">All Chapters</option>
                <option value="1">Chapter 1</option>
                <option value="2">Chapter 2</option>
                <option value="3">Chapter 3</option>
              </select>
            </div>
            <div className="flex items-center gap-2 px-3">
              <Users className="w-4 h-4 text-stone-500" />
              <select 
                value={segmentFilter} 
                onChange={(e) => setSegmentFilter(e.target.value as any)}
                className="bg-transparent text-sm focus:outline-none cursor-pointer"
              >
                <option value="all">All Players</option>
                <option value="top">Top 30% (Experts)</option>
                <option value="bottom">Bottom 30% (Struggling)</option>
              </select>
            </div>
          </div>
        </header>

        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              icon={<Trophy className="text-emerald-500" />} 
              label="Success Rate" 
              value={`${Math.round((stats.completed / stats.total) * 100)}%`} 
              subValue={`${stats.completed} / ${stats.total} runs`}
            />
            <StatCard 
              icon={<Clock className="text-amber-500" />} 
              label="Avg. First Move" 
              value={`${stats.avgFirstMove}s`} 
              subValue="Initial hesitation time"
            />
            <StatCard 
              icon={<AlertTriangle className="text-rose-500" />} 
              label="Abandonment Rate" 
              value={`${Math.round(((stats.skipped + stats.abandoned + stats.restarted) / stats.total) * 100)}%`} 
              subValue={`${stats.skipped + stats.abandoned + stats.restarted} players left`}
            />
            <StatCard 
              icon={<Clock className="text-blue-500" />} 
              label="Avg. Clear Time" 
              value={`${stats.avgClearTime}s`} 
              subValue="Successful runs only"
            />
          </div>
        ) : (
          <div className="bg-stone-900 p-12 rounded-2xl border border-stone-800 text-center">
            <p className="text-stone-400">No data available for the selected filters.</p>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Run Status Breakdown */}
            <div className="bg-stone-900 p-6 rounded-2xl border border-stone-800 shadow-xl">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Run Outcomes
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #444', borderRadius: '8px' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Difficulty Analysis */}
            <div className="lg:col-span-2 bg-stone-900 p-6 rounded-2xl border border-stone-800 shadow-xl">
              <div className="flex flex-col space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Stage-by-Stage Analysis
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {METRICS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => toggleMetric(m.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                          selectedMetrics.includes(m.id) 
                            ? 'bg-stone-100 text-stone-900 border-stone-100' 
                            : 'bg-stone-800 text-stone-400 border-stone-700 hover:border-stone-500'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-stone-950/50 p-3 rounded-xl border border-stone-800/50">
                  <div className="flex items-center gap-2 text-sm text-stone-400">
                    <SortAsc className="w-4 h-4" />
                    <span>Sort by:</span>
                  </div>
                  <select 
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="bg-transparent text-sm focus:outline-none cursor-pointer text-stone-200"
                  >
                    <option value="name">Stage Order</option>
                    <option value="avgClearTime">Clear Time</option>
                    <option value="successRate">Success Rate</option>
                    <option value="abandonRate">Abandon Rate</option>
                    <option value="avgFirstMove">First Move Time</option>
                  </select>
                  <button 
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 hover:bg-stone-800 rounded-lg transition-colors text-stone-400 hover:text-stone-100"
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="h-80 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.difficultyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#888" fontSize={12} label={{ value: 'Seconds', angle: -90, position: 'insideLeft', fill: '#888' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} label={{ value: 'Percentage (%)', angle: 90, position: 'insideRight', fill: '#888' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #444', borderRadius: '8px' }}
                    />
                    <Legend />
                    {METRICS.filter(m => selectedMetrics.includes(m.id)).map(m => (
                      m.type === 'bar' ? (
                        <Bar key={m.id} yAxisId={m.yAxisId} dataKey={m.id} name={m.name} fill={m.color} radius={[4, 4, 0, 0]} opacity={m.id === 'timeLimit' ? 0.5 : 1} />
                      ) : (
                        <Line key={m.id} yAxisId={m.yAxisId} type="monotone" dataKey={m.id} name={m.name} stroke={m.color} strokeWidth={3} dot={{ r: 4 }} />
                      )
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; subValue: string }> = ({ icon, label, value, subValue }) => (
  <div className="bg-stone-900 p-6 rounded-2xl border border-stone-800 shadow-lg hover:border-stone-700 transition-all">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-stone-800 rounded-lg">
        {icon}
      </div>
      <span className="text-stone-400 text-sm font-medium">{label}</span>
    </div>
    <div className="text-3xl font-bold mb-1">{value}</div>
    <div className="text-stone-500 text-xs">{subValue}</div>
  </div>
);
