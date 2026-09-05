document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('transaction-form');
    const typeSelect = document.getElementById('transaction-type');
    const desc = document.getElementById('description');
    const amount = document.getElementById('amount');
    const date = document.getElementById('date');
    const transactionList = document.getElementById('transaction-list');
    const noTransactions = document.getElementById('no-transactions');
    const balanceEl = document.getElementById('balance');
    const incomeEl = document.getElementById('total-income');
    const expensesEl = document.getElementById('total-expenses');
    const remainingEl = document.getElementById('remaining-balance');
    const totalTxnsEl = document.getElementById('total-transactions');

    const categorySelect = document.getElementById('category');
    const budgetGrid = document.getElementById('budget-grid');
    const donutTotal = document.getElementById('donut-total');
    const donutCanvas = document.getElementById('expenses-donut');
    const donutCtx = donutCanvas ? donutCanvas.getContext('2d') : null;

    const canvas = document.getElementById('balance-chart');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let animationId = null;

    const getStartedBtn = document.getElementById('get-started-btn');
    const landingView = document.getElementById('landing-view');
    const dashboardView = document.getElementById('dashboard-view');

    let chartDateRange = '7d';
    const toggles = document.querySelectorAll('.chart-toggle');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            toggles.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            chartDateRange = e.target.dataset.range;
            drawChart(true);
        });
    });

    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            // Button click effect
            getStartedBtn.style.transform = 'scale(0.95)';

            // Trigger landing page exit animation
            landingView.classList.add('landing-exit');

            setTimeout(() => {
                landingView.style.display = 'none';

                // Prepare dashboard for staggered entrance
                dashboardView.style.display = 'block';
                dashboardView.classList.add('dashboard-ready');

                // Trigger staggered entrance after a tiny frame
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        dashboardView.classList.add('dashboard-enter');

                        // Wait for chart section to enter (delay 0.6s) before drawing chart
                        setTimeout(() => {
                            drawChart(true);
                            updateBudget();
                        }, 600);
                    });
                });
            }, 500); // Wait for landing exit
        });
    }

    function drawChart(animate = false) {
        if (!canvas || !ctx) return;

        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Filter by date range
        let allTxns = getTransactions().slice();
        let txns = [];
        if (chartDateRange === 'all') {
            txns = allTxns;
        } else {
            const now = new Date();
            let limitDate = new Date();
            if (chartDateRange === '7d') limitDate.setDate(now.getDate() - 7);
            else if (chartDateRange === '1m') limitDate.setMonth(now.getMonth() - 1);
            else if (chartDateRange === '3m') limitDate.setMonth(now.getMonth() - 3);
            else if (chartDateRange === '1y') limitDate.setFullYear(now.getFullYear() - 1);
            
            txns = allTxns.filter(t => new Date(t.date) >= limitDate);
        }

        let balances = [0];
        let current = 0;
        let minBalance = 0;
        let maxBalance = 0;

        const segments = [];

        txns.forEach(t => {
            if (t.type === 'income') {
                current += Number(t.amount);
            } else {
                current -= Number(t.amount);
            }
            balances.push(current);
            if (current < minBalance) minBalance = current;
            if (current > maxBalance) maxBalance = current;
        });

        let range = maxBalance - minBalance;
        if (range === 0) range = 100;

        const paddingLeft = 50;
        const paddingRight = 20;
        const paddingTop = 20;
        const paddingBottom = 30;
        const drawWidth = canvas.width - paddingLeft - paddingRight;
        const drawHeight = canvas.height - paddingTop - paddingBottom;

        const getX = (index) => paddingLeft + (txns.length === 0 ? drawWidth / 2 : (index / Math.max(1, txns.length)) * drawWidth);
        const getY = (val) => paddingTop + drawHeight - ((val - minBalance) / range) * drawHeight;

        for (let i = 0; i < txns.length; i++) {
            segments.push({
                x1: getX(i),
                y1: getY(balances[i]),
                x2: getX(i + 1),
                y2: getY(balances[i + 1]),
                type: txns[i].type
            });
        }

        let progress = animate ? 0 : 1;
        if (animationId) cancelAnimationFrame(animationId);

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Y-Axis gridlines and labels
            ctx.fillStyle = '#9ca3af';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            
            const steps = 4;
            for (let i = 0; i <= steps; i++) {
                const val = minBalance + (range * i) / steps;
                const y = getY(val);
                
                // gridline
                ctx.beginPath();
                ctx.moveTo(paddingLeft - 5, y);
                ctx.lineTo(canvas.width - paddingRight, y);
                ctx.strokeStyle = '#f3f4f6';
                ctx.lineWidth = 1;
                ctx.stroke();

                // label
                ctx.fillText('₹' + Math.round(val).toLocaleString(), paddingLeft - 10, y);
            }

            // Draw X-Axis labels (dates)
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            if (txns.length > 0) {
                // start date
                ctx.fillText(new Date(txns[0].date).toLocaleDateString(undefined, {month:'short', day:'numeric'}), getX(0), canvas.height - paddingBottom + 10);
                // end date
                if (txns.length > 1) {
                    ctx.fillText(new Date(txns[txns.length-1].date).toLocaleDateString(undefined, {month:'short', day:'numeric'}), getX(txns.length), canvas.height - paddingBottom + 10);
                }
            }

            // Draw zero line if balance crosses 0
            if (minBalance < 0 && maxBalance > 0) {
                const zeroY = getY(0);
                ctx.beginPath();
                ctx.moveTo(paddingLeft, zeroY);
                ctx.lineTo(canvas.width - paddingRight, zeroY);
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            if (segments.length > 0) {
                const totalSegments = segments.length;
                const visibleSegments = progress * totalSegments;

                // Create a hard-stop gradient for sharp, perfect color transitions
                const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
                const areaGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
                
                for (let i = 0; i < totalSegments; i++) {
                    const seg = segments[i];
                    const color = seg.type === 'income' ? '#10b981' : '#ef4444';
                    const areaColor = seg.type === 'income' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                    
                    let startRatio = seg.x1 / canvas.width;
                    let endRatio = seg.x2 / canvas.width;
                    
                    startRatio = Math.max(0, Math.min(1, startRatio));
                    endRatio = Math.max(0, Math.min(1, endRatio));
                    
                    grad.addColorStop(startRatio, color);
                    grad.addColorStop(endRatio, color);

                    areaGrad.addColorStop(startRatio, areaColor);
                    areaGrad.addColorStop(endRatio, areaColor);
                }

                // 1. Draw Area Fill
                ctx.beginPath();
                ctx.moveTo(segments[0].x1, canvas.height);
                ctx.lineTo(segments[0].x1, segments[0].y1);

                let lastX = segments[0].x1;
                let lastY = segments[0].y1;

                for (let i = 0; i < totalSegments; i++) {
                    if (i >= Math.ceil(visibleSegments)) break;
                    
                    const seg = segments[i];
                    let endX = seg.x2;
                    let endY = seg.y2;

                    if (i === Math.floor(visibleSegments) && visibleSegments < totalSegments) {
                        const fraction = visibleSegments - i;
                        endX = seg.x1 + (seg.x2 - seg.x1) * fraction;
                        endY = seg.y1 + (seg.y2 - seg.y1) * fraction;
                    }

                    ctx.lineTo(endX, endY);
                    lastX = endX;
                    lastY = endY;
                }

                ctx.lineTo(lastX, canvas.height);
                ctx.closePath();
                ctx.fillStyle = areaGrad;
                ctx.shadowColor = 'transparent';
                ctx.fill();

                // 2. Draw the main stroke with shadow
                ctx.beginPath();
                ctx.moveTo(segments[0].x1, segments[0].y1);
                
                for (let i = 0; i < totalSegments; i++) {
                    if (i >= Math.ceil(visibleSegments)) break;
                    
                    const seg = segments[i];
                    let endX = seg.x2;
                    let endY = seg.y2;

                    if (i === Math.floor(visibleSegments) && visibleSegments < totalSegments) {
                        const fraction = visibleSegments - i;
                        endX = seg.x1 + (seg.x2 - seg.x1) * fraction;
                        endY = seg.y1 + (seg.y2 - seg.y1) * fraction;
                    }

                    ctx.lineTo(endX, endY);
                }

                ctx.strokeStyle = grad;
                ctx.lineWidth = 3;
                ctx.lineJoin = 'round'; 
                ctx.lineCap = 'round';
                
                // Add glow effect
                ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
                ctx.shadowBlur = 12;
                ctx.shadowOffsetY = 4;
                ctx.stroke();

                // 3. Draw Data Points (nodes)
                ctx.shadowColor = 'transparent';
                
                const drawPoint = (x, y, type) => {
                    ctx.beginPath();
                    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = type === 'income' ? '#10b981' : '#ef4444';
                    ctx.lineWidth = 2;
                    ctx.fill();
                    ctx.stroke();
                };

                // Draw initial point
                if (visibleSegments > 0) {
                    drawPoint(segments[0].x1, segments[0].y1, 'income');
                }

                for (let i = 0; i < totalSegments; i++) {
                    if (i + 1 <= visibleSegments) {
                        drawPoint(segments[i].x2, segments[i].y2, segments[i].type);
                    }
                }
            }

            if (progress < 1) {
                progress += 0.015;
                if (progress > 1) progress = 1;
                animationId = requestAnimationFrame(render);
            }
        }

        // Setup tooltip interaction
        canvas.onmousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            
            // Find closest point
            let closest = null;
            let minDist = Infinity;
            
            const allPoints = [];
            if (segments.length > 0) {
                allPoints.push({ x: segments[0].x1, y: segments[0].y1, val: balances[0], date: txns.length > 0 ? txns[0].date : '' });
                for(let i=0; i<segments.length; i++) {
                    allPoints.push({ x: segments[i].x2, y: segments[i].y2, val: balances[i+1], date: txns[i].date });
                }
            }

            for (const pt of allPoints) {
                const dist = Math.abs(mouseX - pt.x);
                if (dist < minDist) {
                    minDist = dist;
                    closest = pt;
                }
            }

            const tooltip = document.getElementById('chart-tooltip');
            if (tooltip && closest && minDist < 30) {
                tooltip.style.opacity = '1';
                tooltip.style.left = closest.x + 'px';
                tooltip.style.top = closest.y + 'px';
                const dateStr = closest.date ? new Date(closest.date).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'Start';
                tooltip.innerHTML = `<div>${dateStr}</div><div style="font-weight:600; font-size:15px; margin-top:2px;">₹${closest.val.toLocaleString()}</div>`;
            } else if (tooltip) {
                tooltip.style.opacity = '0';
            }
        };

        canvas.onmouseleave = () => {
            const tooltip = document.getElementById('chart-tooltip');
            if (tooltip) tooltip.style.opacity = '0';
        };

        render();
    }

    window.addEventListener('resize', () => drawChart(false));



    function getTransactions() {
        return JSON.parse(localStorage.getItem('transactions') || '[]');
    }

    function saveTransactions(txns) {
        localStorage.setItem('transactions', JSON.stringify(txns));
    }

    function formatCurrency(value) {
        return '₹' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function updateSummary() {
        const txns = getTransactions();
        const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
        const expenses = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
        const balance = income - expenses;
        balanceEl.textContent = formatCurrency(balance);
        incomeEl.textContent = formatCurrency(income);
        expensesEl.textContent = formatCurrency(expenses);
        remainingEl.textContent = formatCurrency(balance);

        if (totalTxnsEl) {
            totalTxnsEl.textContent = txns.length;
        }

        const txnsChart = document.getElementById('mini-chart-txns');
        const incomeChart = document.getElementById('mini-chart-income');
        const expensesChart = document.getElementById('mini-chart-expenses');
        const balanceChart = document.getElementById('mini-chart-balance');

        if (txnsChart) txnsChart.style.background = `conic-gradient(#6b7280 100%, #eaeaea 0)`;
        
        if (incomeChart) incomeChart.style.background = `conic-gradient(#10b981 100%, #eaeaea 0)`;

        if (expensesChart) {
            let pct = income > 0 ? Math.min(100, Math.round((expenses / income) * 100)) : 0;
            expensesChart.style.background = `conic-gradient(#ef4444 ${pct}%, #eaeaea 0)`;
        }

        if (balanceChart) {
            let pct = income > 0 ? Math.max(0, Math.min(100, Math.round((balance / income) * 100))) : 0;
            balanceChart.style.background = `conic-gradient(#10b981 ${pct}%, #eaeaea 0)`;
        }
    }

    const budgetLimits = {
        'Food': 15000,
        'Rent': 20000,
        'Shopping': 10000,
        'Utilities': 5000,
        'Knowledge': 3000,
        'Transportation': 8000,
        'Entertainment': 6000,
        'Investing': 20000,
        'Other': 5000
    };

    const categoryIcons = {
        'Food': '🍔',
        'Rent': '🏠',
        'Shopping': '🛍️',
        'Utilities': '⚡',
        'Knowledge': '🎓',
        'Transportation': '🚗',
        'Entertainment': '🎬',
        'Investing': '📈',
        'Other': '🔹'
    };

    function updateBudget() {
        const txns = getTransactions();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const expensesThisMonth = txns.filter(t => {
            if (t.type !== 'expense') return false;
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const categoryTotals = {};
        let totalExpenses = 0;

        expensesThisMonth.forEach(t => {
            const cat = t.category || 'Other';
            if (!categoryTotals[cat]) categoryTotals[cat] = 0;
            categoryTotals[cat] += Number(t.amount);
            totalExpenses += Number(t.amount);
        });

        // Render budget cards
        if (budgetGrid) {
            budgetGrid.innerHTML = '';

            Object.keys(budgetLimits).forEach(cat => {
                const limit = budgetLimits[cat];
                const spent = categoryTotals[cat] || 0;
                let percentage = Math.min(100, Math.round((spent / limit) * 100));

                // Color logic
                let color = '#10b981'; // Green
                if (percentage >= 80) color = '#f59e0b'; // Yellow
                if (percentage >= 100) color = '#ef4444'; // Red

                const card = document.createElement('div');
                card.className = 'budget-card';
                card.innerHTML = `
                    <div class="budget-card-info">
                        <h3>${categoryIcons[cat] || '🔹'} ${cat === 'Rent' ? 'Mortgage / Rent' : cat}</h3>
                        <p>₹${spent.toLocaleString()} / ₹${limit.toLocaleString()} spent this month</p>
                    </div>
                    <div class="budget-card-progress" style="background: conic-gradient(${color} ${percentage}%, #eaeaea 0%);">
                        <span>${percentage}%</span>
                    </div>
                `;
                budgetGrid.appendChild(card);
            });
        }

        // Draw donut chart
        if (donutTotal) {
            donutTotal.textContent = '₹' + totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        drawDonutChart(categoryTotals, totalExpenses);
    }

    function drawDonutChart(categoryTotals, totalExpenses) {
        if (!donutCanvas || !donutCtx) return;

        const container = donutCanvas.parentElement;
        const rect = container.getBoundingClientRect();
        if (donutCanvas.width !== rect.width || donutCanvas.height !== rect.height) {
            donutCanvas.width = rect.width;
            donutCanvas.height = rect.height;
        }

        donutCtx.clearRect(0, 0, donutCanvas.width, donutCanvas.height);
        const centerX = donutCanvas.width / 2;
        const centerY = donutCanvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;

        if (totalExpenses === 0) {
            donutCtx.beginPath();
            donutCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            donutCtx.lineWidth = 20;
            donutCtx.strokeStyle = '#eaeaea';
            donutCtx.stroke();
            return;
        }

        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#64748b'];
        let startAngle = -0.5 * Math.PI;
        let colorIndex = 0;

        for (const cat in categoryTotals) {
            const amount = categoryTotals[cat];
            if (amount === 0) continue;

            const sliceAngle = (amount / totalExpenses) * 2 * Math.PI;

            donutCtx.beginPath();
            donutCtx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            donutCtx.lineWidth = 20;
            donutCtx.strokeStyle = colors[colorIndex % colors.length];
            donutCtx.stroke();

            startAngle += sliceAngle;
            colorIndex++;
        }
    }

    function renderTransactions(animate = false) {
        const txns = getTransactions();
        transactionList.querySelectorAll('.transaction').forEach(n => n.remove());
        if (!txns || txns.length === 0) {
            if (noTransactions) noTransactions.style.display = 'block';
            return;
        }
        if (noTransactions) noTransactions.style.display = 'none';
        txns.slice().reverse().forEach(t => {
            const el = document.createElement('div');
            el.className = 'transaction';

            const title = document.createElement('div');
            title.className = 'col-desc font-medium';
            title.textContent = t.description;

            const dt = document.createElement('div');
            dt.className = 'col-date text-gray';
            dt.textContent = new Date(t.date).toLocaleDateString();

            const amt = document.createElement('div');
            amt.className = 'col-amount font-medium';
            amt.textContent = (t.type === 'income' ? '+ ' : '- ') + formatCurrency(t.amount);
            amt.style.color = t.type === 'income' ? '#10b981' : '#ef4444';

            const delWrap = document.createElement('div');
            delWrap.className = 'col-action';
            const del = document.createElement('button');
            del.textContent = 'Delete';
            del.className = 'btn-delete';
            del.dataset.id = t.id;
            del.addEventListener('click', () => deleteTransaction(t.id));
            delWrap.appendChild(del);

            el.appendChild(title);
            el.appendChild(dt);
            el.appendChild(amt);
            el.appendChild(delWrap);

            transactionList.appendChild(el);
        });
        updateSummary();
        updateBudget();
        drawChart(animate);
    }

    function addTransaction(tx) {
        const txns = getTransactions();
        txns.push(tx);
        saveTransactions(txns);
        renderTransactions(true);
    }

    function deleteTransaction(id) {
        const txns = getTransactions().filter(t => t.id !== id);
        saveTransactions(txns);
        renderTransactions(false);
    }

    form.addEventListener('submit', e => {
        e.preventDefault();
        const type = typeSelect.value;
        const description = desc.value.trim();
        const amt = Number(amount.value);
        const dt = date.value;
        const cat = categorySelect ? categorySelect.value : 'Other';
        if (!description || !dt || isNaN(amt) || amt <= 0) {
            alert('Please enter a valid description, date, and amount greater than 0.');
            return;
        }
        const tx = {
            id: Date.now().toString(),
            type,
            category: cat,
            description,
            amount: amt,
            date: dt
        };
        addTransaction(tx);
        form.reset();
        date.value = new Date().toISOString().slice(0, 10);
    });

    if (!localStorage.getItem('transactions')) saveTransactions([]);
    renderTransactions(true);
});
