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

        // Use exact insertion order to match the list exactly
        const txns = getTransactions().slice();

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

        const paddingX = 10;
        const paddingY = 20;
        const drawWidth = canvas.width - paddingX * 2;
        const drawHeight = canvas.height - paddingY * 2;

        const getX = (index) => paddingX + (txns.length === 0 ? drawWidth / 2 : (index / Math.max(1, txns.length)) * drawWidth);
        const getY = (val) => paddingY + drawHeight - ((val - minBalance) / range) * drawHeight;

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

            // Draw zero line if balance crosses 0
            if (minBalance < 0 && maxBalance > 0) {
                const zeroY = getY(0);
                ctx.beginPath();
                ctx.moveTo(paddingX, zeroY);
                ctx.lineTo(canvas.width - paddingX, zeroY);
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            if (segments.length > 0) {
                const totalSegments = segments.length;
                const visibleSegments = progress * totalSegments;

                // Create a hard-stop gradient for sharp, perfect color transitions
                const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
                
                for (let i = 0; i < totalSegments; i++) {
                    const seg = segments[i];
                    const color = seg.type === 'income' ? '#10b981' : '#ef4444';
                    
                    let startRatio = seg.x1 / canvas.width;
                    let endRatio = seg.x2 / canvas.width;
                    
                    startRatio = Math.max(0, Math.min(1, startRatio));
                    endRatio = Math.max(0, Math.min(1, endRatio));
                    
                    grad.addColorStop(startRatio, color);
                    grad.addColorStop(endRatio, color);
                }

                ctx.beginPath();
                ctx.moveTo(segments[0].x1, segments[0].y1);

                for (let i = 0; i < totalSegments; i++) {
                    if (i >= Math.ceil(visibleSegments)) break;
                    
                    const seg = segments[i];
                    let endX = seg.x2;
                    let endY = seg.y2;

                    // Interpolate the final visible segment during animation
                    if (i === Math.floor(visibleSegments) && visibleSegments < totalSegments) {
                        const fraction = visibleSegments - i;
                        endX = seg.x1 + (seg.x2 - seg.x1) * fraction;
                        endY = seg.y1 + (seg.y2 - seg.y1) * fraction;
                    }

                    ctx.lineTo(endX, endY);
                }

                ctx.strokeStyle = grad;
                ctx.lineWidth = 3;
                ctx.lineJoin = 'miter'; 
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            if (progress < 1) {
                progress += 0.015;
                if (progress > 1) progress = 1;
                animationId = requestAnimationFrame(render);
            }
        }

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
