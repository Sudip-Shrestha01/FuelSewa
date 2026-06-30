import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBrain, faRotate, faChartLine, faTable,
  faImage, faList, faCircleCheck, faTriangleExclamation,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import StatCard from "../components/ui/StatCard";
import PageLoader from "../components/ui/PageLoader";
import Badge from "../components/ui/Badge";

interface Metrics {
  f1_score: number;
  confusion_matrix: number[][];
  classification_report: Record<string, any>;
  heatmap: string;
  feature_importance: string;
  feature_importance_data: [string, number][];
  n_samples: number;
  n_cancelled: number;
  new_samples: number;
}

interface TrainingStats {
  new_samples: number;
  auto_retrain_threshold: number;
  model_trained: boolean;
}

export default function CancellationPredictionPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [trainingStats, setTrainingStats] = useState<TrainingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [metricsRes, statsRes] = await Promise.all([
        api.get("/prediction/metrics"),
        api.get("/prediction/training-stats"),
      ]);
      setMetrics(metricsRes.data.data);
      setTrainingStats(statsRes.data.data);
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

  useEffect(() => {
    fetchAll();
  }, []);

  const handleTrain = async () => {
    setTraining(true);
    setError("");
    try {
      const res = await api.post("/prediction/train");
      setMetrics(res.data.data);
    } catch (e: any) {
      setError(e.response?.data?.message || "Training failed");
    } finally {
      setTraining(false);
    }
  };

  if (loading) return <PageLoader message="Loading AI model metrics..." />;

  const cancelled = metrics?.classification_report?.cancelled || {};
  const delivered = metrics?.classification_report?.delivered || {};
  const accuracy = metrics?.classification_report?.accuracy;

  const riskColor = (val: number) => {
    if (val < 0.2) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (val < 0.4) return "text-amber-600 bg-amber-50 border-amber-200";
    if (val < 0.6) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">AI Predictions</h1>
          <p className="text-sm text-surface-400 mt-1">Order Cancellation Prediction — Random Forest</p>
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

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          {error}
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

            {/* Heatmap */}
            <div className="bg-white border border-surface-200/80 rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faImage} className="text-surface-400 text-sm" />
                <h2 className="text-sm font-semibold text-surface-800">Heatmap</h2>
              </div>
              {metrics.heatmap && (
                <img
                  src={`data:image/png;base64,${metrics.heatmap}`}
                  alt="Confusion Matrix Heatmap"
                  className="w-full rounded-lg border border-surface-100"
                />
              )}
            </div>
          </div>

          {/* Feature Importance */}
          {metrics.feature_importance && (
            <div className="bg-white border border-surface-200/80 rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faList} className="text-surface-400 text-sm" />
                <h2 className="text-sm font-semibold text-surface-800">Feature Importance</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <img
                  src={`data:image/png;base64,${metrics.feature_importance}`}
                  alt="Feature Importance"
                  className="w-full rounded-lg border border-surface-100"
                />
                <div className="space-y-2">
                  {metrics.feature_importance_data
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, imp]) => (
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
            </div>
          )}

          {/* Dataset Info */}
          <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
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
