// AeroSense Dashboard Logic & Chart.js Config

let appData = null;
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', options).toUpperCase();

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const viewId = btn.getAttribute('data-view');
            switchView(viewId);
        });
    });

    fetchTrendsData();

    const predForm = document.getElementById('prediction-form');
    if (predForm) {
        predForm.addEventListener('submit', handlePredictionSubmit);
    }
});

function switchView(viewId) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('data-view') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    const viewTitle = document.getElementById('view-title');

    if (viewId === 'dashboard') {
        viewTitle.innerText = "Overview";
    } else if (viewId === 'trends') {
        viewTitle.innerText = "Analytics";
        setTimeout(() => {
            Object.values(charts).forEach(chart => chart.resize());
        }, 50);
    } else if (viewId === 'predictions') {
        viewTitle.innerText = "Inference Engine";
    }

    const viewPanels = document.querySelectorAll('.view-panel');
    viewPanels.forEach(panel => {
        if (panel.id === `view-${viewId}`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
}

async function fetchTrendsData() {
    try {
        const response = await fetch('/api/trends');
        if (!response.ok) throw new Error("Failed to fetch trends");
        appData = await response.json();
        
        populateSummaryCards(appData.general_stats);
        initializeCharts(appData);
    } catch (err) {
        console.error("Error loading trends:", err);
    }
}

function populateSummaryCards(stats) {
    if (!stats) return;
    document.getElementById('stat-avg-temp').innerText = `${stats.avg_temp.toFixed(1)}°C`;
    document.getElementById('stat-max-temp').innerText = `${stats.max_temp.toFixed(1)}°C`;
    document.getElementById('stat-rain-ratio').innerText = `${(stats.rain_ratio * 100).toFixed(1)}%`;
    document.getElementById('stat-clear-ratio').innerText = `${(stats.clear_days_ratio * 100).toFixed(1)}%`;
}

// Minimal Chart.js styling
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', sans-serif";
const gridColor = '#272a33';

function initializeCharts(data) {
    if (Object.keys(charts).length > 0) {
        Object.values(charts).forEach(c => c.destroy());
        charts = {};
    }

    // Chart 1: Yearly Trend
    const yearlyCtx = document.getElementById('yearlyTempChart').getContext('2d');
    charts.yearly = new Chart(yearlyCtx, {
        type: 'line',
        data: {
            labels: data.yearly_trend.years,
            datasets: [{
                label: 'Average Temperature (°C)',
                data: data.yearly_trend.temps,
                borderColor: '#3b82f6',
                borderWidth: 2,
                pointBackgroundColor: '#0f1115',
                pointBorderColor: '#3b82f6',
                pointHoverRadius: 4,
                tension: 0, // No smooth curves for more technical feel
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: gridColor }, ticks: { font: {family: "'JetBrains Mono', monospace"} } },
                x: { grid: { display: false }, ticks: { font: {family: "'JetBrains Mono', monospace"} } }
            }
        }
    });

    // Chart 2: Monthly Ranges
    const monthlyCtx = document.getElementById('monthlyTempChart').getContext('2d');
    const months = data.monthly_stats.map(item => item.month);
    charts.monthly = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'Min', data: data.monthly_stats.map(i => i.min), backgroundColor: '#3b82f6' },
                { label: 'Avg', data: data.monthly_stats.map(i => i.avg), backgroundColor: '#64748b' },
                { label: 'Max', data: data.monthly_stats.map(i => i.max), backgroundColor: '#ef4444' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: {size: 11} } } },
            scales: {
                y: { grid: { color: gridColor }, ticks: { font: {family: "'JetBrains Mono', monospace"} } },
                x: { grid: { display: false }, ticks: { font: {family: "'JetBrains Mono', monospace"} } }
            },
            elements: { bar: { borderRadius: 0 } } // sharp corners
        }
    });

    // Chart 3: Seasonal Profile (Line chart instead of radar for cleaner read)
    const radarCtx = document.getElementById('seasonalRadarChart').getContext('2d');
    const seasons = Object.keys(data.seasonal_stats);
    const datasets = seasons.map((season, idx) => {
        const s = data.seasonal_stats[season];
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
        return {
            label: season,
            data: [
                ((s.temp + 5) / 35) * 100,
                s.humidity * 100,
                (s.wind_speed / 25) * 100,
                s.rain_prob * 100,
                ((s.pressure - 1000) / 20) * 100
            ],
            borderColor: colors[idx],
            borderWidth: 2,
            backgroundColor: 'transparent',
            pointBackgroundColor: '#0f1115',
            pointBorderColor: colors[idx],
        };
    });

    charts.radar = new Chart(radarCtx, {
        type: 'line',
        data: {
            labels: ['Temp', 'Humidity', 'Wind', 'Rain Prob', 'Pressure'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: {size: 11} } } },
            scales: {
                y: { grid: { color: gridColor }, ticks: { display: false }, min: 0, max: 100 },
                x: { grid: { display: false }, ticks: { font: {family: "'JetBrains Mono', monospace"} } }
            }
        }
    });

    // Chart 4: Monthly Rain Probability
    const rainCtx = document.getElementById('monthlyRainChart').getContext('2d');
    charts.rainTrend = new Chart(rainCtx, {
        type: 'bar',
        data: {
            labels: data.monthly_rain_trend.months,
            datasets: [{
                label: 'Rain Probability (%)',
                data: data.monthly_rain_trend.rain_probs.map(val => val * 100),
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: gridColor }, ticks: { font: {family: "'JetBrains Mono', monospace"} } },
                x: { grid: { display: false }, ticks: { font: {family: "'JetBrains Mono', monospace"} } }
            },
            elements: { bar: { borderRadius: 0 } }
        }
    });
}

