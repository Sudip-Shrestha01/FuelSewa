import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBrain, faRotate, faChartLine, faTable,
  faList, faCircleCheck, faTriangleExclamation,
  faPlus, faArrowRotateRight, faChartPie, faChartSimple,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import api from "../api/axios";
import StatCard from "../components/ui/StatCard";
import PageLoader from "../components/ui/PageLoader";

interface Metrics {
  f1_score: number;
  accuracy: number;
  confusion_matrix: number[][];
  classification_report: Record<string, any>;
  feature_importance_data: [string, number][];
  n_samples: number;
  n_cancelled: number;
  new_samples: number;
  trained_at: string;
}

interface TrainingStats {
  new_samples: number;
  auto_retrain_threshold: number;
  model_trained: boolean;
}

interface HighRiskOrder {
  _id: string;
  customerName: string;
  fuelType: string;
  quantity: number;
  totalPrice: number;
  distance_km: number;
  createdAt: string;
  probability: number;
  riskTag: string;
}

interface HistoryEntry {
  f1_score: number;
  accuracy: number;
  n_samples: number;
  n_cancelled: number;
  trained_at: string;
}

const riskColor = (val: number) => {
  if (val < 0.2) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (val < 0.4) return "text-amber-600 bg-amber-50 border-amber-200";
  if (val < 0.6) return "text-orange-600 bg-orange-50 border-orange-200";
  return "text-red-600 bg-red-50 border-red-200";
};

const riskDot = (val: number) => {
  if (val < 0.2) return "bg-emerald-500";
  if (val < 0.4) return "bg-amber-500";
  if (val < 0.6) return "bg-orange-500";
  return "bg-red-500";
};

const COLORS_DONUT = ["#10b981", "#ef4444"];
const COLORS_CHART = { f1: "#10b981", accuracy: "#3b82f6" };

