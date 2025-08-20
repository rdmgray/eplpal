import React, { useState, useEffect, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import LoadingSpinner from './LoadingSpinner'
import ErrorMessage from './ErrorMessage'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const OddsHistory = ({ matchId }) => {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedMetric, setSelectedMetric] = useState('back_price')
  const [viewMode, setViewMode] = useState('chart')

  useEffect(() => {
    const fetchOddsHistory = async () => {
      if (!matchId) return
      
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/fixture/${matchId}/odds-history`)
        if (!response.ok) {
          throw new Error('Failed to fetch odds history')
        }
        const data = await response.json()
        setHistory(data)
      } catch (err) {
        setError(`Error loading odds history: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchOddsHistory()
  }, [matchId])

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleString('en-GB', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch (error) {
      return 'Invalid Date'
    }
  }

  const formatOdds = (value) => {
    if (!value || isNaN(value)) return '—'
    return parseFloat(value).toFixed(2)
  }

  const calculateChange = (current, previous) => {
    if (!current || !previous || isNaN(current) || isNaN(previous)) return null
    const change = current - previous
    return change
  }

  const renderChangeArrow = (change) => {
    if (!change || Math.abs(change) < 0.01) return null
    
    if (change > 0) {
      return <span className="odds-change-up">↗ +{Math.abs(change).toFixed(2)}</span>
    } else {
      return <span className="odds-change-down">↘ -{Math.abs(change).toFixed(2)}</span>
    }
  }

  const chartData = useMemo(() => {
    if (!history || !history.history) return null

    return history.history.map((entry, index) => {
      const prevEntry = index > 0 ? history.history[index - 1] : null
      
      return {
        timestamp: entry.timestamp,
        formattedTime: formatTimestamp(entry.timestamp),
        home_win: {
          value: entry.odds.home_win?.[selectedMetric],
          change: prevEntry ? calculateChange(
            entry.odds.home_win?.[selectedMetric], 
            prevEntry.odds.home_win?.[selectedMetric]
          ) : null
        },
        draw: {
          value: entry.odds.draw?.[selectedMetric],
          change: prevEntry ? calculateChange(
            entry.odds.draw?.[selectedMetric], 
            prevEntry.odds.draw?.[selectedMetric]
          ) : null
        },
        away_win: {
          value: entry.odds.away_win?.[selectedMetric],
          change: prevEntry ? calculateChange(
            entry.odds.away_win?.[selectedMetric], 
            prevEntry.odds.away_win?.[selectedMetric]
          ) : null
        }
      }
    })
  }, [history, selectedMetric])

  const lineChartData = useMemo(() => {
    if (!chartData || chartData.length === 0) return null

    const labels = chartData.map(entry => entry.formattedTime)
    
    return {
      labels,
      datasets: [
        {
          label: `${history.home_team?.replace(/ FC$| AFC$/, '')} Win`,
          data: chartData.map(entry => entry.home_win.value),
          borderColor: '#007aff',
          backgroundColor: 'rgba(0, 122, 255, 0.1)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.1,
          fill: false,
        },
        {
          label: 'Draw',
          data: chartData.map(entry => entry.draw.value),
          borderColor: '#ff9500',
          backgroundColor: 'rgba(255, 149, 0, 0.1)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.1,
          fill: false,
        },
        {
          label: `${history.away_team?.replace(/ FC$| AFC$/, '')} Win`,
          data: chartData.map(entry => entry.away_win.value),
          borderColor: '#5856d6',
          backgroundColor: 'rgba(88, 86, 214, 0.1)',
          borderWidth: 3,
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.1,
          fill: false,
        },
      ],
    }
  }, [chartData, history])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: '500',
          },
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${formatOdds(context.parsed.y)}`
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 14,
            weight: '600',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: selectedMetric === 'back_price' ? 'Back Price' :
                selectedMetric === 'lay_price' ? 'Lay Price' : 'Last Traded',
          font: {
            size: 14,
            weight: '600',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          font: {
            size: 12,
          },
          callback: function(value) {
            return formatOdds(value)
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  }

  if (loading) {
    return (
      <div className="odds-history-container">
        <div className="odds-history-header">
          <h3>Odds History</h3>
        </div>
        <div className="odds-history-loading">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="odds-history-container">
        <div className="odds-history-header">
          <h3>Odds History</h3>
        </div>
        <ErrorMessage message={error} />
      </div>
    )
  }

  if (!history || !history.history || history.history.length === 0) {
    return (
      <div className="odds-history-container">
        <div className="odds-history-header">
          <h3>Odds History</h3>
        </div>
        <div className="odds-history-empty">
          <p>No odds history available for this fixture.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="odds-history-container">
      <div className="odds-history-header">
        <h3>Odds History</h3>
        <div className="odds-history-controls">
          <div className="odds-view-selector">
            <button 
              className={viewMode === 'chart' ? 'active' : ''}
              onClick={() => setViewMode('chart')}
            >
              Chart
            </button>
            <button 
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
          </div>
          <div className="odds-metric-selector">
            <button 
              className={selectedMetric === 'back_price' ? 'active' : ''}
              onClick={() => setSelectedMetric('back_price')}
            >
              Back Price
            </button>
            <button 
              className={selectedMetric === 'lay_price' ? 'active' : ''}
              onClick={() => setSelectedMetric('lay_price')}
            >
              Lay Price
            </button>
            <button 
              className={selectedMetric === 'last_traded' ? 'active' : ''}
              onClick={() => setSelectedMetric('last_traded')}
            >
              Last Traded
            </button>
          </div>
        </div>
      </div>

      <div className="odds-history-content">
        {viewMode === 'chart' && lineChartData ? (
          <div className="odds-history-chart-container">
            <Line data={lineChartData} options={chartOptions} height={300} />
          </div>
        ) : viewMode === 'table' ? (
          <div className="odds-history-table">
            <div className="odds-history-table-header">
              <div className="timestamp-col">Time</div>
              <div className="odds-col home-col">
                {history.home_team?.replace(/ FC$| AFC$/, '')} Win
              </div>
              <div className="odds-col draw-col">Draw</div>
              <div className="odds-col away-col">
                {history.away_team?.replace(/ FC$| AFC$/, '')} Win
              </div>
            </div>
            
            {chartData?.map((entry, index) => (
              <div key={index} className="odds-history-row">
                <div className="timestamp-col">
                  {entry.formattedTime}
                </div>
                
                <div className="odds-col home-col">
                  <div className="odds-value">
                    {formatOdds(entry.home_win.value)}
                  </div>
                  {renderChangeArrow(entry.home_win.change)}
                </div>
                
                <div className="odds-col draw-col">
                  <div className="odds-value">
                    {formatOdds(entry.draw.value)}
                  </div>
                  {renderChangeArrow(entry.draw.change)}
                </div>
                
                <div className="odds-col away-col">
                  <div className="odds-value">
                    {formatOdds(entry.away_win.value)}
                  </div>
                  {renderChangeArrow(entry.away_win.change)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="odds-history-empty">
            <p>No chart data available for the selected metric.</p>
          </div>
        )}
      </div>

      <div className="odds-history-summary">
        <div className="odds-summary-item">
          <span className="summary-label">Total Sessions:</span>
          <span className="summary-value">{history.history.length}</span>
        </div>
        <div className="odds-summary-item">
          <span className="summary-label">First Recorded:</span>
          <span className="summary-value">{formatTimestamp(history.history[0]?.timestamp)}</span>
        </div>
        <div className="odds-summary-item">
          <span className="summary-label">Last Updated:</span>
          <span className="summary-value">{formatTimestamp(history.history[history.history.length - 1]?.timestamp)}</span>
        </div>
      </div>
    </div>
  )
}

export default OddsHistory