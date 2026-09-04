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

        const txns = getTransactions().slice().sort((a, b) => new Date(a.date) - new Date(b.date));

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

            if (minBalance < 0 && maxBalance > 0) {
                const zeroY = getY(0);
                ctx.beginPath();
                ctx.moveTo(paddingX, zeroY);
                ctx.lineTo(canvas.width - paddingX, zeroY);
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            const totalSegments = segments.length;
            const visibleSegments = progress * totalSegments;

            for (let i = 0; i < totalSegments; i++) {
                if (i >= Math.ceil(visibleSegments)) break;

                const seg = segments[i];
                ctx.beginPath();
                ctx.moveTo(seg.x1, seg.y1);

                let endX = seg.x2;
                let endY = seg.y2;

                if (i === Math.floor(visibleSegments) && visibleSegments < totalSegments) {
                    const fraction = visibleSegments - i;
                    endX = seg.x1 + (seg.x2 - seg.x1) * fraction;
                    endY = seg.y1 + (seg.y2 - seg.y1) * fraction;
                }

                ctx.lineTo(endX, endY);
                ctx.strokeStyle = seg.type === 'income' ? '#10b981' : '#ef4444';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
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
        if (!description || !dt || isNaN(amt) || amt <= 0) {
            alert('Please enter a valid description, date, and amount greater than 0.');
            return;
        }
        const tx = {
            id: Date.now().toString(),
            type,
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