async function handlePredictionSubmit(e) {
    e.preventDefault();
    
    const btnPredict = document.getElementById('btn-predict');
    const placeholder = document.getElementById('result-placeholder');
    const details = document.getElementById('result-details');
    
    btnPredict.disabled = true;
    btnPredict.innerText = "Executing...";
    
    const payload = {
        temperature: parseFloat(document.getElementById('temperature').value),
        apparent_temperature: parseFloat(document.getElementById('apparent_temperature').value),
        humidity: parseFloat(document.getElementById('humidity').value),
        pressure: parseFloat(document.getElementById('pressure').value),
        wind_speed: parseFloat(document.getElementById('wind_speed').value),
        visibility: parseFloat(document.getElementById('visibility').value),
        prev_temp_1: parseFloat(document.getElementById('prev_temp_1').value),
        prev_temp_2: parseFloat(document.getElementById('prev_temp_2').value),
        prev_temp_3: parseFloat(document.getElementById('prev_temp_3').value)
    };

    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("API call failed");
        const result = await response.json();
        
        placeholder.classList.add('hidden');
        details.classList.remove('hidden');

        displayPredictionResults(result, payload.temperature);
    } catch (err) {
        console.error("Inference error:", err);
        alert("Execution failed.");
    } finally {
        btnPredict.disabled = false;
        btnPredict.innerText = "Execute Inference";
    }
}

function displayPredictionResults(result, inputTemp) {
    // 1. Classification
    document.getElementById('pred-class-value').innerText = result.weather_class;
    
    const probsContainer = document.getElementById('class-probs-container');
    probsContainer.innerHTML = '';
    
    const sortedProbs = Object.entries(result.class_probabilities)
        .sort((a, b) => b[1] - a[1]);

    sortedProbs.forEach(([cls, prob]) => {
        const percentage = (prob * 100).toFixed(0);
        probsContainer.innerHTML += `
            <div class="dist-row">
                <span class="dist-label">${cls}</span>
                <div class="dist-bar-bg">
                    <div class="dist-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="dist-pct">${percentage}%</span>
            </div>
        `;
    });

    // 2. Rain Probability
    document.getElementById('pred-rain-value').innerText = `${result.rain_probability.toFixed(0)}%`;

    // 3. Forecast
    document.getElementById('pred-temp-value').innerText = `${result.forecasted_temp.toFixed(1)}°C`;
    
    const diff = result.forecasted_temp - inputTemp;
    const trendText = document.getElementById('temp-trend-text');

    if (diff > 0.1) {
        trendText.innerText = `Δ +${diff.toFixed(1)}°C`;
        trendText.style.color = 'var(--accent-red)';
    } else if (diff < -0.1) {
        trendText.innerText = `Δ ${diff.toFixed(1)}°C`;
        trendText.style.color = 'var(--accent-blue)';
    } else {
        trendText.innerText = `Δ 0.0°C`;
        trendText.style.color = 'var(--text-tertiary)';
    }
}

