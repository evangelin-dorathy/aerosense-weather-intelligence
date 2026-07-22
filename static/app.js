// AeroSense Dashboard Logic & Chart.js Config

// Current State
let appData = null;
let charts = {};

// Initialize application on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Icons
    lucide.createIcons();

    // 2. Setup Current Date
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', options);

    // 3. Setup Navigation Event Listeners
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const viewId = btn.getAttribute('data-view');
            switchView(viewId);
        });
    });

    // 4. Fetch Historical Data Trends
    fetchTrendsData();

    // 5. Setup ML Prediction Form Handler
    const predForm = document.getElementById('prediction-form');
    if (predForm) {
        predForm.addEventListener('submit', handlePredictionSubmit);
    }

    // 6. Setup dynamic apparent temperature sync (just a minor UX polish)
    const tempInput = document.getElementById('temperature');
    const appTempInput = document.getElementById('apparent_temperature');
    if (tempInput && appTempInput) {
        tempInput.addEventListener('input', (e) => {
            // Predict apparent temperature roughly if not touched
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && appTempInput.value === (val - 0.5).toString()) {
                // Keep it synced if user hasn't deviated
            }
        });
    }
});

// View switching logic
function switchView(viewId) {
    // Update active nav button
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.getAttribute('data-view') === viewId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update main header title
    const viewTitle = document.getElementById('view-title');
    const viewSubtitle = document.getElementById('view-subtitle');

    if (viewId === 'dashboard') {
        viewTitle.innerText = "Dashboard Overview";
        viewSubtitle.innerText = "Real-time summaries and intelligence profiles.";
    } else if (viewId === 'trends') {
        viewTitle.innerText = "Trends & Analytics";
        viewSubtitle.innerText = "Historical multi-year trends and distribution analysis.";
        // Trigger chart resize to fix scaling issue in hidden tab
        setTimeout(() => {
            Object.values(charts).forEach(chart => chart.resize());
        }, 100);
    } else if (viewId === 'predictions') {
        viewTitle.innerText = "Predictive Analytics Engine";
        viewSubtitle.innerText = "Execute inference against serialized machine learning models.";
    }

    // Toggle views
    const viewPanels = document.querySelectorAll('.view-panel');
    viewPanels.forEach(panel => {
        if (panel.id === `view-${viewId}`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
}

// Fetch Pre-computed summary data
async function fetchTrendsData() {
    try {
        const response = await fetch('/api/trends');
        if (!response.ok) {
            throw new Error("Failed to fetch historical trends data");
        }
        appData = await response.json();
        
        // 1. Populate top summary grid cards
        populateSummaryCards(appData.general_stats);

        // 2. Initialize Charts
        initializeCharts(appData);

    } catch (err) {
        console.error("Error loading trends data:", err);
        // Fallback display or alert
    }
}

// Populate Top Cards
function populateSummaryCards(stats) {
    if (!stats) return;
    document.getElementById('stat-avg-temp').innerText = `${stats.avg_temp.toFixed(1)}°C`;
    document.getElementById('stat-max-temp').innerText = `${stats.max_temp.toFixed(1)}°C`;
    document.getElementById('stat-rain-ratio').innerText = `${(stats.rain_ratio * 100).toFixed(1)}%`;
    document.getElementById('stat-clear-ratio').innerText = `${(stats.clear_days_ratio * 100).toFixed(1)}%`;
}

// Chart.js global defaults for dark mode glassmorphism
Chart.defaults.color = '#94a3b8'; // text-secondary
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';

// Initialize all charts
function initializeCharts(data) {
    if (Object.keys(charts).length > 0) {
        // Destroy existing to prevent double rendering
        Object.values(charts).forEach(c => c.destroy());
        charts = {};
    }

    // Chart 1: Yearly Trend
    const yearlyCtx = document.getElementById('yearlyTempChart').getContext('2d');
    const yearlyGrad = yearlyCtx.createLinearGradient(0, 0, 0, 300);
    yearlyGrad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
    yearlyGrad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    charts.yearly = new Chart(yearlyCtx, {
        type: 'line',
        data: {
            labels: data.yearly_trend.years,
            datasets: [{
                label: 'Average Temperature (°C)',
                data: data.yearly_trend.temps,
                borderColor: '#6366f1',
                borderWidth: 3,
                pointBackgroundColor: '#a855f7',
                pointBorderColor: '#ffffff',
                pointHoverRadius: 6,
                tension: 0.4,
                fill: true,
                backgroundColor: yearlyGrad
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { callback: value => value + '°C' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });

    // Chart 2: Monthly Ranges (Min, Avg, Max)
    const monthlyCtx = document.getElementById('monthlyTempChart').getContext('2d');
    const months = data.monthly_stats.map(item => item.month);
    const minTemps = data.monthly_stats.map(item => item.min);
    const avgTemps = data.monthly_stats.map(item => item.avg);
    const maxTemps = data.monthly_stats.map(item => item.max);

    charts.monthly = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Min Temp',
                    data: minTemps,
                    backgroundColor: 'rgba(59, 130, 246, 0.65)',
                    borderRadius: 4
                },
                {
                    label: 'Avg Temp',
                    data: avgTemps,
                    backgroundColor: 'rgba(99, 102, 241, 0.85)',
                    borderRadius: 4
                },
                {
                    label: 'Max Temp',
                    data: maxTemps,
                    backgroundColor: 'rgba(249, 115, 22, 0.65)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12 } }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { callback: value => value + '°C' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });

    // Chart 3: Seasonal Radar Profile (Normalized metrics)
    const radarCtx = document.getElementById('seasonalRadarChart').getContext('2d');
    const seasons = Object.keys(data.seasonal_stats);
    
    // Scaling helper to keep radar visually comparable (0 - 100)
    // Temp: range [-5, 30] -> scaled
    // Humidity: range [0, 1] -> humidity * 100
    // Wind: range [0, 25] -> wind * 4
    // Rain: range [0, 0.4] -> rain * 250
    // Pressure: range [1010, 1020] -> (p - 1005) * 5
    
    const datasets = seasons.map((season, idx) => {
        const s = data.seasonal_stats[season];
        const colors = [
            { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.08)' }, // Winter - Blue
            { border: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' }, // Spring - Green
            { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' }, // Summer - Gold
            { border: '#a855f7', bg: 'rgba(168, 85, 247, 0.08)' }  // Autumn - Purple
        ];
        
        // Custom normalization
        const sTemp = ((s.temp + 5) / 35) * 100;
        const sHumid = s.humidity * 100;
        const sWind = (s.wind_speed / 25) * 100;
        const sRain = s.rain_prob * 100;
        const sPress = ((s.pressure - 1000) / 20) * 100;

        return {
            label: season,
            data: [
                Math.max(0, Math.min(100, sTemp)),
                Math.max(0, Math.min(100, sHumid)),
                Math.max(0, Math.min(100, sWind)),
                Math.max(0, Math.min(100, sRain)),
                Math.max(0, Math.min(100, sPress))
            ],
            borderColor: colors[idx].border,
            backgroundColor: colors[idx].bg,
            borderWidth: 2,
            pointBackgroundColor: colors[idx].border
        };
    });

    charts.radar = new Chart(radarCtx, {
        type: 'radar',
        data: {
            labels: ['Temperature', 'Humidity', 'Wind Speed', 'Rain Prob', 'Pressure'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 10 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const season = context.dataset.label;
                            const index = context.dataIndex;
                            const stats = data.seasonal_stats[season];
                            const labels = ['Temp', 'Humidity', 'Wind Speed', 'Rain Prob', 'Pressure'];
                            const units = ['°C', '%', ' km/h', '%', ' hPa'];
                            
                            let rawVal = 0;
                            if (index === 0) rawVal = stats.temp;
                            else if (index === 1) rawVal = (stats.humidity * 100).toFixed(0);
                            else if (index === 2) rawVal = stats.wind_speed;
                            else if (index === 3) rawVal = (stats.rain_prob * 100).toFixed(1);
                            else if (index === 4) rawVal = stats.pressure;

                            return `${season} ${labels[index]}: ${rawVal}${units[index]}`;
                        }
                    }
                }
            },
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.05)' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    pointLabels: { color: '#94a3b8', font: { size: 11 } },
                    ticks: { display: false },
                    min: 0,
                    max: 100
                }
            }
        }
    });

    // Chart 4: Monthly Rain Probability
    const rainCtx = document.getElementById('monthlyRainChart').getContext('2d');
    const rainProbs = data.monthly_rain_trend.rain_probs.map(val => val * 100);
    const rainGrad = rainCtx.createLinearGradient(0, 0, 0, 300);
    rainGrad.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
    rainGrad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

    charts.rainTrend = new Chart(rainCtx, {
        type: 'line',
        data: {
            labels: data.monthly_rain_trend.months,
            datasets: [{
                label: 'Rain Occurrence Probability (%)',
                data: rainProbs,
                borderColor: '#06b6d4',
                borderWidth: 3,
                pointBackgroundColor: '#06b6d4',
                tension: 0.35,
                fill: true,
                backgroundColor: rainGrad
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { callback: value => value + '%' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// Handle ML Live prediction form submission
async function handlePredictionSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const btnPredict = document.getElementById('btn-predict');
    const placeholder = document.getElementById('result-placeholder');
    const details = document.getElementById('result-details');
    
    // UI Loading State
    btnPredict.disabled = true;
    btnPredict.innerHTML = `<span>Computing A.I. Forecast...</span><i class="glow-animation" data-lucide="loader"></i>`;
    lucide.createIcons();
    
    // Compile inputs
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

        if (!response.ok) {
            throw new Error("Prediction API call failed");
        }

        const result = await response.json();
        
        // Hide placeholder and reveal details
        placeholder.classList.add('hidden');
        details.classList.remove('hidden');

        // Populate Results
        displayPredictionResults(result, payload.temperature);

    } catch (err) {
        console.error("ML Inference error:", err);
        alert("Failed to compute predictions. Please verify Flask server is running and models are trained.");
    } finally {
        // Reset submit button
        btnPredict.disabled = false;
        btnPredict.innerHTML = `<span>Generate Intelligence</span><i data-lucide="zap"></i>`;
        lucide.createIcons();
    }
}

// Display prediction outputs
function displayPredictionResults(result, inputTemp) {
    // 1. Weather Classification Card
    const classVal = document.getElementById('pred-class-value');
    const classIcon = document.getElementById('class-icon');
    classVal.innerText = result.weather_class;
    
    // Choose appropriate weather icon
    let iconName = 'cloud-sun';
    if (result.weather_class === 'Clear/Sunny') iconName = 'sun';
    else if (result.weather_class === 'Cloudy/Overcast') iconName = 'cloud';
    else if (result.weather_class === 'Rainy') iconName = 'cloud-rain';
    else if (result.weather_class === 'Foggy') iconName = 'cloud-fog';
    
    classIcon.setAttribute('data-lucide', iconName);
    lucide.createIcons();

    // Classification Probability bars
    const probsContainer = document.getElementById('class-probs-container');
    probsContainer.innerHTML = ''; // reset
    
    // Sort classes to show highest first
    const sortedProbs = Object.entries(result.class_probabilities)
        .sort((a, b) => b[1] - a[1]);

    sortedProbs.forEach(([cls, prob]) => {
        const percentage = (prob * 100).toFixed(0);
        const row = document.createElement('div');
        row.className = 'prob-bar-row';
        row.innerHTML = `
            <span class="prob-label">${cls}</span>
            <div class="prob-bar-container">
                <div class="prob-bar-fill" style="width: ${percentage}%"></div>
            </div>
            <span class="prob-pct">${percentage}%</span>
        `;
        probsContainer.appendChild(row);
    });

    // 2. Rain Probability circular gauge
    const rainVal = document.getElementById('pred-rain-value');
    const rainPct = result.rain_probability;
    rainVal.innerText = `${rainPct.toFixed(0)}%`;
    
    // Circular gauge animation using stroke-dashoffset
    // Perimeter = 263.89
    const circle = document.getElementById('gauge-fill-circle');
    const offset = 263.89 - (rainPct / 100) * 263.89;
    circle.style.strokeDashoffset = offset;

    // Define gauge color gradient based on rain risk
    if (rainPct > 60) {
        circle.style.stroke = 'var(--accent-blue)';
    } else if (rainPct > 20) {
        circle.style.stroke = 'var(--accent-purple)';
    } else {
        circle.style.stroke = 'var(--accent-indigo)';
    }

    // 3. Next-Day Temp Forecast Card
    const tempVal = document.getElementById('pred-temp-value');
    tempVal.innerText = `${result.forecasted_temp.toFixed(1)}°C`;
    
    const diff = result.forecasted_temp - inputTemp;
    const trendIcon = document.getElementById('temp-trend-icon');
    const trendText = document.getElementById('temp-trend-text');

    if (diff > 0.1) {
        trendIcon.setAttribute('data-lucide', 'trending-up');
        trendIcon.style.color = 'var(--accent-orange)';
        trendText.innerText = `+${diff.toFixed(1)}°C warmer than current`;
        trendText.style.color = 'var(--accent-orange)';
    } else if (diff < -0.1) {
        trendIcon.setAttribute('data-lucide', 'trending-down');
        trendIcon.style.color = 'var(--accent-blue)';
        trendText.innerText = `${diff.toFixed(1)}°C cooler than current`;
        trendText.style.color = 'var(--accent-blue)';
    } else {
        trendIcon.setAttribute('data-lucide', 'minus');
        trendIcon.style.color = 'var(--text-muted)';
        trendText.innerText = `Same as current temperature`;
        trendText.style.color = 'var(--text-muted)';
    }
    lucide.createIcons();
}