export default function CancellationPredictionPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [trainingStats, setTrainingStats] = useState<TrainingStats | null>(null);
  const [highRiskOrders, setHighRiskOrders] = useState<HighRiskOrder[]>([]);
  const [trainingHistory, setTrainingHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (successMsg) t = setTimeout(() => setSuccessMsg(""), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [metricsRes, statsRes, riskRes, historyRes] = await Promise.all([
        api.get("/prediction/metrics"),
        api.get("/prediction/training-stats"),
        api.get("/prediction/high-risk-orders"),
        api.get("/prediction/training-history"),
      ]);
      setMetrics(metricsRes.data.data);
      setTrainingStats(statsRes.data.data);
      setHighRiskOrders(riskRes.data.data ?? []);
      setTrainingHistory(historyRes.data.data ?? []);
    } catch (e: any) {
      if (e.response?.status === 503) {
        setError("ML service is not running. Start the Python service first.");
      } else {
        setError("Failed to load metrics. Make sure the ML service is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleTrain = async () => {
    setTraining(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.post("/prediction/train");
      setMetrics(res.data.data);
      setSuccessMsg("Model retrained successfully!");
      const [riskRes, historyRes] = await Promise.all([
        api.get("/prediction/high-risk-orders"),
        api.get("/prediction/training-history"),
      ]);
      setHighRiskOrders(riskRes.data.data ?? []);
      setTrainingHistory(historyRes.data.data ?? []);
    } catch (e: any) {
      setError(e.response?.data?.message || "Training failed");
    } finally {
      setTraining(false);
    }
  };

  if (loading) return <PageLoader message="Loading AI model metrics..." />;

  const cancelled = metrics?.classification_report?.cancelled || {};
  const accuracy = metrics?.accuracy ?? metrics?.classification_report?.accuracy;

  const trainedDate = metrics?.trained_at
    ? new Date(metrics.trained_at).toLocaleString()
    : null;

  const donutData = metrics
    ? [
        { name: "Delivered", value: metrics.n_samples - metrics.n_cancelled },
        { name: "Cancelled", value: metrics.n_cancelled },
      ]
    : [];

  const sortedImportance = metrics?.feature_importance_data
    ? [...metrics.feature_importance_data].sort((a, b) => b[1] - a[1])
    : [];

  const historyChartData = trainingHistory.map((h) => ({
    label: new Date(h.trained_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    F1: h.f1_score,
    Accuracy: h.accuracy,
  }));

  const emptyState = !metrics && !error;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">AI Predictions</h1>
          <p className="text-sm text-surface-400 mt-1">Order Cancellation Prediction — Random Forest</p>
          {trainedDate && (
            <p className="text-xs text-surface-400 mt-1.5 flex items-center gap-1.5">
              <FontAwesomeIcon icon={faClock} className="text-[10px]" />
              Last trained: {trainedDate}
            </p>
          )}
        </div>
        <button
          onClick={handleTrain}
          disabled={training}
          className="flex items-center gap-2 px-5 py-2.5 bg-surface-900 hover:bg-surface-800 text-white font-medium rounded-xl transition-all duration-200 text-sm disabled:opacity-50 active:scale-[0.98]"
        >
          <FontAwesomeIcon icon={training ? faRotate : faBrain} className={training ? "animate-spin" : ""} />
          {training ? "Training..." : "Retrain Model"}
        </button>
      </div>

      {/* Success feedback */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
          <FontAwesomeIcon icon={faCircleCheck} />
          {successMsg}
        </div>
      )}

      {/* Error banner with retry */}
      {error && (
        <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            {error}
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors text-xs font-medium"
          >
            <FontAwesomeIcon icon={faArrowRotateRight} />
            Retry
          </button>
        </div>
      )}

      {/* Empty / first-run state */}
      {emptyState && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <FontAwesomeIcon icon={faBrain} className="text-surface-400 text-2xl" />
          </div>
          <h2 className="text-lg font-semibold text-surface-800 mb-1">Model Not Trained Yet</h2>
          <p className="text-sm text-surface-400 max-w-md mb-6">
            No cancellation prediction model exists. Train your first model to start monitoring order risks and model performance.
          </p>
          <button
            onClick={handleTrain}
            disabled={training}
            className="flex items-center gap-2 px-6 py-3 bg-surface-900 hover:bg-surface-800 text-white font-medium rounded-xl transition-all duration-200 text-sm disabled:opacity-50"
          >
            <FontAwesomeIcon icon={training ? faRotate : faBrain} className={training ? "animate-spin" : ""} />
            {training ? "Training..." : "Train Your First Model"}
          </button>
        </div>
      )}

      {metrics && (
        <>
          {/* F1 Score + Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="F1 Score (Cancelled)"
              value={(cancelled["f1-score"] || 0).toFixed(4)}
              icon={faChartLine}
              variant="emerald"
            />
            <StatCard
              label="Precision"
              value={(cancelled["precision"] || 0).toFixed(4)}
              icon={faCircleCheck}
              variant="blue"
            />
            <StatCard
              label="Recall"
              value={(cancelled["recall"] || 0).toFixed(4)}
              icon={faList}
              variant="violet"
            />
            <StatCard
              label="Accuracy"
              value={(accuracy || 0).toFixed(4)}
              icon={faChartLine}
              variant="slate"
            />
          </div>

          {/* Class Distribution Donut */}
          <div className="bg-white border border-surface-200/80 rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faChartPie} className="text-surface-400 text-sm" />
              <h2 className="text-sm font-semibold text-surface-800">Class Distribution</h2>
            </div>
            <div className="flex items-center justify-center gap-8">
              <ResponsiveContainer width={200} height={180}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={COLORS_DONUT[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {donutData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS_DONUT[i] }} />
                    <span className="text-sm text-surface-600">
                      {d.name}: <strong className="text-surface-800">{d.value.toLocaleString()}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Auto-retrain Status */}
          {trainingStats && (
            <div className="bg-white border border-surface-200/80 rounded-xl p-5 shadow-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <FontAwesomeIcon icon={faPlus} className="text-primary-500 text-lg" />
                <div>
                  <p className="text-sm font-semibold text-surface-800">Auto-Retrain Active</p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    Model auto-retrains after <strong>{trainingStats.auto_retrain_threshold}</strong> new order outcomes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-surface-800">{trainingStats.new_samples}</p>
                  <p className="text-[10px] text-surface-400 uppercase tracking-wider">Pending samples</p>
                </div>
                <div className="w-24 bg-surface-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500"
                    style={{ width: `${Math.min(100, (trainingStats.new_samples / trainingStats.auto_retrain_threshold) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* High-Risk Orders List */}
          <div className="bg-white border border-surface-200/80 rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faTriangleExclamation} className="text-surface-400 text-sm" />
                <h2 className="text-sm font-semibold text-surface-800">High-Risk Pending Orders</h2>
              </div>
              {highRiskOrders.length > 0 && (
                <span className="text-xs text-surface-400">
                  Sorted by risk &middot; {highRiskOrders.length} pending
                </span>
              )}
            </div>
            {highRiskOrders.length === 0 ? (
              <p className="text-sm text-surface-400 py-4 text-center">No pending orders to evaluate.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-100">
                      <th className="text-left text-xs text-surface-400 font-medium pb-2 pr-3">Customer</th>
                      <th className="text-left text-xs text-surface-400 font-medium pb-2 pr-3">Fuel</th>
                      <th className="text-right text-xs text-surface-400 font-medium pb-2 pr-3">Qty</th>
                      <th className="text-right text-xs text-surface-400 font-medium pb-2 pr-3">Amount</th>
                      <th className="text-right text-xs text-surface-400 font-medium pb-2 pr-3">Risk</th>
                      <th className="text-right text-xs text-surface-400 font-medium pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRiskOrders.slice(0, 20).map((order) => {
                      const probNorm = order.probability / 100;
                      return (
                        <tr key={order._id} className="border-b border-surface-50 hover:bg-surface-25 transition-colors">
                          <td className="py-2.5 pr-3">
                            <span className="font-medium text-surface-800 text-[13px]">{order.customerName}</span>
                          </td>
                          <td className="py-2.5 pr-3 text-surface-600 capitalize">{order.fuelType}</td>
                          <td className="py-2.5 pr-3 text-right text-surface-600">{order.quantity}L</td>
                          <td className="py-2.5 pr-3 text-right font-medium text-surface-800">
                            NPR {order.totalPrice.toLocaleString()}
                          </td>
                          <td className="py-2.5 pr-3 text-right">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border ${riskColor(probNorm)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${riskDot(probNorm)}`} />
                              {order.probability}%
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <span className="text-xs text-surface-400 capitalize bg-surface-50 px-2 py-0.5 rounded-md">
                              {order.riskTag}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {highRiskOrders.length > 20 && (
                  <p className="text-xs text-surface-400 text-center mt-3">
                    Showing top 20 of {highRiskOrders.length} orders
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confusion Matrix */}
            <div className="bg-white border border-surface-200/80 rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faTable} className="text-surface-400 text-sm" />
                <h2 className="text-sm font-semibold text-surface-800">Confusion Matrix</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-surface-400 text-xs font-medium"></th>
                      <th className="p-2 text-surface-700 text-xs font-semibold text-center bg-surface-50 border border-surface-200 rounded-tl-lg">
                        Predicted<br />Delivered
                      </th>
                      <th className="p-2 text-surface-700 text-xs font-semibold text-center bg-surface-50 border border-surface-200 rounded-tr-lg">
                        Predicted<br />Cancelled
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 text-surface-700 text-xs font-semibold text-right bg-surface-50 border border-surface-200">
                        Actual<br />Delivered
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-700 bg-emerald-50/50 border border-surface-200">
                        {metrics.confusion_matrix[0]?.[0] ?? "-"}
                      </td>
                      <td className="p-4 text-center font-bold text-red-700 bg-red-50/50 border border-surface-200">
                        {metrics.confusion_matrix[0]?.[1] ?? "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-surface-700 text-xs font-semibold text-right bg-surface-50 border border-surface-200">
                        Actual<br />Cancelled
                      </td>
                      <td className="p-4 text-center font-bold text-red-700 bg-red-50/50 border border-surface-200">
                        {metrics.confusion_matrix[1]?.[0] ?? "-"}
                      </td>
                      <td className="p-4 text-center font-bold text-emerald-700 bg-emerald-50/50 border border-surface-200">
                        {metrics.confusion_matrix[1]?.[1] ?? "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-surface-500">
                <div className="bg-surface-50 rounded-lg p-3">
                  <span className="font-semibold text-surface-700">True Negatives:</span> {metrics.confusion_matrix[0]?.[0]} correct non-cancellations
                </div>
                <div className="bg-surface-50 rounded-lg p-3">
                  <span className="font-semibold text-surface-700">False Positives:</span> {metrics.confusion_matrix[0]?.[1]} falsely flagged
                </div>
                <div className="bg-surface-50 rounded-lg p-3">
                  <span className="font-semibold text-surface-700">False Negatives:</span> {metrics.confusion_matrix[1]?.[0]} missed cancellations
                </div>
                <div className="bg-surface-50 rounded-lg p-3">
                  <span className="font-semibold text-surface-700">True Positives:</span> {metrics.confusion_matrix[1]?.[1]} correct cancellations
                </div>
              </div>
            </div>

            {/* Feature Importance (bar list only) */}
            {sortedImportance.length > 0 && (
              <div className="bg-white border border-surface-200/80 rounded-xl p-6 shadow-card">
                <div className="flex items-center gap-2 mb-4">
                  <FontAwesomeIcon icon={faList} className="text-surface-400 text-sm" />
                  <h2 className="text-sm font-semibold text-surface-800">Feature Importance</h2>
                </div>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {sortedImportance.map(([name, imp]) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-surface-700 w-36 truncate text-right capitalize">
                        {name.replace(/_/g, " ")}
                      </span>
                      <div className="flex-1 bg-surface-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-500"
                          style={{ width: `${imp * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-surface-500 w-12 text-right">
                        {(imp * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Retrain History Trend */}
          {historyChartData.length > 1 && (
            <div className="bg-white border border-surface-200/80 rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faChartSimple} className="text-surface-400 text-sm" />
                <h2 className="text-sm font-semibold text-surface-800">Retrain History</h2>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={historyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v: number) => v.toFixed(2)} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="F1"
                    stroke={COLORS_CHART.f1}
                    strokeWidth={2}
                    dot={{ r: 3, fill: COLORS_CHART.f1 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Accuracy"
                    stroke={COLORS_CHART.accuracy}
                    strokeWidth={2}
                    dot={{ r: 3, fill: COLORS_CHART.accuracy }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Dataset Info */}
          <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-surface-600">
                <span className="font-semibold text-surface-800">{metrics.n_samples}</span> total samples
              </span>
              <span className="text-surface-300">|</span>
              <span className="text-surface-600">
                <span className="font-semibold text-red-600">{metrics.n_cancelled}</span> cancelled
              </span>
              <span className="text-surface-300">|</span>
              <span className="text-surface-600">
                <span className="font-semibold text-emerald-600">{metrics.n_samples - metrics.n_cancelled}</span> delivered
              </span>
              <span className="text-surface-300">|</span>
              <span className="text-surface-600">
                <span className="font-semibold text-primary-600">{metrics.new_samples ?? 0}</span> new live samples
              </span>
              <span className="text-surface-300">|</span>
              <span className="text-xs text-surface-400">80/20 train-test split · auto-retrains at 20</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
